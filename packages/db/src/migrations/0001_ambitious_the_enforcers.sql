CREATE TYPE "public"."sync_status" AS ENUM('success', 'error');--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"new_problems" integer DEFAULT 0 NOT NULL,
	"skipped_problems" integer DEFAULT 0 NOT NULL,
	"status" "sync_status" NOT NULL,
	"error_message" text
);
