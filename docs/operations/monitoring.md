# Production Monitoring and Recovery

How production problems are found, and how the service is recovered. Launch relies on manual checks after every deploy plus verified backup, restore and rollback. A test alert must reach the assigned responder before launch. Every item needs evidence from the real production setup, and the evidence table at the end stays Pending until someone records it.

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
4. Verify integrity: `bun scripts/verify-restore.mjs verify "$RESTORE_URL" snapshot.json` compares every public table’s row count, the full migration history, row digests for critical tables and public constraint definitions. Quiesce writes between the snapshot and backup so both represent the same data. Investigate every difference before accepting the restore. `profiles_availability_check` and `profiles_availability_days_check` always differ in cast notation, because PostgreSQL re-parses their definitions on restore; accept them only when their allowed values match.
5. Start a production build against the restored database locally and confirm `/api/health` returns `200`.
6. Delete the restored database and the dump, which both contain personal data.

The 2026-09-23 drill in [readiness](readiness.md) used disposable data. This drill must use a recent production backup.

## Application rollback

Rehearse before launch, when no public users depend on the site, or on staging. For a staging rehearsal, use `https://polycord.chev.dev` for the post-deploy checks and expect `X-Robots-Tag` to include `noindex`.

1. Note the published deploy ID in Netlify.
2. In the deploys list, publish the previous deploy, which must be compatible with the current schema.
3. Confirm Netlify reports the previous deploy as published, and the post-deploy checks pass.
4. Publish the original deploy again, and confirm the checks once more.

Netlify publishes deploys atomically. The next owner deploy publishes the current tip of `prod` for production and `develop` for staging. See [production deployment](production.md#rollback).

## Responders

Polycord has a single maintainer. The owner is the only responder for outages and receives every alert. See [Incidents](readiness.md#incidents).

## Uptime monitoring and pre-launch test alert

Once the production candidate is reachable, set up an external uptime monitor and verify delivery of the test alert before announcing launch. Get the owner's approval for the account and test alert first.

- Service: Better Stack Uptime, free plan (10 monitors, email alerts).
- Monitors: the homepage, `https://polycord.net/` with redirects followed, and `https://polycord.net/api/health`, which returns `503` when the database is unreachable and stays reachable for banned IPs.
- Alerts: email to the owner's existing address, after two consecutive failures so one slow cold start does not alert. Alert payloads contain only the URL, status and time.
- Test alert, with approval: point a temporary monitor at a URL that is guaranteed to fail, such as `https://polycord.net/api/health-test-alert`, record the assigned responder, send time and receipt time in UTC, then delete the temporary monitor.

Monitor requests count toward Netlify usage. On a credit-based Netlify team, check how much a 3-minute interval adds before choosing it.

## Evidence

| Item | Evidence needed | Status |
| --- | --- | --- |
| Post-deploy checks | Output of every check for the launch candidate | Done: at 19:41 UTC on 2026-11-25, against Netlify deploy `6b07397217ef45b3140f0081` of `c120ebfc`, published at 19:39:42 UTC. `/api/build` returned `c120ebfc5423e8c96edbf0c345c2c73e62c1580d`. `/api/health` returned `200 {"status":"ok"}`. `/` redirected to `/en`, which returned `200`, and `www.polycord.net` redirected with `301` to `https://polycord.net/en`. `/en/legal/terms` returned `200` with `Terms of Service`. `/en` sent no `X-Robots-Tag`. A real Discord sign-in returned to `/en` signed in, with no OAuth values in the URL. It ran in a browser that already held a session, not a private window |
| Log access | Who can open production function logs, and the retention period | Done: checked through the Netlify API on 2026-11-25. The production site belongs to a Netlify team on the credit-based Free plan whose only member is the owner, with no pending invitations. Netlify keeps function logs for 24 hours on that plan, so read them on the day of an incident. Log drains need an Enterprise plan |
| Backup | Time of the first production backup and where it is stored | Done: 2026-11-25 07:23:59 UTC, `pg_dump` 17.12 against server 17.12, 73 KB, taken from the empty production database in the release codespace and deleted after the restore drill. Weekly backups start once it holds member data |
| Restore drill | Backup time, restore target, `verify-restore` output, health check result | Done: the 07:23:59 UTC backup restored into a local PostgreSQL 17 container in the release codespace. `verify-restore` matched table row counts, migration history and critical row digests, and reported only the two availability CHECK constraints in different cast notation with the same allowed values. A production build of `770668b7` against the restore returned `200` from `/api/health`. The restore, dump and snapshot were deleted |
| Application rollback | Deploy IDs before and after, check results, time taken | Pending: production site |
| Uptime monitor and test alert | Monitor URLs, interval, time the test email arrived | Done: Better Stack Uptime on the free plan monitors `https://polycord.net/` with redirects followed and `https://polycord.net/api/health`, with a GET every 3 minutes from Europe, North America, Asia and Australia, a 3-minute confirmation period and email to the owner. A temporary monitor on `https://polycord.net/api/health-test-alert` started an incident on its 404 at 2026-11-25 08:02 UTC. The alert email reached the owner's inbox at 08:02 UTC and the owner acknowledged the incident at 08:24 UTC. The temporary monitor was then removed |
