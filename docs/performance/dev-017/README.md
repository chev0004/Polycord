# DEV-017 staging rollout

On 2026-10-05, staging was published on the merged TEST-006 candidate at `1f4fc1fa462712eb5ca01c0dfa371d8f0db92695`. The immutable deployment and the public staging hostname each passed 192 mixed requests, eight safety checks, and a middleware-level trusted-IP ban and recovery check. This verifies the reliability rollout; startup remains slow and is being investigated separately in DISC-027.

## Configuration and deployment

| Setting | Verified value |
| --- | --- |
| Netlify project | `polycord-staging`, `694f7324-d2b5-43b5-9de4-ae33e0b927ee` |
| Public URL | <https://polycord.chev.dev> |
| Production branch | `develop`; automatic builds active; branch deploys and PR previews disabled |
| Previous deploy | `6ac31de292ac5700090d0daa`, commit `b23fcd64d829be7271f45cdae74c15f8c3dace2f` |
| Published deploy | `6ac3dfcd5e5acd1955f378e0`, commit `1f4fc1fa462712eb5ca01c0dfa371d8f0db92695` |
| Supabase project | `lqyekuxzhxkjsctdpybi`, existing staging/local database |
| Database region | Oregon, `us-west-2`, free Nano |
| Netlify function region | `cmh`, Ohio |
| Runtime | Node `22.23.3`, Next.js `15.5.25`, Netlify Next.js Runtime `5.16.2`, Netlify Build `37.3.3` |
| Locked libraries | pg `8.23.1`, Drizzle `0.45.2`, Postgres.js `3.4.9` for the migration checker and observer |
| Application pool | Two connections; three-second checkout/connect limit; ten-second query limit; twenty-second idle timeout |
| Ban connection | Dedicated abortable connection; three-second route deadline; 2.5-second statements |
| Middleware HTTP deadline | Twelve seconds, uncached and fail closed; redirects rejected |
| Runtime endpoint | Supabase-provided transaction pooler `aws-1-us-west-2.pooler.supabase.com:6543/postgres` |
| Migration connection | Existing local session-pooler connection on port 5432 remains separate |

The staging project was already healthy when inspected. Its actual Netlify secret already used port 6543, contrary to the ticket's earlier report of port 5432. The provider's Connect dialog confirmed the complete transaction-pooler endpoint. An inspection-only build reported its endpoint and SHA-256 fingerprint without disclosing the secret; the fingerprint matched a locally reconstructed connection. That exact value is retained outside the repository in a Windows-user-protected DPAPI rollback file. `DATABASE_URL` was not changed.

TEST-006 had merged before rollout work began. Its skip-Netlify marker had left staging on the previous deployment. The serving deploy was locked before inspection or provider configuration changes. During inspection, the site's branch temporarily targeted `chore/dev-017`; returning the production branch to `develop` also scheduled an automatic build. The lock prevented those builds from replacing the serving site. The inspection-only failures and a canceled preliminary build were preparation steps, not application outages.

The final measured build targets the reviewed `develop` commit and contains neither the temporary IP capture route nor its middleware hook. After validation, that exact deploy was published manually. Its inherited publication lock was removed, the production branch and branch-deploy policy restored, and PR previews explicitly disabled again. [Published provider metadata](published.txt) records the resulting state. The final build's migration check passed without applying a migration.

## Workload and results

The Windows runner used Bun `1.3.14`. Existing staging data contained 5,005 profiles and 4,732 discoverable profiles. No existing profile was seeded, edited, copied, or deleted. Two synthetic accounts, a remembered-identity restriction, and an IP restriction were created solely for this ticket, then removed after public-hostname verification.

The first application traffic sent by this runner to the final immutable deployment was a batch of 60 concurrent requests. The four request types were `/en`, discovery results, discovery count, and an authenticated internal ban check, with fifteen of each. Two more batches of sixty followed, then twelve parallel requests and safety checks. Successful responses had to contain rendered profiles or valid JSON, the exact database-derived discoverable count, no unexpected ban, and `Cache-Control: no-store`. The public hostname was then tested with the same workload after publication; it is not an independent cold-start trial.

| Immutable deployment batch | Validated responses | p50 | p95 | Maximum |
| --- | --- | --- | --- | --- |
| First traffic, 60 | 60/60 | 11.31 s | 12.63 s | 13.41 s |
| Second burst, 60 | 60/60 | 2.81 s | 3.88 s | 6.03 s |
| Third burst, 60 | 60/60 | 2.65 s | 4.27 s | 4.80 s |
| Parallel check, 12 | 12/12 | 2.21 s | 3.13 s | 3.13 s |

| Published hostname batch | Validated responses | p50 | p95 | Maximum |
| --- | --- | --- | --- | --- |
| First public-hostname batch, 60 | 60/60 | 7.27 s | 11.71 s | 12.83 s |
| Second burst, 60 | 60/60 | 2.86 s | 4.84 s | 5.91 s |
| Third burst, 60 | 60/60 | 2.71 s | 4.14 s | 7.11 s |
| Parallel check, 12 | 12/12 | 2.03 s | 3.03 s | 3.03 s |

