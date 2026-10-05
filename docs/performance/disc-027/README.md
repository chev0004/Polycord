# DISC-027 discovery startup

## Baseline and target, recorded before implementation

The instrumented baseline is `3c1558f3ae958659931f683318a41b268d3fd66b`, based on merged TEST-006 commit `1f4fc1fa462712eb5ca01c0dfa371d8f0db92695`. No speed change is included in that baseline. These targets were recorded on 2026-10-05 before implementing an optimization:

- First 60-request burst: p95 at most seven seconds, with every request passing body, count, status and no-store validation.
- Middleware ban-check operation: first-burst p95 at most four seconds.
- All 192 healthy requests and eight safety checks pass in each trial; warmed 60-request burst p95 stays at or below the baseline's 3.67 seconds.
- Preserve account, remembered-identity and trusted-IP enforcement, redirect rejection, bounded failures, cleanup and recovery. Do not raise the existing deadlines or add warming traffic.

The implemented improvement reduces first-burst middleware ban-operation p95 to 0.96–1.03 seconds. The seven-second total cold-start target is **not met**: confirmed fresh trials remain at 9.65–9.93 seconds, overlapping the baseline. This is a measured ban-gate improvement, not a demonstrated overall cold-start improvement. The direct check remains opt-in and is enabled only on the disposable site.

## Environment and measurement

The disposable Netlify site is `polycord-disc027-supabase`, ID `0c36e849-7617-4665-a657-1eb2b60da3d2`, with Ohio functions (`cmh`). The separately authorized free Supabase project is `vioatoyjsfzqrpohliaa`, Ohio `us-east-2`, PostgreSQL `17.11.0.002`, x86 `t3a.nano`. It contains 5,000 varied synthetic profiles, with 4,735 discoverable profiles and only synthetic restriction fixtures. Neither this database nor its credentials are used by staging.

Application connections use the provider's transaction pooler on port 6543; migration and observer connections use its separate session pooler on port 5432. The driver is pg `8.23.1`, Drizzle `0.45.2`; the observer uses Postgres.js `3.4.9`. The application pool remains at two connections, with three-second checkout/connect, ten-second queries and twenty-second idle expiry. Ban checks retain a dedicated abortable connection, a three-second handler deadline and 2.5-second statements. The middleware HTTPS deadline remains twelve seconds. The client allows sixteen seconds for full transfer and rendering.

The hosted baseline uses Node `22.23.3`, Next `15.5.25`, Bun `1.3.14` and Netlify Next.js Runtime `5.16.2`. The runner is Bun `1.3.14` on Windows in the user's environment, configured for `America/Chicago`; its physical location was not independently verified. Each immutable deployment receives 60 mixed concurrent requests as its first traffic from this runner, fifteen each for `/en`, discovery results, discovery count and the authenticated internal check. Two more bursts of sixty, twelve parallel requests and eight safety checks follow. Raw records include full response time, time to headers, response bytes, status, validation and narrowly scoped timing headers; they exclude tokens, cookies, visitor addresses and account identifiers.

`ban-http` measures the whole middleware ban operation, including cookie verification, token creation, HTTPS dispatch and response parsing. It is not a pure wire measurement. `ban-handler` begins after Node has loaded the handler. Process uptime is age at entry, not measured initialization duration. Instance identifiers permit comparisons without claiming access to provider internals. Aggregate SQL duration can exceed handler duration when parallel queries overlap. The observer samples PostgreSQL backends every 250 ms; it cannot measure pooler clients, function instances or unobserved short peaks.

## Fresh hosted baseline

| Trial | Immutable deployment | First 60 passed | First p50 | First p95 | First maximum | Later 60 passed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `6ac3effbcb096619f6fae051` | 60/60 | 8.46 s | 10.88 s | 11.18 s | 60/60, 60/60 |
| 2 | `6ac3f0b223bbe1390cbb0473` | 60/60 | 7.94 s | 9.48 s | 9.68 s | 60/60, 60/60 |
| 3 | `6ac3f169a8d8562757dc5413` | 44/60 | 8.15 s | 9.67 s | 9.95 s | 0/60, 0/60 |

Trials 1 and 2 each passed all 192 requests and eight safety checks. Trial 1's warmed p95 values were 1.83 and 2.40 seconds; trial 2's were 3.66 and 1.71 seconds. Trial 3's first burst includes unexpected 500 and 503 responses; every subsequent allowed request failed, and seven safety checks failed. Its short later failure times are not successful latency measurements. No failing result is discarded from the baseline. The unchanged deployment subsequently recovered without a restart: the internal check, discovery API and page all returned 200 with no-store. Raw results and recovery are retained alongside the deployment metadata.

