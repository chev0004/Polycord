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
| Uptime monitoring | Chev | External monitor (not chosen) | Blocking | Nothing in the repository polls `/api/health`. Choosing a service, and any purchase, needs separate authorization. |
| Error and performance monitoring | Chev | Netlify function logs; no app-level reporter | Unverified | Netlify records function logs for server routes. Log retention, and whether anyone reviews them, has not been checked. The repository has no error reporting service. |
| Alert recipients and test alert | Chev | Not configured | Blocking | No alert route exists in the repository. The acceptance test alert needs a chosen monitor and an authorized test path that sends no personal data. |
| Database backups | Chev | Supabase project settings | Unverified | Supabase backup schedule and retention depend on the project plan and have not been checked. The manual logical backup below is verified against disposable data. |
| Restore procedure | Chev | [Restore](#restore) | Verified | Drilled 2026-09-23 on disposable PostgreSQL 17.10: a backup taken at migration 0018 was restored into a new database and in place, and the fixture rows survived both. |
| Migration and rollback | Chev | [Migrations](#migrations), [Rollback](#rollback) | Verified | Same drill: 0019 was applied, rolled back to the 0018 backup, then rolled forward again. The migration journal count matched each step (19, 20, 19, 20). |
| Application deploy rollback | Chev | Netlify deploys list | Unverified | Merges to `develop` deploy automatically. Netlify can republish an earlier deploy, but this has not been exercised for Polycord. |
| Secrets | Chev | Netlify environment variables | Unverified | README requires runtime secrets in Netlify, never Git, with separate staging `AUTH_SECRET` and VAPID keys. The values themselves have not been audited. |
| Incident ownership | Chev | [Incidents](#incidents) | Verified | Single maintainer. No rotation or backup responder exists. |
| Support, privacy and safety mailboxes | Chev | `src/features/Legal/legalContent.ts` | Blocking | `support@`, `privacy@` and `safety@polycord.app` are published. Delivery and staffing are verified under LEGAL-002, not here. |

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
pg_restore -d "$RESTORE_URL" --no-owner --no-privileges --exit-on-error backup.dump
```

A new database already has an empty `public` schema. Dropping it first stops `pg_restore` failing on `schema "public" already exists`.

## Migrations

The hosting build does not run migrations, so order them against the deploy:

1. Generate with `bun run db:generate` and review the SQL in `drizzle/`.
2. Run `bun run test:e2e` and the integration tests against a disposable database.
3. Take a [backup](#backup).
4. Apply additive migrations with `bun run db:migrate` before merging the code that uses them. Apply destructive migrations only after the deployed code no longer reads the affected columns.
5. Check `/api/health` and the affected routes.

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
