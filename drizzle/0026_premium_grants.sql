ALTER TYPE "public"."moderation_action" ADD VALUE 'premium_grant';--> statement-breakpoint
ALTER TYPE "public"."moderation_action" ADD VALUE 'premium_revoke';--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "premium_granted_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "premium_granted_by" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_premium_granted_by_users_id_fk" FOREIGN KEY ("premium_granted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;