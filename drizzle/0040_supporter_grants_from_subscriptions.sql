UPDATE "users"
SET "premium_granted_until" = "subscriptions"."current_period_end", "updated_at" = now()
FROM "subscriptions"
WHERE "subscriptions"."user_id" = "users"."id"
  AND "subscriptions"."status" IN ('active', 'trialing')
  AND "subscriptions"."current_period_end" > now()
  AND ("users"."premium_granted_until" IS NULL OR "users"."premium_granted_until" < "subscriptions"."current_period_end");
