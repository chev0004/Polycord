# Dummy profiles, DEV-014

Admins can fill a local or staging database with generated profiles for testing discovery filters, pagination, matching, availability and boosted ordering. The tool manages one dummy population and one target count from the **Dummy data** tab of `/admin`.

## Safety model

Every read and write through `/api/admin/seed` returns `404` unless all of the following hold, and the admin tab is hidden when they do not:

1. `POLYCORD_SEED_ENABLED=true`.
2. `POLYCORD_ENVIRONMENT` is exactly `local` or `staging`. Missing or other values are refused.
3. `POLYCORD_PUBLIC_URL` is unset. The [release checklist](release-checklist.md) sets it only on production, so a production deploy is refused even if the first two variables are set by mistake. Netlify's `CONTEXT` is not used because staging runs in Netlify's production context.
4. The caller is an owner or moderator.
5. The connected database has a row in `seed_database`. This is written by hand into approved test databases only, so a local or staging configuration pointed at any other database is refused by the database itself. Its label is shown in the tab.

Writes also require a same-origin request. `NODE_ENV` and the request URL are never used.

Dummies are marked by `users.is_synthetic`, which defaults to `false`, and cleanup deletes only marked users. Names, usernames, identifier formats and emails are never used to classify them. Each dummy also has a reserved `discord_user_id` of the form `seed-000001`, which a Discord OAuth snowflake cannot collide with and which cannot sign in, because sessions are only issued after a Discord OAuth callback.

## Enabling

1. Run migrations so `users.is_synthetic` and `seed_database` exist.
2. Approve the database, naming it as it should appear in the tab. Local and staging share one Supabase database (see [readiness](readiness.md)), so mark it shared:

   ```sql
   insert into seed_database (label, shared) values ('Staging/Test Database', true);
   ```

   An isolated local database uses its own label, for example `('Local Test Database', false)`.
3. Set `POLYCORD_SEED_ENABLED=true` and `POLYCORD_ENVIRONMENT=local` in `.env.local`, or `staging` in the Netlify staging environment, and restart or redeploy.

To disable, unset either variable or delete the `seed_database` row.

## Behaviour

- The target counts dummy profiles only. With 17 real accounts, a target of 10,000 leaves the 17 accounts and adds 10,000 dummies.
- Each request adds or removes at most 2,000 dummies; the tab repeats requests and shows progress until the count reaches the target. Repeating a target is safe: identifiers are deterministic and inserts skip existing ones.
- Reducing removes the newest dummies first (highest identifier). Profiles, target languages, saves, settings, notifications, reports, blocks and boosts cascade from `users`; `moderation_restrictions` has no foreign key, so the tool deletes restrictions for removed identifiers, and clears any stale ones before recreating an identifier.
- Generated data is deterministic for an identifier: uneven primary-language distribution, one to three target languages, mutual learning pairs, country and timezone combinations, fixed windows and any-time availability, tags, bios, bumps spread over the previous 30 days, about 5% private or moderation-hidden, and 1% boosted for seven days without any subscription or Stripe record. Avatars and voice intros are empty.
- Views, username copies, saves and boost impressions involving dummy profiles create no notifications or analytics events.

## Capacity

Measured 2026-09-27 on an isolated local PostgreSQL 17.10 database (Windows, AMD Ryzen 7 5700X), starting from 34 real accounts after `VACUUM FULL`. Discovery timings are the median of five server-side `listDiscoveryPage` calls, excluding network and rendering.

| Measurement | 0 dummies | 10,000 dummies | 50,000 dummies |
| --- | ---: | ---: | ---: |
| Database size | 8.0 MB | 30.1 MB | 95.0 MB |
| `users` (with indexes) | 0.1 MB | 5.5 MB | 19.0 MB |
| `profiles` (with indexes) | 0.2 MB | 11.8 MB | 43.1 MB |
| `profile_target_languages` | 0.1 MB | 5.1 MB | 25.3 MB |
| First page | | 14 ms | 37 ms |
| Page 500 | | 38 ms | 72 ms |
| Search `patient partner` | | 180 ms | 397 ms |
| Primary `ja` and country `JP` | | 8 ms | 13 ms |
| Target `ko` and level beginner | | 30 ms | 135 ms |
| Timezone `Asia/Tokyo` | | 7 ms | 17 ms |
| Available now | | 10 ms | 43 ms |
| Overlap sort | | 137 ms | 719 ms |

Adding took about 1.0 s per 2,000-profile request and removing about 0.35 s. Deleted rows are not returned to the operating system until PostgreSQL vacuums, so the database stays at its peak size after Remove all unless `VACUUM FULL` runs.

The hard cap is **50,000**, enforced by the API for presets and typed targets alike. The recommended routine range is **5,000 to 20,000**: at 50,000 the overlap sort approaches a second and search roughly doubles, which is useful for stress checks but slow for everyday testing. The shared Supabase database's plan limit and remote query latency were not measured; check its current size in the Supabase dashboard before seeding above the routine range, and lower `SEED_CAP` in `src/lib/seed/limits.ts` if the plan requires it.
