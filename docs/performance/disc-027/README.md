# DISC-027 discovery startup

## Baseline and target, recorded before implementation

The instrumented baseline is `3c1558f3ae958659931f683318a41b268d3fd66b`, based on merged TEST-006 commit `1f4fc1fa462712eb5ca01c0dfa371d8f0db92695`. No speed change is included in that baseline. These targets were recorded on 2026-10-05 before implementing an optimization:

- First 60-request burst: p95 at most seven seconds, with every request passing body, count, status and no-store validation.
- Middleware ban-check operation: first-burst p95 at most four seconds.
- All 192 healthy requests and eight safety checks pass in each trial; warmed 60-request burst p95 stays at or below the baseline's 3.67 seconds.
- Preserve account, remembered-identity and trusted-IP enforcement, redirect rejection, bounded failures, cleanup and recovery. Do not raise the existing deadlines or add warming traffic.

## Environment and measurement

The disposable Netlify site is `polycord-disc027-supabase`, ID `0c36e849-7617-4665-a657-1eb2b60da3d2`, with Ohio functions (`cmh`). The separately authorized free Supabase project is `vioatoyjsfzqrpohliaa`, Ohio `us-east-2`, PostgreSQL `17.11.0.002`, x86 `t3a.nano`. It contains 5,000 varied synthetic profiles, with 4,735 discoverable profiles and only synthetic restriction fixtures. Neither this database nor its credentials are used by staging.

Application connections use the provider's transaction pooler on port 6543; migration and observer connections use its separate session pooler on port 5432. The driver is pg `8.23.1`, Drizzle `0.45.2`; the observer uses Postgres.js `3.4.9`. The application pool remains at two connections, with three-second checkout/connect, ten-second queries and twenty-second idle expiry. Ban checks retain a dedicated abortable connection, a three-second handler deadline and 2.5-second statements. The middleware HTTPS deadline remains twelve seconds. The client allows sixteen seconds for full transfer and rendering.

The hosted baseline uses Node `22.23.3`, Next `15.5.25`, Bun `1.3.14` and Netlify Next.js Runtime `5.16.2`. The runner is Bun `1.3.14` on Windows in the user's environment. Each immutable deployment receives 60 mixed concurrent requests as its first traffic from this runner, fifteen each for `/en`, discovery results, discovery count and the authenticated internal check. Two more bursts of sixty, twelve parallel requests and eight safety checks follow. Raw records include full response time, time to headers, response bytes, status, validation and narrowly scoped timing headers; they exclude tokens, cookies, visitor addresses and account identifiers.

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

## Evidence

- [Trial 1](before-1.txt), [deployment 1](before-1-deploy.txt)
- [Trial 2](before-2.txt), [deployment 2](before-2-deploy.txt)
- [Trial 3, including failures](before-3.txt), [deployment 3](before-3-deploy.txt), [recovery without restart](before-3-recovery.txt)
- [Local imports](before-local-startup.txt)
