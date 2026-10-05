# TEST-006: disposable Supabase driver experiment

The review candidate passes the two missing checks: exactly 5,000 synthetic profiles and a 60-request batch as the runner's first application traffic after a fresh deploy. Three bursts pass 60/60, the subsequent parallel check passes 12/12, and all eight safety checks pass. The latest first batch's p95 is 6.50 seconds and maximum is 7.32 seconds, including the follow-up redirect guard. This supports the combined pg/pool/deadline candidate for a separate staging rollout review; it does not establish a driver-only fix or fast startup. PR #259 remains draft and no existing staging or production resource was changed.

Measured on 2026-10-05. The initial pg candidate passed 12 parallel application requests and three consecutive 60-request application bursts after smaller requests had warmed its fresh deployment. Those runs used only 100 profiles. The configuration uses two pooled application connections, a dedicated abortable ban connection, and a 12-second middleware HTTP deadline. Database connection and ban lookup deadlines remain three seconds; ban statements are limited to 2.5 seconds and general application queries to ten seconds.

The driver change alone did not solve hosted cold-start failures. Both original Postgres.js and pg produced uncached 503s with the original four-second middleware deadline. An eight-second trial still failed one first-burst request. These observations support reviewing the pg candidate and its startup allowance together, rather than attributing the hosted improvement solely to pg. The final cold burst reached 6.79 seconds; an earlier passing twelve-second trial reached 9.49 seconds.

## Resources and conditions

