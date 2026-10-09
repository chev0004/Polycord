UPDATE "notifications" SET "acknowledged_at" = "created_at" WHERE "kind" = 'warning' AND "warning_category" IS NULL AND "acknowledged_at" IS NULL;
