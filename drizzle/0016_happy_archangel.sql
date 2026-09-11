CREATE TABLE "voice_intros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mime_type" varchar(64) NOT NULL,
	"duration_seconds" integer NOT NULL,
	"size_bytes" integer NOT NULL,
	"data" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voice_intros_duration_check" CHECK ("voice_intros"."duration_seconds" between 1 and 20)
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "voice_intro_seconds" integer;--> statement-breakpoint
ALTER TABLE "voice_intros" ADD CONSTRAINT "voice_intros_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "voice_intros_user_id_idx" ON "voice_intros" USING btree ("user_id");