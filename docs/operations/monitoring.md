# Production Monitoring and Recovery

How production problems are found, and how the service is recovered. Launch relies on manual checks after every deploy plus verified backup, restore and rollback. Automated uptime monitoring follows after launch. Every item needs evidence from the real production setup, and the evidence table at the end stays Pending until someone records it.

Nothing here is purchased. No monitoring account is created and no alert is sent without the owner's approval.

## Post-deploy checks

Run these by hand after every production deploy and every rollback, and paste the results into the release record with the deploy summary:

| Check | Command | Healthy result |
| --- | --- | --- |
| Build | `curl -s https://polycord.net/api/build` | `buildId` is the deployed commit |
| Application and database | `curl -si https://polycord.net/api/health` | `200` with `{"status":"ok"}`. `503 {"status":"unavailable"}` means the database is unreachable |
| Homepage | `curl -sIL https://polycord.net/` | Redirects to `/en`, then `200` |
| Public page | `curl -s https://polycord.net/en/legal/terms` | `200` and the text `Terms of Service` |
| Indexing | `curl -sI https://polycord.net/en` and the [indexing table](production.md#indexing) | No `X-Robots-Tag` on the production host |
| Sign-in | Sign in with Discord on the production domain in a private window | Returns to the original page signed in |

If any check fails, roll back first and investigate after. See [Application rollback](#application-rollback).

## Logs

Server errors are in Netlify, under the production site's Logs, Functions, `___netlify-server-handler`. Filter by time and by the request path. Server logs never print secrets; deploy summaries print only masked values. Record who has Netlify access and how long the plan retains function logs.

## Backups

Supabase Free takes no automatic backups and has no point-in-time recovery, so every backup is a manual logical [backup](readiness.md#backup) with `pg_dump`:

- before every production migration;
- weekly while the project holds member data, kept off the database host;
- before any manual data fix.

Each dump contains personal data. Store it encrypted, keep only as many as recovery needs, and delete older ones.

## Restore drill

Restore into an isolated target, never over the live database:

1. Snapshot the expected contents right before taking the backup:
   `bun scripts/verify-restore.mjs snapshot "$PRODUCTION_DIRECT_URL" > snapshot.json`
2. Take the backup with `pg_dump` as in [Backup](readiness.md#backup).
3. Create a new empty database on a local server, never a third Supabase project, which the free plan does not allow alongside staging and production, and [restore](readiness.md#restore) into it.
4. Verify integrity: `bun scripts/verify-restore.mjs verify "$RESTORE_URL" snapshot.json` compares every public table's row count and the full migration history, and exits non-zero on any difference. With live traffic between steps 1 and 2, small count differences on write-heavy tables are expected; the snapshot should then be taken at a quiet time.
5. Start a production build against the restored database locally and confirm `/api/health` returns `200`.
6. Delete the restored database and the dump, which both contain personal data.

The 2026-09-23 drill in [readiness](readiness.md) used disposable data. This drill must use a recent production backup.

## Application rollback

Rehearse before launch, when no public users depend on the site, or on staging:

1. Note the published deploy ID in Netlify.
2. In the deploys list, publish the previous deploy, which must be compatible with the current schema.
3. Confirm Netlify reports the previous deploy as published, and the post-deploy checks pass.
4. Publish the original deploy again, and confirm the checks once more.

Netlify publishes deploys atomically. After a rollback, the next owner deploy publishes from `main` again. See [production deployment](production.md#rollback).

## Responders

Polycord has a single maintainer. The owner is the only responder for outages and receives every alert. See [Incidents](readiness.md#incidents).

## Uptime monitoring after launch

Once production is live, add an external uptime monitor, if the owner approves the account:

- Service: Better Stack Uptime, free plan (10 monitors, email alerts).
- Monitors: the homepage, `https://polycord.net/` with redirects followed, and `https://polycord.net/api/health`, which returns `503` when the database is unreachable and stays reachable for banned IPs.
- Alerts: email to the owner's existing address, after two consecutive failures so one slow cold start does not alert. Alert payloads contain only the URL, status and time.
- Test alert, with approval: point a temporary monitor at a URL that is guaranteed to fail, such as `https://polycord.net/api/health-test-alert`, record when the email arrives, then delete the monitor.

Monitor requests count toward Netlify usage. On a credit-based Netlify team, check how much a 3-minute interval adds before choosing it.

## Evidence

| Item | Evidence needed | Status |
| --- | --- | --- |
| Post-deploy checks | Output of every check for the launch candidate | Pending: production site |
| Log access | Who can open production function logs, and the retention period | Pending: production site |
| Backup | Time of the first production backup and where it is stored | Pending: production database |
| Restore drill | Backup time, restore target, `verify-restore` output, health check result | Pending: production backup |
| Application rollback | Deploy IDs before and after, check results, time taken | Pending: production site |
| Uptime monitor and test alert | Monitor URLs, interval, time the test email arrived | After launch, with the owner's approval |
