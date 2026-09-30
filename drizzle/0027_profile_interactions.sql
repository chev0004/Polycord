CREATE TYPE "public"."profile_interaction_kind" AS ENUM('view', 'copy');--> statement-breakpoint
CREATE TABLE "profile_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"kind" "profile_interaction_kind" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile_interactions" ADD CONSTRAINT "profile_interactions_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_interactions_owner_kind_created_at_idx" ON "profile_interactions" USING btree ("owner_user_id","kind","created_at");--> statement-breakpoint
INSERT INTO "profile_interactions" ("owner_user_id", "kind", "created_at")
SELECT "users"."id", CASE WHEN "analytics_events"."name" = 'profile.view' THEN 'view'::"profile_interaction_kind" ELSE 'copy'::"profile_interaction_kind" END, "analytics_events"."created_at"
FROM "analytics_events"
INNER JOIN "users" ON "users"."id"::text = "analytics_events"."metadata" ->> 'ownerUserId'
WHERE "analytics_events"."name" IN ('profile.view', 'profile.copy_received')
AND "analytics_events"."created_at" >= now() - interval '30 days'
AND "analytics_events"."user_id" IS DISTINCT FROM "users"."id";
