CREATE TYPE "public"."staff_role" AS ENUM('moderator');--> statement-breakpoint
ALTER TYPE "public"."moderation_action" ADD VALUE 'grant';--> statement-breakpoint
ALTER TYPE "public"."moderation_action" ADD VALUE 'revoke';--> statement-breakpoint
CREATE TABLE "staff_roles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"role" "staff_role" DEFAULT 'moderator' NOT NULL,
	"granted_by" uuid,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "staff_roles" ADD CONSTRAINT "staff_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_roles" ADD CONSTRAINT "staff_roles_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;