#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-algorithm-tracker}"
AWS_REGION="${AWS_REGION:-us-east-1}"
LAMBDA_NAME="${LAMBDA_NAME:-${APP_NAME}-api}"
ROLE_NAME="${ROLE_NAME:-${APP_NAME}-lambda-role}"
WEB_BUCKET="${WEB_BUCKET:-${APP_NAME}-web-$(aws sts get-caller-identity --query Account --output text)}"
RUN_DB_PUSH="${RUN_DB_PUSH:-false}"

if [ -z "${DATABASE_URL:-}" ]; then
	echo "DATABASE_URL is required."
	echo "Use a cheap Postgres URL from Neon/Supabase, or an AWS RDS URL if your course requires all-AWS."
	exit 1
fi

if [ -z "${BETTER_AUTH_SECRET:-}" ]; then
	echo "BETTER_AUTH_SECRET is required and must be at least 32 characters."
	echo "Generate one with: openssl rand -base64 32"
	exit 1
fi

if [ "${#BETTER_AUTH_SECRET}" -lt 32 ]; then
	echo "BETTER_AUTH_SECRET must be at least 32 characters."
	exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$ROOT_DIR/.deploy"
SERVER_ZIP="$BUILD_DIR/server.zip"
ASSUME_ROLE_POLICY="$BUILD_DIR/lambda-assume-role.json"
WEB_POLICY="$BUILD_DIR/web-bucket-policy.json"
CF_CONFIG="$BUILD_DIR/cloudfront-distribution.json"

mkdir -p "$BUILD_DIR"

echo "Building Lambda bundle..."
pnpm -F server build
rm -f "$SERVER_ZIP"
(
	cd "$ROOT_DIR/apps/server/dist"
	zip -qr "$SERVER_ZIP" .
)

cat > "$ASSUME_ROLE_POLICY" <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
JSON

ROLE_ARN="$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text 2>/dev/null || true)"
if [ -z "$ROLE_ARN" ]; then
	echo "Creating Lambda role $ROLE_NAME..."
	ROLE_ARN="$(aws iam create-role \
		--role-name "$ROLE_NAME" \
		--assume-role-policy-document "file://$ASSUME_ROLE_POLICY" \
		--query 'Role.Arn' \
		--output text)"
	aws iam attach-role-policy \
		--role-name "$ROLE_NAME" \
		--policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
	echo "Waiting for IAM role propagation..."
	sleep 12
fi

FUNCTION_ARN="$(aws lambda get-function \
	--function-name "$LAMBDA_NAME" \
	--region "$AWS_REGION" \
	--query 'Configuration.FunctionArn' \
	--output text 2>/dev/null || true)"

if [ -z "$FUNCTION_ARN" ]; then
	echo "Creating Lambda function $LAMBDA_NAME..."
	FUNCTION_ARN="$(aws lambda create-function \
		--function-name "$LAMBDA_NAME" \
		--runtime nodejs22.x \
		--role "$ROLE_ARN" \
		--handler lambda.handler \
		--zip-file "fileb://$SERVER_ZIP" \
		--timeout 20 \
		--memory-size 512 \
		--architectures arm64 \
		--region "$AWS_REGION" \
		--environment "Variables={NODE_ENV=production,DATABASE_URL=$DATABASE_URL,BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET,BETTER_AUTH_URL=https://example.com,CORS_ORIGIN=https://example.com}" \
		--query 'FunctionArn' \
		--output text)"
else
	echo "Updating Lambda code for $LAMBDA_NAME..."
	aws lambda update-function-code \
		--function-name "$LAMBDA_NAME" \
		--zip-file "fileb://$SERVER_ZIP" \
		--region "$AWS_REGION" \
		--output text >/dev/null
	aws lambda wait function-updated \
		--function-name "$LAMBDA_NAME" \
		--region "$AWS_REGION"
fi

API_URL="$(aws lambda get-function-url-config \
	--function-name "$LAMBDA_NAME" \
	--region "$AWS_REGION" \
	--query 'FunctionUrl' \
	--output text 2>/dev/null || true)"

if [ -z "$API_URL" ]; then
	echo "Creating Lambda Function URL..."
	API_URL="$(aws lambda create-function-url-config \
		--function-name "$LAMBDA_NAME" \
		--auth-type NONE \
		--region "$AWS_REGION" \
		--query 'FunctionUrl' \
		--output text)"
	aws lambda add-permission \
		--function-name "$LAMBDA_NAME" \
		--statement-id FunctionUrlAllowPublicAccess \
		--action lambda:InvokeFunctionUrl \
		--principal "*" \
		--function-url-auth-type NONE \
		--region "$AWS_REGION" \
		--output text >/dev/null
fi

aws lambda add-permission \
	--function-name "$LAMBDA_NAME" \
	--statement-id FunctionUrlAllowPublicFunctionInvoke \
	--action lambda:InvokeFunction \
	--principal "*" \
	--invoked-via-function-url \
	--region "$AWS_REGION" \
	--output text >/dev/null 2>&1 || true
API_URL="${API_URL%/}"

