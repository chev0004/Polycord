# Discovery trace experiment

Use only the existing exclusive discovery sandbox described in [DISC-031](../../docs/performance/disc-031/README.md). Ordinary builds do not register these functions or apply the instrumentation. Credentials remain in the authorized process environment and are never written to evidence.

The measured application source is `ea3c39430f80c39d84e0fc8a545704e1f90b8657` plus `instrumentation.patch`. Apply that patch in an isolated checkout of the recorded source. It installs the synthetic payload captured for the measured fixture, protected fixed/select-1 controls, temporary route/driver/edge timings, and the experiment function directory. `runtime.mjs` and `wrap-artifact.ps1` wrap the prepared framework archive to measure its earliest observable module entry and import. Reproduction on later source must be labeled as a new comparison.

Provide the verified sandbox `DATABASE_URL` and `SESSION_DATABASE_URL`, existing `AUTH_SECRET`, `SITE_ID`/`NETLIFY_SITE_ID`, `DISC031_SITE=0c36e849-7617-4665-a657-1eb2b60da3d2`, and `DISC031_TIMING=true`. Set the transport explicitly through `POLYCORD_DIRECT_BAN_CHECK`. The provider flags must belong only to this sandbox's production context. Keep automatic builds stopped and pin `AWS_LAMBDA_JS_RUNTIME=nodejs22.x`.

Build the Next/adapter candidate locally once using Node 22 and adapter 5.16.2. The documented Windows file-URL correction and temporary Linux/x64 ffprobe tracing selection apply only to local packaging. Restore the temporary Next override afterward. Use `netlify build --offline --context production`, the adapter's `.netlify/static` output, and no hosted build jobs. Fixture setup/verification is a separate action and warms the database.

The small function's extensionless TypeScript dependency needs bundling before its prepared ZIP is used. Build `functions/disc031-minimal.mjs` with Bun `--target=node --packages=external`, replace only its main entry in `.netlify/functions/disc031-minimal.zip`, and retain the generated Netlify bootstrap/metadata. This control returns exactly the fixed discovery payload. Run `wrap-artifact.ps1` once on the current framework archive, then `experiments/discovery-latency/stamp-artifact.ps1` and `stamp-minimal.ps1` with a different label for each deployment. Refreshing the framework manifest is valid only for the current prepared package.

Upload with `netlify deploy --no-build --dir .netlify/static --prod --site 0c36e849-7617-4665-a657-1eb2b60da3d2`. Before application traffic, verify readiness, null build-job ID, actual published Node runtime, and exact prepared/published archive digest through the provider API. Record both function digests and the edge artifacts. Distinct deployment IDs alone do not establish coldness.

Compile `run.mjs` with Bun `--target=node --packages=external` into an ignored directory inside the checkout, then run it under Node 22 with:

```text
node <compiled-runner> <immutable-origin> <output.json> <https|direct> <real|fixed|select1> <single|burst|handler|minimal|idle> /en
```

Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to the verified Chrome executable. `DISC031_ACCOUNT_ID` must be the existing synthetic allowed fixture account's ID; retrieve it once during fixture verification and retain it only in the process, avoiding a database observer before every first visit or idle observation. `prepare.mjs` verifies the exact sandbox, all-synthetic counts and private signed fixture responses before writing a replacement synthetic payload for a newly labeled experiment.

`single` begins with one anonymous visit, then covers both sessions and all entry paths warm. `burst` begins with the sixty-operation mixed workload. `handler`/`minimal` are matched fixed-payload HTTP comparisons. `idle` covers six ordinary visits; the caller controls the traffic-free interval and records actual elapsed time. Prepare browsers without application requests, keep cold single and cold burst deployments separate, compare real captured instance UUIDs, and run at least three independent packages per decisive comparison. Avoid builds/test suites during timed traffic. Keep errors and rejected trials.

Safety checks in the runner cover account/remembered/document bans, internal authentication, forged session/IP headers and fixed-control authentication. The report's separate recovery checks verify the actual platform caller IP, table locks, private/no-store failures, cleanup and recovery. Preserve strict TLS, existing deadlines and every real gate.

The raw report can be recalculated directly from its compressed files:

```text
node experiments/discovery-trace/analyze.mjs docs/performance/disc-031/raw <summary-output.json>
```

The analyzer accepts plain or gzip JSON, selects recorded qualified trial filenames, keeps successful/all distributions separate, merges overlapping database intervals and correlates local-clock spans without inventing synchronized server clocks. The full original files and SHA-256 inventory are retained in the report directory. Timings never contain tokens, cookies, visitor IPs, identities, SQL parameters or real profile bodies.

After the experiment, restore the verified clean immutable deployment, remove the experiment flags/function, retain stopped builds, release locks and delete exact test restrictions, verify fixture/count/zero idle transactions, and restore ordinary source/configuration. The recorded clean rollback is `6ac595ae44d5c81dd446984f`; confirm it is still available and belongs to the exact sandbox before restoring it.
