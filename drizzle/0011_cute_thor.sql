CREATE TABLE "rate_limit_counters" (
	"scope" varchar(32) NOT NULL,
	"subject" varchar(128) NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "rate_limit_counters_scope_subject_pk" PRIMARY KEY("scope","subject")
);
--> statement-breakpoint
CREATE TABLE "suspicious_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" varchar(32) NOT NULL,
	"user_id" uuid,
	"ip" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "suspicious_activity" ADD CONSTRAINT "suspicious_activity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "suspicious_activity_created_at_idx" ON "suspicious_activity" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "suspicious_activity_user_id_idx" ON "suspicious_activity" USING btree ("user_id");