echo "Ensuring S3 bucket $WEB_BUCKET..."
if ! aws s3api head-bucket --bucket "$WEB_BUCKET" 2>/dev/null; then
	if [ "$AWS_REGION" = "us-east-1" ]; then
		aws s3api create-bucket --bucket "$WEB_BUCKET" --region "$AWS_REGION" >/dev/null
	else
		aws s3api create-bucket \
			--bucket "$WEB_BUCKET" \
			--region "$AWS_REGION" \
			--create-bucket-configuration "LocationConstraint=$AWS_REGION" >/dev/null
	fi
fi

aws s3api put-bucket-website \
	--bucket "$WEB_BUCKET" \
	--website-configuration '{"IndexDocument":{"Suffix":"index.html"},"ErrorDocument":{"Key":"index.html"}}' >/dev/null

aws s3api put-public-access-block \
	--bucket "$WEB_BUCKET" \
	--public-access-block-configuration BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false >/dev/null

cat > "$WEB_POLICY" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadForStaticWebsite",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$WEB_BUCKET/*"
    }
  ]
}
JSON

aws s3api put-bucket-policy --bucket "$WEB_BUCKET" --policy "file://$WEB_POLICY" >/dev/null

WEBSITE_ENDPOINT="${WEB_BUCKET}.s3-website-${AWS_REGION}.amazonaws.com"
WEB_URL="http://$WEBSITE_ENDPOINT"
DISTRIBUTION_ID=""
EXISTING_DISTRIBUTION_ID="$(aws cloudfront list-distributions \
	--query "DistributionList.Items[?Origins.Items[?DomainName=='$WEBSITE_ENDPOINT']].Id | [0]" \
	--output text)"

if [ "$EXISTING_DISTRIBUTION_ID" = "None" ]; then
	EXISTING_DISTRIBUTION_ID=""
fi

if [ -z "$EXISTING_DISTRIBUTION_ID" ]; then
	echo "Creating CloudFront distribution..."
	CALLER_REFERENCE="${APP_NAME}-$(date +%s)"
	cat > "$CF_CONFIG" <<JSON
{
  "CallerReference": "$CALLER_REFERENCE",
  "Comment": "$APP_NAME static web",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "s3-website-origin",
        "DomainName": "$WEBSITE_ENDPOINT",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only",
          "OriginSslProtocols": {
            "Quantity": 1,
            "Items": ["TLSv1.2"]
          }
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-website-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "Compress": true,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 3600,
    "MaxTTL": 86400
  },
  "CustomErrorResponses": {
    "Quantity": 2,
    "Items": [
      {
        "ErrorCode": 403,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 0
      },
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 0
      }
    ]
  }
}
JSON
	if CF_OUTPUT="$(aws cloudfront create-distribution --distribution-config "file://$CF_CONFIG" 2>/dev/null)"; then
		DISTRIBUTION_ID="$(printf '%s' "$CF_OUTPUT" | sed -n 's/.*"Id": "\([^"]*\)".*/\1/p' | head -1)"
		WEB_URL="https://$(printf '%s' "$CF_OUTPUT" | sed -n 's/.*"DomainName": "\([^"]*\)".*/\1/p' | head -1)"
	else
		echo "CloudFront distribution was not created. Falling back to S3 website hosting."
	fi
else
	DISTRIBUTION_ID="$EXISTING_DISTRIBUTION_ID"
	WEB_URL="https://$(aws cloudfront get-distribution \
		--id "$DISTRIBUTION_ID" \
		--query 'Distribution.DomainName' \
		--output text)"
fi

echo "Updating Lambda environment..."
aws lambda update-function-configuration \
	--function-name "$LAMBDA_NAME" \
	--region "$AWS_REGION" \
	--environment "Variables={NODE_ENV=production,DATABASE_URL=$DATABASE_URL,BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET,BETTER_AUTH_URL=$API_URL,CORS_ORIGIN=$WEB_URL}" \
	--output text >/dev/null
aws lambda wait function-updated \
	--function-name "$LAMBDA_NAME" \
	--region "$AWS_REGION"

if [ "$RUN_DB_PUSH" = "true" ]; then
	echo "Pushing database schema..."
	DATABASE_URL="$DATABASE_URL" pnpm db:push
fi

echo "Building web with VITE_SERVER_URL=$API_URL..."
VITE_SERVER_URL="$API_URL" pnpm -F web build
aws s3 sync "$ROOT_DIR/apps/web/dist" "s3://$WEB_BUCKET" --delete >/dev/null

if [ -n "$DISTRIBUTION_ID" ]; then
	echo "Creating CloudFront invalidation..."
	aws cloudfront create-invalidation \
		--distribution-id "$DISTRIBUTION_ID" \
		--paths "/*" \
		--output text >/dev/null
fi

echo
echo "Deployment complete."
echo "API_URL=$API_URL"
echo "WEB_URL=$WEB_URL"
echo "WEB_BUCKET=$WEB_BUCKET"
echo "CLOUDFRONT_DISTRIBUTION_ID=$DISTRIBUTION_ID"
