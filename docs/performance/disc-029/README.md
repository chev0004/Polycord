# DISC-029 discovery shell

## Target and environment

DISC-029 sets a cold usable-shell p95 target of at most three seconds. The shell must contain the real wordmark, language control, search, standard filters and sort before discovery data finishes. Profile-data readiness is measured separately; faster shell display does not establish faster discovery queries or complete data loading.

The native Netlify document gate meets that target on three fresh deployments using the opt-in direct ban check: **2.720, 2.284 and 2.563 seconds**, pooled p95 **2.655 seconds**. The matched HTTPS arm remains above target: **9.672, 9.794 and 10.225 seconds**. Shared staging retains HTTPS. Enabling direct lookup there is a separate deployment decision for review; this PR does not change its environment.

All six qualified trials passed their 192 logical workload requests and eight safety checks: **1,152/1,152 requests, zero errors, 48/48 safety checks**. Discovery ranking SQL is unchanged. Complete rendered profile readiness still takes substantially longer than shell readiness.

All experiment uploads, workload trials and database fixtures were confined to Netlify site `polycord-disc027-supabase`, ID `0c36e849-7617-4665-a657-1eb2b60da3d2`, and Supabase project `vioatoyjsfzqrpohliaa`. Functions are in Ohio `cmh`; the database is Ohio `us-east-2`, free Nano, PostgreSQL 17.11. The fixture was verified before trials: 5,000 synthetic profiles, 4,735 discoverable. Application connections use transaction pooler 6543; migration and observer connections use session pooler 5432. Trusted-IP capture uses an existing authenticated read-only staging endpoint, without changing its deployment or data.

Automatic builds were stopped before this ticket and remain stopped. Every experiment uploaded locally prepared artifacts with `--no-build` and has `build_id: null`. This establishes absence of hosted build jobs for the recorded deployments, not the team's billing total. Commits carry `[skip netlify]` to prevent connected sites from rebuilding. No warming loop, paid capacity change or shared project pause was used.

The qualified source and runner are `67ac960891eee6004bb8bd261165a2874586be2b`. Commit `79989323` removes temporary probes/wrapper; the final clean review deployment uses `ac7fd9d` with subsequent test/hook updates and the missing-route boundary fix. The latter affects application recovery, not discovery's document gate or hydration path. Local Node is 22.23.3; actual measured hosted Node is 22.23.2. Next is 15.5.25, adapter 5.16.2, CLI 27.11.0 and Chrome 154.0.8037.98. Each `*-deploy.json` records the prepared ZIP hash, matching actual published digest, edge hash, runtime, source and immutable URL. TLS verifies the provider CA; pool max two, acquisition three seconds, queries ten seconds, dedicated ban deadline three seconds, ban SQL 2.5 seconds and HTTPS deadline twelve seconds.

## Measurement method

Each trial starts with sixty concurrent logical requests: fifteen browser discovery navigations, fifteen discovery API requests, fifteen count requests and fifteen authenticated internal checks. Two warmed bursts of sixty and a final burst of twelve follow, then eight safety checks. Browser viewer/discovery/notification follow-up requests are additional application traffic, recorded within browser outcomes. This differs from DISC-027's earlier HTTP-only physical request count.

Blank browser contexts are prepared without application traffic. The recorded mixed burst is the first application traffic to each immutable URL. Readiness/runtime/digest checks use the provider API. Unique inert ZIP stamps change package checksums. All fifteen deployment pairs have zero overlapping real Node and edge identifiers in [independence.json](./independence.json). These identify module instances, not proven physical VM counts.

Usable shell requires visible controls and attached React event handlers on search, language, filters and sort, plus the loaded real wordmark. Polling is every 25 ms because attaching handlers need not mutate the DOM. Data readiness requires rendered synthetic cards and validated viewer/data responses. Response, shell and data are separate observations.

Percentiles sort all observations and select `floor(n * p)`, clamped to the last index. With fifteen navigations, per-trial p95 is the maximum. Pooled values use all forty-five cold navigations. No outliers are removed. Builds, tests and other uploads did not overlap qualified timed bursts. HTTPS precedes direct, so this is sequential rather than randomized causal isolation of transport effects. America/Chicago is the configured timezone; the browser's physical location is not independently verified. Provider startup internals and pooler client counts remain unmeasured.

## Qualified cold results

Values are seconds, shown as `p50 / p95 / max`. Raw milliseconds, outcomes, follow-ups and backend samples are retained in the six root trial JSON files. [summary.json](./summary.json) collects every phase and its metadata.