The first-burst middleware ban-operation p95 was 8.81 seconds in trial 1 and 5.90 seconds in trial 2. The Node ban-handler p95 was 1.58 and 1.51 seconds, including connection p95 of 1.46 and 1.42 seconds. Ban-transaction p95 was about 98 ms. Warmed ban handlers were about 50 ms with connection time around 25 ms. The shared Next.js handler therefore contributes substantial observed delay outside the measured ban-handler body; the measurements do not prove exactly which provider startup, scheduling or network step accounts for the difference. The API handler and its database work also contribute to user-visible latency.

The sampled backend maximum was 19, with zero idle transactions at the end and no observer errors. This does not rule out pooler client limits. Accumulated clients from frozen functions are a hypothesis for trial 3, not an established cause. Both session and transaction connections worked afterward.

Local compiled-route imports on Node `26.1.0` were approximately 140 ms across twelve fresh processes per route, with about 2 MB of traced files. These are local module-loading measurements, not hosted cold starts. They cannot explain the several-second hosted gap by themselves.

## Build quota

Automatic builds on this experiment site were stopped after the baseline. Fresh remote builds had unnecessarily repeated integration verification, fixture setup and the complete Next build. Further experiments must build locally and upload prepared artifacts; do not trigger Netlify's build runner. Use the same adapter and Node version for local comparison builds, validate fresh instance identities, and distinguish changes in build tooling from application changes. Existing staging retains its normal build policy.

The local packaging control uses unchanged baseline application logic at source `f700704`, deployed as `6ac4172cdf568ee4a858afa5`. It passed all 192 requests and eight safety checks: first p50 7.39 s, p95 9.12 s, maximum 10.82 s; warmed p95 3.02 and 2.12 s. First middleware ban-operation p95 was 5.11 s. This is a third successful independent baseline deployment; the failing hosted trial 3 remains reported above. Local packaging uses Node `22.23.3`, adapter `5.16.2` and Netlify Build `37.4.0`, versus hosted Build `37.3.3`. This tooling difference is a measurement limit.

`netlify build --offline --context production` uses the authorized sandbox environment in the local process. Online local build configuration returned masked secrets and could not be used. Windows packaging required one local adapter correction in `edge-runtime/lib/cjs.ts`: use `pathToFileURL(filepath)` instead of forcing `{ windows: false }`. The cached adapter correction is outside the repository. Linux ffprobe tracing paths were selected only during packaging and restored afterward. The experiment build checks pending migrations and compiles; fixture setup and integration verification are separate one-time actions. Reuse the verified artifacts with `netlify deploy --no-build --prod` on this isolated site. Every artifact deployment records a null build-job ID, source commit and artifact hashes. No scheduled warming or build loop is installed.

## Rejected experiments

A standalone Node ban-check function used the original authenticated handler with the same PostgreSQL driver, TLS verification, three-second deadline, transaction and cleanup. Its compressed package was about 0.59 MB versus 43.65 MB for the shared Next server handler. Smaller packaging did not improve the measured user experience:

| Trial | Immutable deployment | First 60 passed | First p50 | First p95 | First maximum | Warmed p95 |
| --- | --- | --- | --- | --- | --- | --- |
| Native 1 | `6ac419df49031add72fe84dd` | 60/60 | 8.15 s | 13.02 s | 13.57 s | 3.23 s, 2.49 s |
| Native 2 | `6ac41a1fa1523fd16acd8748` | 60/60 | 10.42 s | 12.49 s | 13.11 s | 3.08 s, 1.65 s |
| Native 3 | `6ac41a4b23bbe177f0bb046f` | 32/60 | 10.61 s | 11.30 s | 11.46 s | 0/60, 0/60 passed |

The first two native trials each passed all 192 requests and eight safety checks, but middleware ban-operation p95 increased to 8.70 and 8.36 seconds. Native trial 3 collapsed to failures, as one baseline trial had. Both pooler endpoints connected successfully afterward, with zero idle transactions observed. These observations do not identify the cause of either collapse. The native implementation was removed and the local control restored. Raw failures are retained; they are not fast successful requests.

