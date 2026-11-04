# Database security

This document describes how Polycord's Postgres database is exposed, which roles can reach which data, how the row level security (RLS) gap found in SAFETY-011 was closed, and how to verify the live database.

## Connection model

| Item | Value |
| --- | --- |
| Engine | Supabase Postgres, reached through the Supavisor session pooler on port 5432 |
| Application role | `postgres` (the project owner role). It owns every table in `public` |
| Driver | `pg` through Drizzle ORM (`src/db/client.ts`), plus a short-lived `pg` client for the ban lookup (`src/lib/banLookup.ts`) |
| TLS | `rejectUnauthorized: true` with the pinned Supabase CA in `src/db/supabaseCa.json` |
| Migrations | `drizzle-kit migrate` with the same `DATABASE_URL`; the Netlify build refuses to deploy while migrations are pending (`scripts/check-migrations.ts`) |
| Supabase client libraries | Not used. The app never calls PostgREST, GraphQL, Realtime or Storage |

Because the application connects as the table owner, and no table uses `FORCE ROW LEVEL SECURITY`, RLS never applies to the application's own queries. Authorization for application traffic is enforced in route handlers (see `SECURITY_REPORT.md`). RLS exists to stop every other path into the database.

## The Supabase API surface

Every Supabase project exposes the `public` schema through its Data API:

- `https://<project>.supabase.co/rest/v1/` (PostgREST)
- `https://<project>.supabase.co/graphql/v1` (pg_graphql)
- `https://<project>.supabase.co/storage/v1/`

During this review all three endpoints answered on the Polycord project (401 or 400 without an API key). Requests that carry the project's anon (publishable) key run as the `anon` role; requests with a user JWT run as `authenticated`. Supabase's default privileges grant `ALL` on every new table in `public` to both roles. The anon key is designed to be public, so table privileges and RLS are the only barrier.

## Finding: RLS was disabled on 19 of 22 tables

Before migration `0039_enable_row_level_security`, only `users`, `profiles` and `profile_target_languages` had RLS enabled (hand-written in migrations 0000 and 0002). The other 19 tables accepted any statement from `anon` and `authenticated` under Supabase's default grants.

Reproduced on a disposable local database that applied all 39 existing migrations after recreating Supabase's `anon` and `authenticated` roles and default privileges:

```text
 rls_on | rls_off
--------+---------
      3 |      19

set role authenticated;
insert into staff_roles (user_id) values ('05225b46-...') returning user_id, role;
               user_id                |   role
--------------------------------------+-----------
 05225b46-f8cf-4370-8787-0e7900c815e6 | moderator
```

`hasStaffRole()` only checks for a row in `staff_roles`, so that insert is a complete promotion to moderator. The same access allowed:

| Table | What an anon key holder could do |
| --- | --- |
| `staff_roles` | Grant or revoke moderator for any account |
| `moderation_restrictions` | Clear Discord-keyed bans and suspensions, or ban anyone |
| `ip_bans` | Delete or add IP bans |
| `reports`, `moderation_actions` | Read reporter identities and staff notes; dismiss or forge reports; erase the audit trail |
| `ip_observations`, `suspicious_activity` | Read the IP addresses linked to each Discord identity |
| `push_subscriptions` | Read push endpoints and keys, or attach their own endpoint to any account |
| `subscriptions` | Mark any account as a paying Supporter |
| `notifications` | Read any inbox, or send forged moderation warnings |
| `voice_intros` | Read or replace any voice recording, including private ones |
| `user_settings`, `user_blocks`, `saved_profiles`, `profile_boosts`, `profile_interactions`, `analytics_events`, `rate_limit_counters`, `seed_database` | Read or rewrite each account's private state; reset rate limits |

`users` and `profiles` already had RLS with no policies, so their rows were not readable through the API, but the attacker only needs their own account ID, which the account export returns.

The live project could not be inspected from the review environment (outbound Postgres traffic is blocked there; only HTTPS is allowed), so whether the anon key was ever shared, and whether any row was written through the Data API, is **unverified**. See "Verifying the live database" below.

## Fix

1. Every table in `src/db/schema.ts` now declares `.enableRLS()`, so the Drizzle snapshot records RLS and `drizzle-kit generate` keeps it for future tables.
2. Migration `drizzle/0039_enable_row_level_security.sql` enables RLS on all 22 tables. No policies are created, so `anon` and `authenticated` see zero rows and every write fails with `42501`.
3. The same migration revokes table and sequence privileges from `anon` and `authenticated`, and removes them from the `postgres` default privileges, so new tables are not granted to the API roles. This block runs only where those roles exist, so it is a no-op on plain Postgres in CI and local development.
4. `service_role` is untouched. It is a server-side key with `BYPASSRLS` and the app does not use it.

