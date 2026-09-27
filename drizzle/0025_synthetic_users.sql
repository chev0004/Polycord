CREATE TABLE "seed_database" (
	"label" text PRIMARY KEY NOT NULL,
	"shared" boolean DEFAULT false NOT NULL,
	"approved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_synthetic" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "users_is_synthetic_idx" ON "users" USING btree ("is_synthetic");