| Trial | Response p50 / p95 / max | Usable shell p50 / p95 / max | Rendered data p50 / p95 / max | Immutable deployment |
| --- | --- | --- | --- | --- |
| HTTPS 1 | 8.705 / 9.336 / 9.336 | 9.110 / 9.672 / 9.672 | 11.003 / 11.400 / 11.400 | `6ac5535dc7473da0ac332f2b` |
| HTTPS 2 | 5.630 / 9.484 / 9.484 | 6.521 / 9.794 / 9.794 | 7.748 / 11.273 / 11.273 | `6ac553943036562bbc6caa76` |
| HTTPS 3 | 5.924 / 9.893 / 9.893 | 6.431 / 10.225 / 10.225 | 11.167 / 11.569 / 11.569 | `6ac553ce0ee5de6e6f431a52` |
| Direct 1 | 1.754 / 2.041 / 2.041 | 2.523 / 2.720 / 2.720 | 7.825 / 8.428 / 8.428 | `6ac554097522cc7e11f4593a` |
| Direct 2 | 1.465 / 1.582 / 1.582 | 2.110 / 2.284 / 2.284 | 7.389 / 7.905 / 7.905 | `6ac554443a4383d0b88382df` |
| Direct 3 | 1.604 / 1.681 / 1.681 | 2.359 / 2.563 / 2.563 | 7.449 / 7.705 / 7.705 | `6ac554751801b989800892dc` |
| HTTPS pooled, n=45 | 5.863 / 9.710 / 9.893 | 6.501 / 10.109 / 10.225 | 10.942 / 11.400 / 11.569 | Three fresh deployments |
| Direct pooled, n=45 | 1.552 / 1.944 / 2.041 | 2.230 / 2.655 / 2.720 | 7.503 / 8.324 / 8.428 | Three fresh deployments |

## Warmed load and connections

| Trial | Warm 1 usable p95 | Warm 2 usable p95 | Warm successes | Peak sampled idle transactions | Final idle transactions |
| --- | --- | --- | --- | --- | --- |
| HTTPS 1 | 1.900 s | 1.704 s | 120/120 | 4 | 0 |
| HTTPS 2 | 1.936 s | 1.811 s | 120/120 | 9 | 0 |
| HTTPS 3 | 1.896 s | 2.571 s | 120/120 | 5 | 0 |
| Direct 1 | 2.097 s | 1.710 s | 120/120 | 16 | 0 |
| Direct 2 | 1.927 s | 1.648 s | 120/120 | 16 | 0 |
| Direct 3 | 1.955 s | 1.637 s | 120/120 | 16 | 0 |

The final twelve-request bursts also passed in all trials. Sampled backends peaked at eighteen. Short in-flight transactions appear in samples, but none lingered at the end or after recovery. Backend samples do not measure Supavisor frontend clients or every short peak. Logical throughput derived from recorded start/completion times is included per phase in `summary.json`; it includes browser completion and is not database QPS or total physical HTTP throughput.

## Implementation and verification

The locale HTML and controls are prerendered. Request-specific routes retain the explicitly dynamic `(app)` layout and unchanged URLs. Viewer and discovery load concurrently. Both APIs remain private/no-store, including failures. The viewer verifies the account once and loads profile/settings/role concurrently; discovery reuses the verified account ID. Stable client providers preserve pending input, focus and URL state as personalized context resolves.

SSG through the ordinary App Router handler still incurred a function startup before delivering the shell. The build plugin therefore bundles only the two public prerendered documents into a native Netlify edge handler, absent from public static output. It checks every request through the existing ban gate before serving a document or delegating RSC/non-document traffic. It opts into no edge response caching. Allowed documents use `public, max-age=0, must-revalidate`; bans and failures use no-store. No personal identity, settings or data enters the bundled HTML.

The replacement gate covers exact discovery/RSC paths and excludes the same paths from generated Next middleware only after packaging. The build fails if the expected declaration or full prerender is absent. APIs and unrelated pages retain their middleware. Hosted fresh legal-to-discovery navigation verifies genuine RSC delivery; Next strips flight markers before user middleware, so direct `NextRequest` tests alone did not prove this boundary.

Direct lookup imports a small connection module and parameterized queries rather than booting the complete Drizzle schema/pool. IP priority, earliest account/restriction ban date, transactions, strict TLS, deadlines and cleanup are preserved. Application pools remain max two. Lambda clients are recycled after use to avoid aggregate Supavisor frontend-client exhaustion observed under mixed load; local/CI retain reuse. Warm measurements include recycling's cost.

Each trial's eight safety checks cover account and remembered bans on APIs/documents, spoofed headers/unsigned cookies, internal authentication and an authenticated IP fixture. Redirect rejection and unavailable/malformed lookup contracts pass local checks. [trusted-ip.json](./trusted-ip.json) separately records an actual platform caller-IP ban: the address stayed in memory, the exact synthetic fixture was deleted in `finally`, and the discoverable count recovered to 4,735.

[faults.json](./faults.json) records fourteen successful assertions on the same immutable direct deployment. A users-table lock made document/viewer/discovery/internal checks fail closed with no-store 503s in 3.47-3.80 seconds including network time. All recovered after release without restarting functions. A profiles lock left the shell usable while private viewer/discovery returned bounded no-store 503s after the existing ten-second query deadline. Both recovered and final idle transactions were zero.

[hosted-ui.json](./hosted-ui.json) records all twelve passing checks on the final clean package: English/Japanese at desktop/mobile widths, delayed signed viewer/data, input/focus/vertical-position preservation, ignored superseded responses, client navigation/history/refresh, four zero-violation accessibility scans, reserved asset 404/no-store, HEAD, genuine RSC delivery and localized missing routes retaining navigation/footer. The earlier prototype proof remains in `history/native-prototype-ui.json`.