The initial direct-middleware deployment `6ac41fe51d8a6707b67f3edf` passed only the fifteen internal requests in each 60-request burst. Protected paths failed closed with uncached 503s. A narrow temporary diagnostic returned `ERR_MODULE_NOT_FOUND`, with the database setting present; the compiled middleware contained `import("pg")`. Local Deno `2.9.7` had already passed allowed, account, remembered and IP lookups, so the failure was in the generated middleware module loading. Next's `transpilePackages: ['pg']` is used to bundle that driver for the adapter. The diagnostic header was removed after diagnosis. This rejected loader trial is not a successful performance result.

After bundling, deployment `6ac422134d35a9125d874729` connected and completed ban transactions in hundreds of milliseconds, but the middleware still failed closed after three seconds while awaiting connection shutdown. Only 48 internal-check requests of 192 passed, and two of eight safety checks passed. A subsequent socket-close bridge trial `6ac4240281d0c2236cb5a7ce` had the same failure and is retained. The driver has an [upstream report of missing TLS close propagation in Deno](https://github.com/brianc/node-postgres/issues/3420). The final dedicated client destroys the TLS stream and notifies the driver's connection-end event in Deno, awaiting the end promise. Aborting the lookup also destroys that TLS stream and ends the connection. Transactions finish or roll back before normal cleanup; Node keeps its existing graceful close. No deadline is raised. `ban-close` measures cleanup explicitly.

## Confirmed fresh comparison

Implementation source is `fab25035277215a1fb9429e2f8cbad5773747fcb`. `POLYCORD_DIRECT_BAN_CHECK=true` makes the existing middleware call the same ban lookup directly, using verified session and remembered identities and the unchanged trusted-IP resolver. The shared deadline helper retains three-second cancellation. The default transport remains authenticated HTTPS with redirect rejection; the internal route retains authentication, input validation and uncached failures. The pg driver is bundled through Next's `transpilePackages` so Netlify can load it in middleware. There are no cached ban decisions or warming requests.

| Trial | Immutable deployment | First p50 | First p95 | First maximum | Ban-operation p95 | Warmed p95 |
| --- | --- | --- | --- | --- | --- | --- |
| Cold 1 | `6ac426b01273482964b1618e` | 8.82 s | 9.93 s | 10.09 s | 0.96 s | 1.82 s, 1.72 s |
| Cold 2 | `6ac426d873a9e8f0bb746a58` | 8.56 s | 9.79 s | 9.94 s | 0.99 s | 1.61 s, 1.64 s |
| Cold 3 | `6ac42701557d608930be03aa` | 8.28 s | 9.65 s | 9.85 s | 1.03 s | 1.71 s, 1.67 s |

Each trial passed all 192 requests and eight safety checks: 576 healthy requests and 24 safety checks overall. The sampled backend maximum was 18, with zero idle transactions at the end. The middleware target and warmed-throughput target pass. The total cold target does not. Its distribution does not show a repeatable overall improvement over the successful baseline's 9.12–10.88-second p95 range.

The first attempt at reusing the optimized artifact produced p95 values of 10.31, 4.49 and 4.19 seconds. Instance records proved that later uploads reused Node instances: ten app-handler identifiers overlapped between each adjacent pair. Those faster totals are **not** cold-start results and are retained separately. For the confirmed trials, [stamp-artifact.ps1](../../../experiments/discovery-latency/stamp-artifact.ps1) inserts a unique inert comment in the prepared function entry before upload, changing its package checksum without changing application behavior. All three confirmed trials have distinct function-package hashes and zero overlapping Node or middleware identifiers. The three successful baseline deployments also have zero overlap. [Instance comparison](instance-comparison.txt) records this validation. The runtime identifiers are generated by the unchanged probe, not by the artifact stamp.

First-burst API-handler body p95 remains 3.22–3.32 seconds in the confirmed trials. The total response time still includes substantial hosted delay outside that body and the measured middleware operation. API SQL durations include overlapping pool acquisition and queries; they are not additive wall-clock phases. Page SSR/rendering is not separately instrumented, and the managed production Deno version is not exposed by this probe. Local route imports around 140 ms do not establish the provider's initialization duration. These limits prevent assigning the remaining delay to a specific provider internal. The raw measurements support leaving the total startup target unresolved; no timeout increase, artificial warming, paid plan or staging rollout is proposed as a fix.

## Enforcement and recovery

The unchanged HTTPS path passed real redirect rejection without forwarding its internal token. Direct-mode tests verified signed identities, forged-cookie rejection, trusted-IP precedence, fail-closed responses, deadline abortion and recovery. The actual caller address was obtained from DEV-017's existing authenticated capture deployment, held only in memory, and used for a ticket-owned restriction in this disposable database. Discovery API returned 403, the page rendered its ban screen, both were uncached, and removing that exact fixture restored discovery with 4,735 results. No address or identity is included in the evidence.

On the final immutable deployment, a users-table lock produced uncached 503s in 2.81, 2.71 and 2.73 seconds for the internal check, API and page. Releasing the lock restored 200s in 0.16, 0.33 and 0.71 seconds, with zero idle transactions. Pausing only the disposable Supabase project produced uncached 503s in 2.50, 0.68 and 0.62 seconds. After the provider reported restoration complete, the same immutable deployment returned uncached 200s in 5.00, 1.18 and 1.04 seconds. The first recovered internal request includes hosted startup beyond its three-second lookup budget. No function restart, rebuild or redeployment was used for recovery. The disposable database is back online.

Local Deno `2.9.7` also ran eight concurrent locked lookups, all failing within 2.86 seconds, followed by zero idle transactions and successful allowed/account/remembered/IP checks. The local PostgreSQL fault integration passed stalled BEGIN and query cancellation, unreachable-port failures, connection cleanup and recovery. Relevant local unit tests, format/lint, i18n checks, TypeScript and local Next/Netlify packaging pass. Two pre-existing integration lint warnings remain.

## Reproduction and rollback

Use only the named disposable site and database with the synthetic fixture. Configure the documented environment, including `DISC027_TIMING=true` and `POLYCORD_DIRECT_BAN_CHECK=true`, without printing credentials. Build locally with Node `22.23.3` and the adapter above. Confirm automatic builds remain stopped. For each of three trials, stamp the prepared package with a distinct label, upload with `netlify deploy --no-build --prod --site 0c36e849-7617-4665-a657-1eb2b60da3d2`, then immediately run `bun --no-env-file experiments/database-burst/run-app.mjs <immutable-origin> <evidence-file>`. Do not send smaller probes first. Record source and artifact hashes, verify `build_id` is null, and compare runtime identifiers before calling the trials cold.

Timing probes are disabled unless `DISC027_TIMING=true`. The temporary diagnostic header and rejected standalone function are removed. Restore deployment `6ac4172cdf568ee4a858afa5` for the baseline behavior; its original archive is retained outside Git. Existing staging and production use the default HTTPS transport and their existing resources.

## Evidence

- [Trial 1](before-1.txt), [deployment 1](before-1-deploy.txt)
- [Trial 2](before-2.txt), [deployment 2](before-2-deploy.txt)
- [Trial 3, including failures](before-3.txt), [deployment 3](before-3-deploy.txt), [recovery without restart](before-3-recovery.txt)
- [Local imports](before-local-startup.txt)
- [Local control](local-control-1.txt), [deployment](local-control-1-deploy.txt)
- [Rejected native 1](rejected-native-1.txt), [deployment](rejected-native-1-deploy.txt)
- [Rejected native 2](rejected-native-2.txt), [deployment](rejected-native-2-deploy.txt)
- [Rejected native 3](rejected-native-3.txt), [deployment](rejected-native-3-deploy.txt), [pooler checks afterward](after-3-pool-diagnostic.txt)
- [Rejected middleware loader trial](rejected-direct-loader.txt), [deployment](rejected-direct-loader-deploy.txt), [sanitized loader diagnostic](direct-loader-diagnostic.txt)
- [Rejected middleware closure trial](rejected-direct-close.txt), [deployment](rejected-direct-close-deploy.txt)
- [Rejected close bridge trial](rejected-direct-close-2.txt), [deployment](rejected-direct-close-2-deploy.txt)
- [Reused-instance upload 1](optimized-1.txt), [deployment](optimized-1-deploy.txt)
- [Reused-instance upload 2](optimized-2.txt), [deployment](optimized-2-deploy.txt)
- [Reused-instance upload 3](optimized-3.txt), [deployment](optimized-3-deploy.txt)
- [Confirmed cold 1](cold-direct-1.txt), [deployment](cold-direct-1-deploy.txt)
- [Confirmed cold 2](cold-direct-2.txt), [deployment](cold-direct-2-deploy.txt)
- [Confirmed cold 3](cold-direct-3.txt), [deployment](cold-direct-3-deploy.txt), [instance comparison](instance-comparison.txt)
- [Trusted-IP enforcement](cold-direct-trusted-ip.txt), [lock and recovery](cold-direct-locked.txt), [local Deno recovery](deno-recovery.txt)
- [Paused database](cold-direct-paused.txt), [recovery on the same deployment](cold-direct-recovered.txt)
