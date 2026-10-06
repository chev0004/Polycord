# DISC-029 discovery shell

## Target and environment

DISC-029 sets a cold usable-shell p95 target of at most three seconds. The shell must contain the real wordmark, language control, search, standard filters and sort before discovery data finishes. Profile-data readiness is measured separately; faster shell display does not establish faster discovery queries or complete data loading.

The earlier DISC-027 confirmed cold full-response p95 was 9.65-9.93 seconds with direct middleware ban-operation p95 0.96-1.03 seconds. Those raw measurements are retained in `../disc-027/`. They did not separately measure browser-visible shell or hydration. This experiment compares authenticated HTTPS and the reviewed opt-in direct gate with the same shell implementation and hosted workload.

Use only Netlify site `polycord-disc027-supabase`, ID `0c36e849-7617-4665-a657-1eb2b60da3d2`, and Supabase project `vioatoyjsfzqrpohliaa` in Ohio. The fixture was verified before trials: 5,000 synthetic profiles, 4,735 discoverable. Application connections use transaction pooler 6543; migration and observer connections use session pooler 5432. Driver, TLS verification, pool size and existing ban deadlines remain unchanged.

Automatic Netlify builds were verified stopped before this ticket. Package locally with matching Node 22 and the Next adapter, then upload with `--no-build`. Record source and artifact hashes, immutable deployment IDs, null build-job IDs and real instance identifiers. Do not warm the application before first traffic. Staging and production configuration are outside this experiment.

## Measurement plan

Run at least three independent fresh deployments for each transport. Start each with sixty concurrent logical requests: fifteen browser discovery navigations, fifteen discovery API requests, fifteen count requests and fifteen authenticated internal checks. Browser navigations measure response, hydrated usable-shell visibility and validated profile-data readiness. Their viewer, discovery and notification follow-up requests are inherent application traffic and are recorded separately from the sixty initiating requests. This browser workload adds usability evidence to the earlier HTTP-only runner; it is not an identical physical request count.

Prelaunch the browser and blank contexts without requesting the application. Use immutable deployment URLs. Follow the first burst with the same warmed bursts and safety checks. Verify fresh Node and middleware identities across trials; a new deployment ID alone is insufficient. Keep failed and reused-instance trials visible in the evidence.

Record per-trial p50, p95, maximum, errors, validated successes, shell and data metrics, warmed behavior and sampled backend/idle-transaction observations. The Windows runner uses America/Chicago as its configured timezone; physical location is not independently verified. Provider startup internals and pooler client counts remain outside the probe's observations.

## Local verification

The locale HTML and discovery controls are prerendered. Request-specific routes retain an explicitly dynamic route-group layout. The viewer bootstrap and discovery JSON responses remain private/no-store, including failures. The discovery client parses URL state behind a small Suspense observer and fetches data after hydration, with cancellation of superseded requests.

Seven focused browser cases cover English and Japanese, desktop and mobile, pending account/data, late response races, signed-in onboarding, unchanged input focus and vertical position, URL history, refresh and retry. Accessibility scans of the rendered discovery page pass. Existing account-navigation coverage now begins after initial discovery loading, retaining its assertion that account routes have no skeleton or premature progress completion.

Local unit/integration checks passed 205 tests. Existing discovery, blocked-profile, IP-ban, staff, saved-profile and mobile journeys passed; the obsolete initial-skeleton expectation was corrected and its navigation cases rerun successfully. Production builds and formatting/i18n/TypeScript checks pass. Hosted results and exact source/tool metadata will be appended after the planned trials.
