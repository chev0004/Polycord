# Operational Readiness

Inventory of the controls Polycord needs before a public launch. Each row names an owner, where the control lives, and the evidence behind its status. Rows marked Unverified were not checked against the external service; they are not claims that the control is absent.

Status values:

- **Verified**: demonstrated, with the evidence listed.
- **Unverified**: may exist in an external service, but has not been checked.
- **Blocking**: must be resolved before a public release. The row names the dependency.

## Inventory

| Control | Owner | Location | Status | Evidence or dependency |
| --- | --- | --- | --- | --- |
| Staging and local data boundary | Chev | README Staging section, Netlify env vars | Blocking | Staging and local development share one Supabase database, so this setup cannot hold production data. Production needs its own database, and neither local nor staging may point at it. |
| Test and audit fixture isolation | Chev | `playwright.config.ts`, `tests/integration/*.mjs`, `.github/workflows/tests.yml` | Verified | Browser tests throw unless `TEST_DATABASE_URL` is on localhost. Integration scripts assert a localhost host before connecting. `bun test` runs with `NODE_ENV=test` and does not load `.env.local` (probed 2026-09-23: `DATABASE_URL` unset). CI uses a service Postgres container. |
| Local tools against shared data | Chev | `package.json` `db:*` scripts, `bun run dev` | Blocking | `bun run dev`, `db:migrate` and `db:studio` use `.env.local`, which points at the shared database. This is safe only while no production data exists. |
| Health check | Chev | `GET /api/health` | Verified | Returns `200 {"status":"ok"}` after a database round trip and `503 {"status":"unavailable"}` when the database is unreachable. Verified on a production build against disposable Postgres, including recovery after the database restarts. |
| Uptime monitoring | Chev | [Post-deploy checks](monitoring.md#post-deploy-checks) and [external monitoring](monitoring.md#uptime-monitoring-and-pre-launch-test-alert) | Pending | Enable monitoring on the homepage and `/api/health` before announcing launch, once the owner approves the account. |
| Error and performance monitoring | Chev | Netlify function logs; no app-level reporter | Unverified | Netlify records function logs for server routes. Log retention, and whether anyone reviews them, has not been checked. The repository has no error reporting service. |
| Alert recipients and test alert | Chev | Owner email | Pending | Record a test alert reaching the owner before announcing launch, after getting approval to send it. |
| Database backups | Chev | [Backups](monitoring.md#backups) | Pending | Supabase Free takes no automatic backups, so production relies on manual logical backups before each migration and weekly. The procedure below is verified against disposable data. |
| Restore procedure | Chev | [Restore](#restore) | Verified | Drilled 2026-09-23 on disposable PostgreSQL 17.10: a backup taken at migration 0018 was restored into a new database and in place, and the fixture rows survived both. |
| Migration and rollback | Chev | [Migrations](#migrations), [Rollback](#rollback) | Verified | Same drill: 0019 was applied, rolled back to the 0018 backup, then rolled forward again. The migration journal count matched each step (19, 20, 19, 20). |
| Application deploy rollback | Chev | [Rollback rehearsal](monitoring.md#application-rollback) | Unverified | Record both deploy IDs and the health checks for the rollback and the return to the original build. |
| Secrets | Chev | Netlify environment variables | Unverified | README requires runtime secrets in Netlify, never Git, with separate staging `AUTH_SECRET` and VAPID keys. The values themselves have not been audited. |
| Incident ownership | Chev | [Incidents](#incidents) | Verified | Single maintainer. No rotation or backup responder exists. |
| Support, privacy, safety and appeal contact | Chev | `NEXT_PUBLIC_DISCORD_INVITE_URL`, `src/features/Legal/legalContent.ts`, `src/features/Banned/BannedScreen.tsx` | Blocking | Contact goes through the moderators in the Polycord Discord server. The invite URL must be set on every deploy, and moderator intake still needs an owner. |

## Backup

Take a logical backup of the application schemas before every production migration and on a schedule. Use the direct database connection string. Transaction-mode poolers do not support `pg_dump`. The `pg_dump` version must be the same as or newer than the server's.

```bash
pg_dump "$DATABASE_URL" -Fc --no-owner --no-privileges \
  --schema=public --schema=drizzle -f polycord-$(date +%Y%m%d%H%M).dump
```

The `drizzle` schema holds `__drizzle_migrations`. Restoring both schemas together keeps the migration journal consistent with the tables.

## Restore

Restore into a new, empty database first, and inspect it there before switching traffic.

```bash
psql "$RESTORE_URL" -c "drop schema public cascade"
pg_restore -d "$RESTORE_URL" --no-owner --no-privileges --exit-on-error --section=pre-data backup.dump
psql "$RESTORE_URL" -c "create extension pg_trgm schema public"
pg_restore -d "$RESTORE_URL" --no-owner --no-privileges --exit-on-error --section=data backup.dump
pg_restore -d "$RESTORE_URL" --no-owner --no-privileges --exit-on-error --section=post-data backup.dump
```

A new database already has an empty `public` schema. Dropping it first stops `pg_restore` failing on `schema "public" already exists`. A schema-scoped `pg_dump` leaves out extensions, so `pg_trgm`, which the search indexes use, is created after the tables and before the indexes.

## Migrations

The hosting build does not run migrations. It runs `scripts/check-migrations.ts` first and fails when the database is missing a migration from `drizzle/`, so the previous deploy keeps serving. Order migrations against the deploy:

1. Generate with `bun run db:generate` and review the SQL in `drizzle/`.
2. Run `bun run test:e2e` and the integration tests against a disposable database.
3. Take a [backup](#backup).
4. Apply additive migrations with `bun run db:migrate` before merging the code that uses them. Apply destructive migrations only after the deployed code no longer reads the affected columns.
5. Check `/api/health` and the affected routes.

### Account email retirement

1. Confirm the Discord invite and private moderator intake with signed-out support, privacy and banned appeal cases before publishing the contact change.
2. Deploy the version that requests only Discord `identify` and leaves `users.email` out of runtime queries. Confirm new and returning sign-ins. Retire all older instances and use only rollback builds compatible with the column drop.
3. After the billing grant migration, create the next forward migration to purge stored email by dropping `users.email`. The compatibility rollout leaves the database column in place.
4. Restore a pre-purge backup to an isolated database. Confirm it contains the old column, apply the forward migration and verify that the column is absent and the app still starts and signs in. Reapply the migration before any pre-purge restore can serve traffic. Treat retained pre-purge backups as containing email until they expire.

### Migration history

`scripts/check-migrations.ts` compares every migration in `drizzle/meta/_journal.json` with `drizzle.__drizzle_migrations` by SQL hash and journal timestamp. It fails the build when:

- **pending**: a migration newer than the latest recorded one is missing. `bun run db:migrate` applies it.
- **missing**: an older migration is missing. `db:migrate` only applies migrations newer than the latest recorded one, so it will never apply these.
- **unexpected**: a recorded migration matches no file, usually an early draft applied from a branch.

To reconcile a missing or unexpected row:

1. Migrate a disposable database from `develop` with `bun run db:migrate`.
2. Compare the public schema of both databases: columns with types, nullability and defaults, constraints, indexes, enums and functions.
3. If the schemas match and the row is an earlier revision of a migration, record it in `scripts/migration-history.json`: `recordedAs` maps a migration tag to the exact hash and timestamp recorded in its place. `superseded` maps the hash and timestamp of an extra record to its canonical migration, which must also be recorded. Add the evidence to the table below.
4. If the schemas differ, write a forward migration that repairs the target. Never edit or delete recorded history.

A new production database has no history, so the check lists every migration as pending. Run `bun run db:migrate` against it once, then the check passes.

| Staging record | Evidence | Resolution |
| --- | --- | --- |
| `0001_onboarding_profile_fields` has no row at its journal timestamp. Row 2 (`fb1269ea1b2b`) was applied about eight minutes earlier and matches no file | Staging's public schema matches a fresh database migrated from `develop` (2026-11-19) | Row 2 is recorded as `0001_onboarding_profile_fields` |
| `0009_ambitious_landau` and `0010_curvy_shard` have no rows at their journal timestamps | Rows with identical SQL hashes exist under older timestamps | Recorded as applied |
| Row 13 (`0c1bf196cf65`) at `1783531963201` | Identical SQL to `0017_massive_the_hunter`, which is also recorded at its canonical timestamp | Permitted early duplicate at that timestamp only |
| Rows 14 (`5be0a9488134`) and 20 (`ccbb69599fa2`) match no file | They are the hashes of `0012_equal_onslaught` and `0012_large_steve_rogers` from feature branches, early drafts of `0018_plain_loki` and `0019_watery_the_anarchist`, which are both recorded at their own timestamps | Superseded |

The only schema differences from a fresh database are Supabase-managed enums and extensions, and the line endings of `set_updated_at`, whose definition is otherwise identical.

## Rollback

Prefer a forward fix: a new migration that repairs the schema keeps every write made since the release.

Restore only when the schema or data is damaged beyond a forward fix. The restore loses every write made after the backup. `pg_restore --clean` cannot roll back in place when the newer migration added foreign keys to restored tables, so drop both schemas first:

```bash
psql "$DATABASE_URL" -c "drop schema public cascade" -c "drop schema drizzle cascade"
pg_restore -d "$DATABASE_URL" --no-owner --no-privileges --exit-on-error backup.dump
```

Then redeploy the matching application version from Netlify's deploy list.

## Incidents

1. Confirm the failure with `/api/health` and the Netlify function logs.
2. If a deploy caused it, republish the previous Netlify deploy.
3. If a migration caused it, follow [Rollback](#rollback).
4. Record the timeline, the user impact and any exposure of personal data. Privacy obligations for data exposure are tracked under LEGAL-002.
