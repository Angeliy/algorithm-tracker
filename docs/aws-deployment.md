# AWS Deployment

Low-cost deployment shape:

- Frontend: Vite static files on S3, served through CloudFront.
- Backend: Hono on AWS Lambda using a Lambda Function URL.
- Database: use a low-cost managed PostgreSQL URL, preferably Neon or Supabase for coursework. Use RDS only if the assignment requires every piece to live in AWS.
- Daily 9:00 task: EventBridge Scheduler can trigger a small Lambda later to fetch the bug list and notify an AI agent.

## Required Secrets

Create a Postgres database first and export the connection string:

```bash
export DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
export BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
```

## Deploy

```bash
chmod +x scripts/deploy-aws.sh
RUN_DB_PUSH=true ./scripts/deploy-aws.sh
```

If your local network cannot connect to Neon on port `5432`, `RUN_DB_PUSH=true`
may fail. In that case, open Neon Console -> SQL Editor and run:

```sql
-- Copy the full contents of:
-- packages/db/src/migrations/0000_puzzling_sentinels.sql
```

The script prints:

- `API_URL`: backend Lambda URL
- `WEB_URL`: CloudFront frontend URL, or the S3 website URL if CloudFront is not available for the AWS account
- `WEB_BUCKET`: S3 bucket name
- `CLOUDFRONT_DISTRIBUTION_ID`: CloudFront distribution id

## Notes

- Keep the generated `BETTER_AUTH_SECRET`; changing it invalidates auth sessions.
- CloudFront can take several minutes to finish deploying.
- The S3 bucket is public-read because it only hosts static frontend assets.
- If you later add a custom domain, set the Lambda `CORS_ORIGIN` to that domain and rebuild the frontend with the same `API_URL`.