- Supabase: [Polycord Burst Test](https://supabase.com/dashboard/project/ftlxjximfprlplbihcph), free Nano `t4g.nano`, Ohio `us-east-2`, PostgreSQL `17.11.0.002`.
- Transaction pooler: `aws-0-us-east-2.pooler.supabase.com:6543`; session pooler on port 5432 was used for migrations, monitoring, fixture setup, and controlled table locks.
- Dashboard limits: 60 database connections, shared pool size 15, 200 pooler clients. Defaults were retained.
- Netlify: [polycord-test006-supabase](https://polycord-test006-supabase.netlify.app), separate disposable site, Node 22, Next.js 15.5.25, Next.js Runtime 5.16.1, Netlify Build 37.3.3.
- Local runner: Windows, Bun 1.3.14. The TCP/TLS integration proxy runs in Node because Bun did not complete that proxy's TLS upgrade.
- Locked dependencies: Postgres.js 3.4.9, pg 8.23.1, Drizzle 0.45.2.
- Data: the original trials used 100 synthetic profiles. The review trial expands the same disposable database to 5,000 profiles using the application generator, including varied visibility, languages, tags, availability, Supporter grants, boosts, and voice introductions. Synthetic allowed/banned accounts, remembered restriction, and synthetic IP fixtures remain separate. Analytics was disabled. No staging or production database was queried or changed.
- Credentials were held outside the repository and imported only into this disposable site. No paid resources, quota increases, or existing project configuration changes were made. Neon was unnecessary because Supabase had a free slot; this is not a Neon comparison.

The new Supabase project and Netlify site were retained for review. The temporary local credential file and temporary IP probe were removed after testing; only the sandbox's provider-side test credentials remain for the working preview.

## Workload

Standalone probes use the same SQL and fixture for both drivers: discovery joins with nine results, page counts, and interactive transactions containing identity/restriction/IP queries. Each driver runs three sequential operations, 12 parallel mixed operations, then three consecutive 60-operation bursts. Both start with one connection, disabled prepared statements, TLS certificate validation, a three-second connection timeout, and a 20-second idle timeout. pg additionally has its native 2.5-second query timeout; the local runner applies a ten-second overall deadline to either driver. The transaction sets a 2.5-second server statement timeout.

Original application runs mix `/en?q=test006`, discovery results, discovery counts, and authenticated internal ban lookups. They perform safety checks, a single request, and 12 parallel requests before their first 60-request burst. They therefore establish recovery and warmed/scaling behavior, not a 60-request first-traffic pass. The review runner instead starts with three batches of 60 requests, then 12 parallel requests and the safety checks. Its page route is unfiltered `/en`, which must render actual profiles. API responses must contain profiles and the exact database-derived discoverable count; allowed internal lookups must return `ban: null`. All successful workload responses must be uncached. A failed count, payload, safety check, or monitoring sample makes the runner exit unsuccessfully while preserving the collected evidence.

Requests use a synthetic allowed session; separate checks cover banned identities, remembered bans, internal authentication, IP lookup, and forged forwarding headers. Timings include the client-to-Netlify round trip and response body. The p95 is the sorted sample at index `floor(0.95 * n)`, capped at the last result. These small samples establish observed behavior, not an SLA or a statistically isolated driver speed advantage.

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

## Original 100-profile application results

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

## Review fixes and tradeoffs

The pg `query_timeout` is a client-side deadline, not server query cancellation. The earlier transaction wrapper asked Drizzle to roll back after an in-transaction query timed out; a stalled connection could spend a second ten-second query deadline on that rollback before being discarded. The revised outer transaction owns BEGIN and COMMIT, returning a connection to the pool only after a confirmed COMMIT. Every unsuccessful transaction discards its connection immediately, which aborts unfinished server transactions and preserves the original error. The integration proxy separately withholds BEGIN, SELECT, and COMMIT responses and checks bounded failure, closed sockets, drained pool waiters, and immediate recovery. A lost COMMIT response can leave a committed result uncertain; the application does not automatically retry it.

The prior rollback test used a fixture identity longer than the `users.discord_user_id` limit and accepted any rejection. It could pass on a rejected INSERT without exercising rollback. The corrected fixture fits the schema and requires the deliberately thrown error or Drizzle's explicit rollback exception. Savepoint rollback and isolation/read-only options are also checked against the real database.

Connection-string SSL options can [replace pg's explicit TLS configuration](https://node-postgres.com/features/ssl). The application removes those URL options before handing the URL to pg, so its Supabase CA and certificate validation remain authoritative. IPv6 loopback is treated like other local test connections. Regression checks cover `sslmode=require`, `disable`, and `no-verify` without connecting to the synthetic test hostname.

The two-connection pool still trades per-instance throughput for a smaller connection footprint; the separate ban connection remains outside that pool. The twelve-second middleware wait still trades slower outage responses for startup tolerance. Neither setting was increased during review, and neither positive ban results nor failures are cached. Transaction errors already discarded connections before review; closing them earlier removes a wasted rollback wait, without adding success-path work. Transaction options require one SET TRANSACTION round trip after BEGIN; current application callers do not pass options. The adapter uses Drizzle 0.45.2's transaction/session exports, so adapter upgrades must rerun these lifecycle tests.

## Review: 5,000 profiles and first application traffic

Application commit `b360ba0e7533653ad7f69a9a00067f1bf4d7e89d` was built without cache and published at the [fresh immutable deployment](https://6ac37a1157df527372b0b63a--polycord-test006-supabase.netlify.app). The page was not opened and the runner made no health check, safety request, smaller batch, or temporary-IP probe before the first 60 requests. The first batch launched at `2026-10-05T10:24:46.271Z`, with all 60 calls dispatched within two milliseconds. Each batch includes 15 unfiltered pages, 15 discovery pages, 15 counts, and 15 authenticated internal ban lookups. The fixture contains 5,000 profiles, 4,735 currently discoverable.

| Batch | Successful validated responses | p50 | p95 | Maximum |
| --- | --- | --- | --- | --- |
| First application traffic, 60 | 60/60 | 5.60 s | 6.64 s | 7.10 s |
| Second burst, 60 | 60/60 | 0.75 s | 2.35 s | 2.52 s |
| Third burst, 60 | 60/60 | 0.76 s | 1.63 s | 1.77 s |
| Subsequent parallel check, 12 | 12/12 | 0.77 s | 1.85 s | 1.85 s |

All eight subsequent checks passed, including uncached ban denials, the banned page, internal authentication, synthetic IP lookup, and forged forwarding headers. No workload request timed out or returned an unexpected status, an empty/error feed, an incorrect count, or a positive ban for the allowed identity. PostgreSQL backend samples peaked at 18 connections, 17 active connections, and ten idle transactions during traffic; the last sample had one active observer and zero idle transactions. Counts include Supabase services and the observer and do not measure total Netlify instances or pooler clients. The 250 ms sample interval can miss brief peaks.

The runner executes in the disposable Netlify site's Linux build environment, using Bun 1.3.14 and the already configured secret credentials. The [probe build log](https://app.netlify.com/projects/polycord-test006-supabase/deploys/6ac37ae0c057c56e9d0f50a6) supplies [raw first-traffic evidence](review-first-traffic.txt) and [table-lock recovery evidence](review-locked.txt). UI log timestamp prefixes were removed when saving the JSON. This client location differs from the original Windows runner, and the page workload is now unfiltered, so these latencies are not a controlled before/after speed comparison. Database fixture and monitoring queries precede the first HTTP batch and warm the database. The test establishes the runner's first traffic to a fresh deployment; provider-side internal startup or traffic is not observable, so it cannot prove every function was physically cold.

With `users` locked, the internal route, discovery, and page returned uncached 503s in 2.87, 2.66, and 2.71 seconds. After unlock they recovered to 200 in 172, 291, and 558 ms, with zero idle transactions. The five integration suites also passed through the TLS proxy before fixture expansion, in 45.66 seconds. They cover real transaction rollback, savepoint recovery, transaction options, and stalled BEGIN/SELECT/COMMIT cleanup. [CI on the measured commit](https://github.com/chev0004/Polycord/actions/runs/37296002301) passed 181 tests without skips, 79 application browser tests, and 457 Storybook tests.

## Follow-up: reject internal redirects

The internal ban-check fetch originally followed HTTP redirects. A real-network regression test in Bun redirects the authenticated POST to a second loopback server; before the fix, that server received the internal token and its `ban: null` response was accepted. The request now uses `redirect: 'error'`, so the lookup rejects without contacting the redirect target. The test failed before the change and passes afterward. This adds no database query or network round trip to successful direct requests. A misconfigured internal redirect now fails closed with 503 instead of being followed; configure the internal route to respond directly.

Commit `37addce658a0d7ffc59f5e90e69531a04b2f63f5` passed the five real database integration suites in 46.45 seconds and was published without build cache at the [fresh redirect-safe deployment](https://6ac38210910cf7749b790019--polycord-test006-supabase.netlify.app). The [second probe build](https://app.netlify.com/projects/polycord-test006-supabase/deploys/6ac382e3a17a53aaf34bb687) targeted this immutable URL, configured only in the disposable site's Production context. Its first application batch launched at `2026-10-05T10:58:57.244Z`, before any smaller batch or application check. The same fixture has 5,000 profiles and 4,735 discoverable profiles.

| Batch | Successful validated responses | p50 | p95 | Maximum |
| --- | --- | --- | --- | --- |
| First application traffic, 60 | 60/60 | 4.72 s | 6.50 s | 7.32 s |
| Second burst, 60 | 60/60 | 0.88 s | 1.82 s | 2.33 s |
| Third burst, 60 | 60/60 | 0.74 s | 2.21 s | 2.55 s |
| Subsequent parallel check, 12 | 12/12 | 0.57 s | 1.02 s | 1.02 s |

All eight safety checks passed. PostgreSQL backend samples peaked at 18 connections, 14 active connections, and six idle transactions during traffic; the last sample had only the active observer and zero idle transactions. Monitoring reported no errors. Locked-database checks returned uncached 503s in 2.68, 2.65, and 2.72 seconds, then recovered after unlock in 131, 277, and 509 ms, with zero idle transactions.

Local checks passed, and the local unit run passed 167 tests with 15 database-dependent skips. [CI on the measured redirect-safe commit](https://github.com/chev0004/Polycord/actions/runs/37299475903) passed all 182 tests, 79 application browser tests, and 457 Storybook tests.

[Raw burst evidence](followup-first-traffic.txt) and [raw table-lock evidence](followup-locked.txt) preserve the provider log output after removing timestamp prefixes. Netlify redacted the deploy-origin value as `****` in this run's JSON; the configured immutable target and deployed commit are identified above rather than inserting an inferred URL into the raw file. The earlier methodology limits still apply: fixture/monitoring queries warm the database, provider-side startup is not observable, and these runs do not isolate a latency improvement from the redirect guard.

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

Setup applies repository migrations and grows the disposable fixture to exactly 5,000 profiles in capped batches. It recreates only the two named TEST-006 accounts and its synthetic IP restriction, so run it before measuring rather than during traffic. The integration runner creates and deletes only its own test records. `PROBE_POOL_SIZE` selects the standalone connection cap; `PROBE_DRIVERS` selects `postgres`, `pg`, or `postgres-serial`. Defaults are one connection and both primary drivers. The output directory must exist. `run-app.mjs` requires an immutable deployment hostname and a 5,000-profile fixture.

Netlify stores the sandbox credentials as unreadable secrets. To reproduce without exporting or rotating them, the `test/test-006` build context runs `experiments/database-burst/build.mjs`. It verifies the disposable site ID and both database endpoints before any child job. With `TEST006_DEPLOY_ORIGIN` unset, it runs integration checks, seeds the larger fixture, and builds the application. After that deployment is published, set this non-secret variable to its immutable deployment URL and trigger a second build. That build's first application traffic is the 60-request batch, followed by the remaining bursts, safety checks, and table-lock/recovery probe. The build log contains raw JSON between `TEST006_RESULT_BEGIN` and `TEST006_RESULT_END`; no session cookies, internal tokens, database passwords, or caller IPs are logged. Clear the variable afterward to avoid claiming a repeated run against a warmed deployment is fresh.

For the standalone Netlify probe, configure the disposable site's base as `experiments/database-burst`, use the child `netlify.toml`, and import only the sandbox env file. Restore the root application configuration for app trials. All commits use `[skip netlify]` to avoid automatic builds on existing sites; builds on this sandbox were triggered manually in Chrome.

The old temporary caller-IP probe is no longer called by the review runner. Its source and trusted-IP enforcement evidence are preserved in the eight-second trial's measured commit; the final application does not install it.

## Measured commits and artifacts

| Trial | Commit | Immutable deployment |
| --- | --- | --- |
| Standalone drivers | `af0498f5b52ff54af763eac29b572c24099d8917` | [Driver probe](https://6ac33711c5639b42647c6a34--polycord-test006-supabase.netlify.app) |
| pg app, 4 s | `da4ef9ab5be0197af399c667ad4f4706072635e2` | [pg 4 s](https://6ac339229a268a66cec6263e--polycord-test006-supabase.netlify.app) |
| Original app, 4 s | `e94e431a8afd40a750650e06847a72ca80313912` | [Original driver](https://6ac33aa772edf0cb2c7c4ccf--polycord-test006-supabase.netlify.app) |
| pg app, 8 s and trusted IP probe | `e753e4c7` | [pg 8 s](https://6ac33cf9ce110ecae3a50a89--polycord-test006-supabase.netlify.app) |
| pg app, 12 s, initial general query limit | `8da7e8b29b85146b601c0a7290bc91b8551dce1a` | [Initial 12 s trial](https://6ac33e26fbf6fba1ae0ede70--polycord-test006-supabase.netlify.app) |
| Final pg app, 12 s, separate query limits | `2ded19b850bb7c8f4cda28e8364327e20ae7b5d8` | [Final candidate](https://6ac344338a947fbf3abea1b0--polycord-test006-supabase.netlify.app) |
| Reviewed pg app, 5,000 profiles, first 60-request traffic | `b360ba0e7533653ad7f69a9a00067f1bf4d7e89d` | [Reviewed candidate](https://6ac37a1157df527372b0b63a--polycord-test006-supabase.netlify.app) |
| Redirect-safe pg app, 5,000 profiles, first 60-request traffic | `37addce658a0d7ffc59f5e90e69531a04b2f63f5` | [Redirect-safe candidate](https://6ac38210910cf7749b790019--polycord-test006-supabase.netlify.app) |

The `.txt` measurement logs in this directory contain raw JSON with request outcomes, timestamps, latency distributions, and available database samples. Local pool-one and pool-two comparison files predate connection sampling. The initial certificate-configuration failure and an invalid server-layer IP probe were corrected before the recorded comparison runs and are excluded from the canonical results.

Checks: formatting/lint, i18n checks, and TypeScript passed. The local unit run passed 166 tests with 15 database-dependent skips; five real local integration suites passed against this disposable database. The targeted middleware/ban route tests also passed after changing the HTTP deadline. CI on the final measured code at `2ded19b` used Bun 1.4.2 and its own PostgreSQL 17 service, passing 181 tests with no skips, 79 application browser tests, and 457 Storybook tests. Hosted production builds succeeded against the disposable environment.