After the migration, the same reproduction returns:

```text
 rls_on | rls_off
--------+---------
     22 |       0

ERROR:  permission denied for table staff_roles
ERROR:  permission denied for table moderation_restrictions
```

The application is unaffected: it connects as the owner, and the full unit, integration and browser suites pass with RLS enabled on every table.

## Policies

There are intentionally no RLS policies. The app never queries as `anon` or `authenticated`, so deny-all is the correct posture. If Supabase client libraries are ever introduced, add explicit per-table policies at that time and extend `tests/integration/security-database.mjs` to cover them.

## Functions and RPC

| Function | Security | Purpose | Exposure |
| --- | --- | --- | --- |
| `set_updated_at()` | `SECURITY INVOKER` | Trigger that stamps `updated_at` | Executable by `PUBLIC` (Postgres default). Calling it directly as RPC fails because it is a trigger function |
| `discovery_profile_text(...)` | `SECURITY INVOKER`, `IMMUTABLE` | Builds the trigram search text used by `profiles_search_idx` | Executable by `PUBLIC`. Pure function of its arguments, reads no tables |

Neither function is `SECURITY DEFINER`, so neither can be used to bypass RLS or table privileges. The `pg_trgm` extension is the only extension added by migrations.

## Storage

The app does not use Supabase Storage. Voice introductions are stored as base64 text in `voice_intros.data` and served only through `/api/voice/*` after visibility, block and Supporter checks. Whether the live project has any Storage buckets was not verified; the verification queries below include one.

## Privilege changes

| Change | Only path in application code | Guard |
| --- | --- | --- |
| Grant moderator | `POST /api/admin/staff` → `grantModerator()` | `authorizeOwner`: owner Discord ID from `POLYCORD_ADMIN_USER_IDS`, same-origin request, session issued within 12 hours |
| Revoke moderator | `DELETE /api/admin/staff` → `revokeModerator()` | Same as above; owners cannot be revoked |
| Owner | Not stored in the database | Environment variable only |
| Ban, unban | `POST /api/admin/moderation` | Owner only, 12 hour reauth, staff targets protected |
| Supporter grant | `POST`/`DELETE /api/admin/premium` | `authorizeOwner` |
| IP ban | `POST`/`DELETE /api/admin/ip-bans` | `authorizeOwner` |

`staff_roles.user_id` references `users.id` with `ON DELETE CASCADE`, so deleting and recreating an account never carries a moderator role across.

## Verifying the live database

Run these read-only queries in the Supabase SQL editor after applying migration 0039:

```sql
select c.relname, c.relrowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

select table_name, grantee, string_agg(privilege_type, ', ')
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated')
group by 1, 2;

select pg_get_userbyid(defaclrole), defaclobjtype, defaclacl
from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace
where n.nspname = 'public';

select p.proname, p.prosecdef
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public';

select id, public from storage.buckets;

select user_id, granted_by, granted_at from staff_roles order by granted_at;
```

Expected: the first two queries return no rows, the default ACL no longer lists `anon` or `authenticated`, no function has `prosecdef = true`, and every `staff_roles` row has a `granted_by` owner and a matching `grant` entry in `moderation_actions`. A moderator row without a matching `grant` log entry would indicate a write through the Data API before the fix.

## Regression test

`tests/integration/security-database.mjs` (run by `bun run test:security` or `bun test` when `TEST_DATABASE_URL` points at a disposable localhost database):

1. Asserts every table in `public` has RLS enabled.
2. Inside a transaction that is always rolled back, creates `anon` and `authenticated` if missing and grants them `ALL` on every table, the worst case Supabase default.
3. As each role, asserts every table reads as empty, inserting into `staff_roles` or `users` fails with `42501`, and clearing a ban updates or deletes zero rows.
4. Asserts the probe account still has no moderator role and remains banned.

Because it grants privileges explicitly before checking, the test proves RLS alone holds even if the revocation step is undone or Supabase re-grants privileges.

## Testing notes

- Local Postgres 16 cannot apply all migrations in one `drizzle-kit migrate` transaction: migration 0034 uses the `warning` enum value that migration 0018 adds in the same transaction. CI runs Postgres 17, where the existing workflow applies them; Postgres 17 was not available in the review environment. For this review the migrations were applied one per transaction with Drizzle's own migrator, which records the same journal rows.
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` is a metadata change but takes an `ACCESS EXCLUSIVE` lock on each table for a moment. Apply it at a quiet time.