There were no unexpected 500/503 responses, client deadlines, or connection-exhaustion errors in either allowed workload. The sixteen-second client deadline includes network transfer and rendering; it is separate from the twelve-second middleware HTTP deadline and shorter database deadlines. These observations are not an SLA or a speed comparison with TEST-006's Linux runner and different database region.

[First-traffic evidence](first-traffic.txt) and [public-hostname evidence](live.txt) preserve individual request outcomes and observer samples. The `firstTraffic` field in the latter is the runner's first batch, not a claim that the already-tested deployment was cold again.

The first-traffic database observer sampled every 250 ms, peaking at 17 PostgreSQL backends, 12 active backends and 16 idle transactions. The final sample had zero idle transactions and monitoring reported no errors. These are sampled PostgreSQL backends, including Supabase services and the observer; they do not count Netlify instances, pooler clients, queue waiters, or brief peaks.

Chrome also rendered the public Japanese discovery route with the expected 4,732 count and existing profile cards after fixture cleanup. The screenshot is retained locally rather than publishing existing member data in this review.

## Safety and cleanup

Both targets passed anonymous access, allowed accounts, account bans, the banned page, remembered-identity bans, internal authentication, synthetic IP lookup, and spoofed forwarding headers. Netlify's existing banned-page rewrite renders the banned screen with HTTP 200 and no-store, while banned APIs return 403.

For the end-to-end IP check, temporary deployment `6ac3de8a383ccf07d64d7a20` exposed the middleware's normalized caller address behind the existing internal authentication token and staging-database guard. The runner held the address only in memory, inserted a ticket-owned restriction, verified API 403 and the banned page, removed that exact restriction in `finally`, and verified API recovery. The final deployment and the public hostname passed using this captured address. The probe route and middleware hook are absent from the final deployed commit and final PR diff. [Immutable IP evidence](trusted-ip.txt) and [public IP evidence](live-trusted-ip.txt) contain no addresses, identities, cookies, or authentication values.

The 23 relevant middleware, ban-route, and real-network redirect regression tests pass locally. Formatting/lint, i18n, and TypeScript checks pass. Disruptive outage and lock probes are confined to a disposable project; none were performed on staging. The deployed client and ban paths are the merged candidate previously validated by TEST-006, including checked-out-client errors and abort cleanup.

## Rollback

The disposable-site rollback drill is still pending while the original sandbox is paused by Supabase's account-wide free-project limit. A separately authorized test project has been created to complete that drill without taking staging or another app offline.

For staging, use the existing Netlify credentials and the REST API, keeping all secret values inside the shell process:

1. Lock the currently serving deployment with `POST /api/v1/deploys/{current_deploy_id}/lock` and record the site's build policy. Keep PR previews disabled.
2. Publish the previous deployment with `POST /api/v1/sites/694f7324-d2b5-43b5-9de4-ae33e0b927ee/deploys/6ac31de292ac5700090d0daa/restore`.
3. Restore the original production-context `DATABASE_URL` from the protected local DPAPI copy using `PATCH /api/v1/accounts/642a7f4c6bcf2c478a507d87/env/DATABASE_URL?site_id=694f7324-d2b5-43b5-9de4-ae33e0b927ee`. Preserve its existing secret designation and scopes. This rollout did not change the value; restoring it is required only if a later change has diverged. Keep the migration/session connection separate.
4. Check `/api/health`, discovery results and counts, rendered profiles, and bans on the public hostname. Do not migrate, reseed, pause, or lock tables in the staging database.
5. Keep a failed rollout locked until corrected. Once the desired deployment and matching provider configuration are healthy, explicitly unlock the serving deployment and verify `develop`, automatic builds, no branch deploys, and no PR previews.

Restoring a deployment changes the published code; changing an environment variable prepares subsequent builds and does not itself rebuild an existing deployment. Verify the deployment's own behavior rather than assuming a provider setting update rewrites an older function bundle. To roll forward, publish the final candidate `6ac3dfcd5e5acd1955f378e0` with the matching transaction-pooler value, then repeat the same checks.

## Reproduction

Use an external protected environment containing the existing staging `AUTH_SECRET`, the transaction `DATABASE_URL`, and a separate session `SESSION_DATABASE_URL`. Never print those values or load the disposable sandbox credentials into staging.

```powershell
bun --no-env-file experiments/staging-rollout/fixtures.mjs setup
bun --no-env-file experiments/database-burst/run-app.mjs <immutable-staging-origin> <evidence.json> --staging
bun --no-env-file experiments/staging-rollout/trusted-ip.mjs <staging-origin> <ip-evidence.json>
bun --no-env-file experiments/staging-rollout/fixtures.mjs cleanup
```

The trusted-IP runner requires `DEV017_IP_ORIGIN` to reference the temporary authenticated capture deployment identified above. That capture is for this validation only and is not installed on the serving deployment. Setup asserts that its named fixtures do not already exist; cleanup targets only those synthetic records. No secrets or visitor addresses belong in the evidence files.
