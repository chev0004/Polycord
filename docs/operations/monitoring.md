# Production Monitoring and Recovery

How production outages are detected, who is told, and how the service is recovered. Every item needs evidence from the real production setup before launch. The evidence table at the end stays Pending until someone records it.

The owner chooses the monitoring and backup services and assigns responders. Nothing here is purchased, and no alert is sent without the owner's approval.

## Checks

Monitor two URLs on the production origin from outside Netlify:

| Check | URL | Healthy response | Why |
| --- | --- | --- | --- |
| Application and database | `https://polycord.net/api/health` | `200` with `{"status":"ok"}` | Runs a database round trip. Returns `503 {"status":"unavailable"}` when the database is unreachable. Stays reachable for banned IPs. |
| Public page | `https://polycord.net/en/legal/terms` | `200` and the text `Terms of Service` | Proves the CDN, routing and page rendering, which the health route skips. |

Check at least every five minutes and alert after two consecutive failures, so one slow cold start does not page anyone. Alert payloads must contain only the URL, status and time. Never include cookies, request bodies or user data.

## Test alert

1. With the owner's approval for a test alert, point a temporary check at a URL that is guaranteed to fail, such as `https://polycord.net/api/health-test-alert`.
2. Confirm that the alert reaches the assigned responder through the chosen channel, and record the time it took.
3. Delete the temporary check, and record the result in the evidence table.

## Logs

Server errors are in Netlify, under the production site's Logs, Functions, `___netlify-server-handler`. Filter by time and by the request path. Server logs never print secrets; deploy summaries print only masked values. Record who has Netlify access and how long the plan retains function logs.

## Backups

Record the database provider's automatic backup schedule and retention for the production database, and whether point-in-time recovery is enabled. Before every production migration, also take a logical [backup](readiness.md#backup).

## Restore drill

Restore into an isolated target, never over the live database:

1. Snapshot the expected contents right before taking the backup:
   `bun scripts/verify-restore.mjs snapshot "$PRODUCTION_DIRECT_URL" > snapshot.json`
2. Take the backup with `pg_dump` as in [Backup](readiness.md#backup).
3. Create a new empty database in an isolated project or on a local server, and [restore](readiness.md#restore) into it.
4. Verify integrity: `bun scripts/verify-restore.mjs verify "$RESTORE_URL" snapshot.json` compares every public table's row count and the full migration history, and exits non-zero on any difference. With live traffic between steps 1 and 2, small count differences on write-heavy tables are expected; the snapshot should then be taken at a quiet time.
5. Start a production build against the restored database locally and confirm `/api/health` returns `200`.
6. Delete the restored database and the dump, which both contain personal data.

The 2026-09-23 drill in [readiness](readiness.md) used disposable data. This drill must use a recent production backup.

## Application rollback

Rehearse before launch, when no public users depend on the site, or on staging:

1. Note the published deploy ID in Netlify.
2. In the deploys list, publish the previous deploy, which must be compatible with the current schema.
3. Confirm Netlify reports the previous deploy as published, and both checks pass.
4. Publish the original deploy again, and confirm both checks once more.

Netlify publishes deploys atomically. After a rollback, the next run of the Production workflow publishes from `main` again. See [production deployment](production.md#rollback).

## Responders

| Role | Responsibility | Assigned |
| --- | --- | --- |
| Primary responder | Receives alerts, follows [Incidents](readiness.md#incidents) | Owner to assign |
| Backup responder | Takes over when the primary does not acknowledge within the agreed time | Owner to assign |

## Evidence

| Item | Evidence needed | Status |
| --- | --- | --- |
| Health and public page checks | Monitor name, URLs, interval and a screenshot of both passing | Pending: owner selects the service |
| Test alert | Time sent, time received, recipient role | Pending: needs owner approval and a responder |
| Log access | Who can open production function logs, and the retention period | Pending: production site |
| Backup schedule | Provider schedule, retention and point-in-time recovery setting | Pending: production database |
| Restore drill | Backup time, restore target, `verify-restore` output, health check result | Pending: production backup |
| Application rollback | Deploy IDs before and after, check results, time taken | Pending: production site |