The same final package passes [fourteen fault/recovery assertions](./clean-faults.json), [twelve account/remembered/RSC/spoofing/internal-auth checks](./clean-safety.json), and [the actual caller-IP ban and fixture cleanup](./clean-trusted-ip.json). Allowed responses have no temporary timing headers. These are clean-package smoke checks, not additional cold-start measurements.

Clean local source passes 206 unit/integration tests, formatting/i18n/TypeScript and a production build. Eleven focused shell/navigation cases pass. Broader account/staff/saved/blocked/IP/mobile journeys and full Storybook checks are recorded with final counts in the PR. Runtime probes are removed.

The clean regression run passed all 459 Storybook cases. The broader browser run passed 32 of 33 cases; the pagination setup read the early count before deferred cards finished, so its initial scroll measurement raced layout completion. Waiting for the actual first card restored the unchanged scroll assertions, and the corrected case passed on rerun. Together with the eleven focused cases, 44 relevant browser cases pass. A separate attempted run could not start because the local PostgreSQL process had stopped; it was restored and verification used the same owned test database.

The first full GitHub browser run passed 96 of 97 cases and exposed a localized missing-route regression: the outer locale not-found boundary replaced the new application layout, losing navigation/footer. The group's own boundary now reuses the existing recovery component. A production rebuild and ten shell/recovery cases pass, including both locales, malformed profile IDs and database-error recovery, bringing local relevant coverage to 47 unique cases. The failed run remains visible at [the original CI run](https://github.com/chev0004/Polycord/actions/runs/37552122335).

To reproduce timings, use the recorded measured commit with `DISC029_TIMING=true` on the exclusive synthetic resources. Build the package locally with `netlify build --offline --context production`, stamp a new label with `experiments/discovery-latency/stamp-artifact.ps1`, and upload `.netlify/static` with `--no-build`. Verify actual published digest/runtime before any application traffic. Compile `experiments/discovery-shell/run.mjs` with Bun's `--target=node --packages=external` into `.netlify`, then run it under Node 22 with immutable origin, evidence path and `https` or `direct` arguments. Set the sandbox transport flag for each matched arm and record provider metadata independently. The clean review source intentionally lacks instance probes; do not pretend it produces the historical instrumentation.

## Rejected and intermediate evidence

[history](./history/) preserves unsuccessful and intermediate runs. Names such as `final-*` reflect their historical label, not qualification. Only the six root trial files constitute the matched final comparison.

| Historical group | Interpretation |
| --- | --- |
| `rejected-https-1`, `diagnostic-*` | Wrong `.next` publish output omitted JS/CSS/wordmark, invalidating UI timings and causing failures. Mixed load also classified Supavisor `XX000` client-limit errors despite eighteen sampled backends. |
| `recycling-control` | Hosted load passed, but global recycling, Node 24 and concurrent local tests make this diagnostic. Final recycling is Lambda-only. |
| `https-*`, `direct-*` | SSG through Next did not meet three seconds. One HTTPS warmed viewer request timed out. Some actual packages/runtimes differed from prepared metadata. |
| `static-direct-*` | Preliminary visibility checks did not explicitly require all attached handlers. |
| `final-*` | Slim lookup appeared fast, but expired CLI manifests repackaged unstamped Node 24 functions. Reject as a matched Node 22 package comparison. |
| `verified-*` | Published digest/runtime corrected; one direct p95 was 3.208 seconds. The last HTTPS warmed burst overlapped the next upload and remains diagnostic. |
| `deferred-*` | Deferring UI reduced initial JS from 291 to 229 kB, but hosted RSC misclassification was subsequently found. |
| `rsc-*` | Correct RSC routing passed safety/load, but direct p95 included 4.291 seconds and missed the target, prompting native document delivery. |
| `native-prototype-direct-1` | Missing hosted compatibility globals caused uncached fail-closed 503s. Local Deno success alone was insufficient. |
| `native-prototype-direct-2` | Compatibility bindings fixed the prototype and UI/protocol proof passed. Permanent implementation and three fresh direct trials supersede it. |
| `clean-before-recovery-*` | The first probe-free package passed discovery UI/gate/recovery checks but lacked the inner missing-page boundary. Final clean evidence supersedes these smoke checks. |

CLI 27.11.0 expires prepared function manifests after two minutes. The stamp helper refreshes the generated manifest timestamp after intentionally stamping the current ZIP; otherwise `--no-build` can repackage unstamped source and change runtime. Actual provider digests/runtime were verified before qualified traffic. Never refresh obsolete packages after source changes.

## Final sandbox state

`clean-deploy.json` records the final serving deployment and digest, with stopped automatic builds. Original immutable rollback `6ac42701557d608930be03aa` remains available. Only exclusive sandbox transport/runtime flags changed. The default HTTPS path remains above target; reaching three seconds requires the measured opt-in direct mode to be reviewed before staging deployment.
