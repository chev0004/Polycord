# TEST-006: disposable Supabase driver experiment

Measured on 2026-10-05. The pg candidate passed 12 parallel application requests and three consecutive 60-request application bursts on a fresh deployment. The successful configuration uses two pooled application connections, a dedicated abortable ban connection, and a 12-second middleware HTTP deadline. Database connection and ban lookup deadlines remain three seconds; ban statements are limited to 2.5 seconds and general application queries to ten seconds.

The driver change alone did not solve hosted cold-start failures. Both original Postgres.js and pg produced uncached 503s with the original four-second middleware deadline. An eight-second trial still failed one first-burst request. These observations support reviewing the pg candidate and its startup allowance together, rather than attributing the hosted improvement solely to pg. The final cold burst reached 6.79 seconds; an earlier passing twelve-second trial reached 9.49 seconds.

## Resources and conditions

- Supabase: [Polycord Burst Test](https://supabase.com/dashboard/project/ftlxjximfprlplbihcph), free Nano `t4g.nano`, Ohio `us-east-2`, PostgreSQL `17.11.0.002`.
- Transaction pooler: `aws-0-us-east-2.pooler.supabase.com:6543`; session pooler on port 5432 was used for migrations, monitoring, fixture setup, and controlled table locks.
- Dashboard limits: 60 database connections, shared pool size 15, 200 pooler clients. Defaults were retained.
- Netlify: [polycord-test006-supabase](https://polycord-test006-supabase.netlify.app), separate disposable site, Node 22, Next.js 15.5.25, Next.js Runtime 5.16.1, Netlify Build 37.3.3.
- Local runner: Windows, Bun 1.3.14. The TCP/TLS integration proxy runs in Node because Bun did not complete that proxy's TLS upgrade.
- Locked dependencies: Postgres.js 3.4.9, pg 8.23.1, Drizzle 0.45.2.
- Data: 100 synthetic profiles, synthetic allowed/banned accounts, remembered restriction, and synthetic IP fixture. Analytics was disabled. No staging or production database was queried or changed.
- Credentials were held outside the repository and imported only into this disposable site. No paid resources, quota increases, or existing project configuration changes were made. Neon was unnecessary because Supabase had a free slot; this is not a Neon comparison.

The new Supabase project and Netlify site were retained for review. The temporary local credential file and temporary IP probe were removed after testing; only the sandbox's provider-side test credentials remain for the working preview.

## Workload

Standalone probes use the same SQL and fixture for both drivers: discovery joins with nine results, page counts, and interactive transactions containing identity/restriction/IP queries. Each driver runs three sequential operations, 12 parallel mixed operations, then three consecutive 60-operation bursts. Both start with one connection, disabled prepared statements, TLS certificate validation, a three-second connection timeout, and a 20-second idle timeout. pg additionally has its native 2.5-second query timeout; the local runner applies a ten-second overall deadline to either driver. The transaction sets a 2.5-second server statement timeout.

Application runs mix `/en?q=test006`, discovery results, discovery counts, and authenticated internal ban lookups. Requests use a synthetic allowed session; separate checks cover banned identities, remembered bans, internal authentication, IP lookup, and forged forwarding headers. Timings include the client-to-Netlify round trip and response body. The p95 is the sorted sample at index `floor(0.95 * n)`, capped at the last result. These small samples establish observed behavior, not an SLA or a statistically isolated driver speed advantage.

## Standalone results

| Environment / configuration | Sequential | Parallel 12 | Three bursts of 60 | Burst p95 / maximum |
| --- | --- | --- | --- | --- |
| Local Postgres.js, pool 1 | 3/3 | 5/12 | 22, 22, 22 / 60 | Runner deadline near 10 s |
| Local pg, pool 1 | 3/3 | 12/12 | 40, 41, 39 / 60 | Connection queue deadline near 3 s |
| Local Postgres.js, pool 1, pipeline 1 | 3/3 | 5/12 | 21, 21, 21 / 60 | Runner deadline near 10 s |
| Local Postgres.js, pool 2 | 3/3 | 6/12 | 22, 23, 22 / 60 | Runner deadline near 10 s |
| Local pg, pool 2 | 3/3 | 12/12 | 60, 60, 60 / 60 | p95 2.28, 2.29, 2.15 s; max 2.44, 2.46, 2.29 s |
| Hosted Postgres.js, pool 1 | 3/3 | 12/12 | 60, 60, 60 / 60 | p95 535, 500, 335 ms; max 604, 504, 341 ms |
| Hosted pg, pool 1 | 3/3 | 12/12 | 60, 60, 60 / 60 | p95 407, 339, 324 ms; max 521, 347, 325 ms |

Local single-connection failures occurred under the mixed transaction workload across the longer computer-to-Ohio connection. Setting Postgres.js `max_pipeline: 1` did not resolve them. Increasing pg to two connections passed all samples. The auxiliary Postgres.js pool-two trial overlapped the eight-second application trial and is not a controlled latency comparison; the earlier pool-one comparisons and standalone hosted comparison ran separately.

The standalone hosted comparison passed with either driver. Its connection samples peaked at 17 PostgreSQL backends, including Supabase services and the observer; the final sample had zero idle transactions. A shared pooler reuses backends, so these counts are not Netlify instance or pooler-client counts.

## Application results

| Deployment | Middleware HTTP deadline | Parallel 12 | Three bursts of 60 | Burst p95 / maximum |
| --- | ---: | --- | --- | --- |
| Original Postgres.js app, fresh deployment | 4 s | 11/12 | 35, 58, 60 / 60 | p95 4.80, 5.86, 4.04 s; max 5.44, 6.33, 4.76 s |
| pg app, fresh deployment | 4 s | 6/12 | 34, 59, 60 / 60 | p95 4.35, 4.78, 2.49 s; max 4.73, 5.39, 2.99 s |
| Same pg app, warm run | 4 s | 12/12 | 60, 60, 60 / 60 | p95 5.24, 1.57, 1.51 s; max 5.86, 4.09, 1.72 s |
| pg app, fresh deployment | 8 s | 12/12 | 59, 60, 60 / 60 | p95 9.25, 4.14, 2.92 s; max 9.41, 5.03, 4.07 s |
| pg app, fresh deployment, 2.5 s general query limit | 12 s | 12/12 | 60, 60, 60 / 60 | p95 9.31, 1.91, 2.32 s; max 9.49, 5.17, 2.57 s |
| Final pg app, fresh deployment, 10 s general query limit | 12 s | 12/12 | 60, 60, 60 / 60 | p95 6.65, 4.51, 1.85 s; max 6.79, 5.05, 5.09 s |

The eight-second failure was an uncached page 503 at 8.09 seconds. Database backend samples stayed below the dashboard limit and returned to zero idle transactions. This is consistent with the outer middleware HTTP deadline expiring during function startup/scaling; it is not evidence that the driver or database exhausted all 60 database connections. The final run was performed after the auxiliary local trial finished.

The final candidate's samples peaked at 16 PostgreSQL backends, six active backends, and two idle transactions during traffic; the final sample had zero idle transactions. Sampling is every 250 ms and can miss shorter peaks. The observer's query itself counts as active.

The application configurations differ: original Postgres.js has an application pool of five; pg has two. Both use a separate connection per ban lookup. The final trial changes both the driver and outer HTTP deadline, so it does not isolate their individual contributions. The practical recommendation is the tested combined candidate, with a separate rollout review for the higher worst-case HTTP wait and the driver migration.

## Safety and failure recovery

The final candidate passes anonymous pages, allowed identities, account bans, remembered bans, internal authentication, synthetic IP lookup, and spoofed forwarding-header checks. A temporary authenticated probe on the eight-second deployment captured the middleware's trusted caller address; banning that address returned 403 and removing the synthetic restriction restored 200. That probe and its middleware forwarding hook were removed before the final deployment. No caller address is stored in the evidence.

Netlify serves the rewritten banned page with HTTP 200 while showing the banned screen and `no-store`; API bans return 403. This existing adapter behavior was recorded rather than changing the ban-page design in this experiment.

Local integration checks exercise unreachable connections, eight stalled BEGIN lookups, stalled queries, blocked statements, repeated recovery, transaction rollback, and four pooled transactions whose BEGIN stalls. Ban routes return no-store 503 within four seconds, aborted sockets close, pool waiters drain, and the next transaction succeeds without restarting the process. Explicit application pool checkout/release protects against Drizzle 0.45.2 placing BEGIN before its transaction catch/finally.

Hosted table-lock checks returned no-store 503 in 3.20 s for the internal lookup, 2.80 s for discovery, and 2.70 s for the page. After releasing the lock, those same routes returned 200 in 193, 427, and 731 ms. The final database sample had zero idle transactions. The evidence includes these requests and recovery.

The final ten-second general-query revision repeated this check: no-store 503 in 2.89, 2.72, and 2.68 seconds, then healthy recovery in 160, 340, and 691 ms, with zero idle transactions. The five local integration suites also passed again in 42.62 seconds. Stalled application-pool BEGIN is bounded by the ten-second query limit; dedicated ban lookups retain their shorter deadlines.

The [first full CI run](https://github.com/chev0004/Polycord/actions/runs/37272189782) on `69c6101` passed 180 tests and failed the 5,000-profile seed/discovery test with `Query read timeout`. The initial shared application limit of 2.5 seconds was too short for that legitimate query. Commit `2ded19b` separates the ten-second general query limit from the 2.5-second dedicated ban limit. The earlier passing hosted fixture of 100 profiles did not expose this larger-fixture regression. The [corrected CI run](https://github.com/chev0004/Polycord/actions/runs/37272809558) passed all 181 tests, 79 application browser tests, and 457 Storybook tests.

The new Supabase project was manually paused, then resumed through Chrome. While paused, the internal lookup, discovery, and page returned no-store 503 in 1.25, 0.83, and 0.67 seconds. An early recovery attempt while the dashboard still said `Coming up...` also returned a bounded 503. After Supabase reported restoration complete, the first internal lookup returned 200 in 550 ms, followed by discovery in 463 ms and the page in 805 ms. Netlify was not rebuilt or restarted between pause and recovery. The project was left restored and usable. This tests a real provider pause/resume cycle; waiting seven days for automatic free-project inactivity pausing was not exercised.

## Reproduction

Use an external sandbox env file containing this project's transaction `DATABASE_URL`, session `SESSION_DATABASE_URL`, a disposable `AUTH_SECRET`, and `POLYCORD_ANALYTICS_DISABLED=true`. Do not load `.env.local`. The probe scripts reject database usernames outside this project and hosted origins outside the disposable site.

From the repository root:

```powershell
bun --no-env-file --env-file=<external-sandbox-env> experiments/database-burst/setup.mjs
node --env-file=<external-sandbox-env> experiments/database-burst/verify-local.mjs
bun --no-env-file --env-file=<external-sandbox-env> experiments/database-burst/run.mjs
bun --no-env-file --env-file=<external-sandbox-env> experiments/database-burst/run-app.mjs <disposable-deploy-origin> <output-json>
bun --no-env-file --env-file=<external-sandbox-env> experiments/database-burst/run-faults.mjs <disposable-deploy-origin> locked <output-json>
```

For the sleep check, pause only this disposable Supabase project and run `run-faults.mjs` with `paused`. Resume it, wait for the provider's restoration-complete signal, and run the same script with `recovered`. Do not restart or redeploy Netlify between these checks.

Run setup only once on an empty disposable database. It applies the repository migrations and adds the fixture. The local integration runner creates and deletes only its own test records. `PROBE_POOL_SIZE` selects the standalone connection cap; `PROBE_DRIVERS` selects `postgres`, `pg`, or `postgres-serial`. Defaults are one connection and both primary drivers. The output directory must exist.

For the standalone Netlify probe, configure the disposable site's base as `experiments/database-burst`, use the child `netlify.toml`, and import only the sandbox env file. Restore the root application configuration for app trials. All commits use `[skip netlify]` to avoid automatic builds on existing sites; builds on this sandbox were triggered manually in Chrome.

The trusted caller-IP check is optional in `run-app.mjs` and runs only on the temporary probe deployment. The removed probe source is preserved in the measured commit for reproducibility, not installed in the final application.

## Measured commits and artifacts

| Trial | Commit | Immutable deployment |
| --- | --- | --- |
| Standalone drivers | `af0498f5b52ff54af763eac29b572c24099d8917` | [Driver probe](https://6ac33711c5639b42647c6a34--polycord-test006-supabase.netlify.app) |
| pg app, 4 s | `da4ef9ab5be0197af399c667ad4f4706072635e2` | [pg 4 s](https://6ac339229a268a66cec6263e--polycord-test006-supabase.netlify.app) |
| Original app, 4 s | `e94e431a8afd40a750650e06847a72ca80313912` | [Original driver](https://6ac33aa772edf0cb2c7c4ccf--polycord-test006-supabase.netlify.app) |
| pg app, 8 s and trusted IP probe | `e753e4c7` | [pg 8 s](https://6ac33cf9ce110ecae3a50a89--polycord-test006-supabase.netlify.app) |
| pg app, 12 s, initial general query limit | `8da7e8b29b85146b601c0a7290bc91b8551dce1a` | [Initial 12 s trial](https://6ac33e26fbf6fba1ae0ede70--polycord-test006-supabase.netlify.app) |
| Final pg app, 12 s, separate query limits | `2ded19b850bb7c8f4cda28e8364327e20ae7b5d8` | [Final candidate](https://6ac344338a947fbf3abea1b0--polycord-test006-supabase.netlify.app) |

The `.txt` measurement logs in this directory contain raw JSON with request outcomes, timestamps, latency distributions, and available database samples. Local pool-one and pool-two comparison files predate connection sampling. The initial certificate-configuration failure and an invalid server-layer IP probe were corrected before the recorded comparison runs and are excluded from the canonical results.

Checks: formatting/lint, i18n checks, and TypeScript passed. The local unit run passed 166 tests with 15 database-dependent skips; five real local integration suites passed against this disposable database. The targeted middleware/ban route tests also passed after changing the HTTP deadline. CI on the final measured code at `2ded19b` used Bun 1.4.2 and its own PostgreSQL 17 service, passing 181 tests with no skips, 79 application browser tests, and 457 Storybook tests. Hosted production builds succeeded against the disposable environment.
