# Security report

Ticket: SAFETY-011. Review date: 4 November 2026. Base commit: `4b7b0b6` on `develop`.

This report covers an end-to-end review of Polycord's authentication, authorization, database exposure, input handling, rate limits, dependencies and deployment configuration. Each confirmed weakness was reproduced with synthetic users on disposable local databases, fixed, covered by a regression test, and re-verified. Database specifics are in [DATABASE_SECURITY.md](DATABASE_SECURITY.md).

## Summary

| ID | Finding | Severity | Status |
| --- | --- | --- | --- |
| SEC-01 | RLS disabled on 19 of 22 tables; any holder of the Supabase anon key could make themselves a moderator | High | Fixed |
| SEC-02 | `next` 15.5.25 inside the range of a critical image optimizer RCE and a high Server Actions DoS advisory | High (advisory: Critical) | Fixed |
| SEC-03 | `zod` 4.1.12 allocates one issue per array element; one signed-in request can use close to 1 GB | Medium | Fixed |
| SEC-04 | Moderators can dismiss reports filed against themselves, other moderators and owners | Medium | Fixed |
| SEC-05 | Mutating API routes accept cross-origin requests; only `SameSite=Lax` protects them | Medium | Fixed |
| SEC-06 | Pages can be framed (clickjacking); `x-powered-by` discloses the framework | Low | Fixed |
| SEC-07 | Session cookie carries the account email in readable base64 | Low | Fixed |
| SEC-08 | Cookie signing falls back to the Discord client secret when `AUTH_SECRET` is unset | Low | Fixed |
| SEC-09 | Anonymous analytics endpoint accepts unlimited database writes | Low | Fixed |
| SEC-10 | `docs/moderation/hard-bans.md` says `X-Forwarded-For` is never read; the code reads its last hop as a fallback | Info | Fixed |

The central question of the brief, whether an ordinary user could become a moderator, has two answers. Through application code: no path was found (see the threat model). Through the database: yes, under Supabase's default grants, by anyone holding the project's anon key (SEC-01). That path is now closed and covered by a test that simulates the worst-case grants.

## Method and constraints

- Read every API route handler, the middleware, the auth, admin, moderation, rate limit and database modules, the Drizzle schema and all 39 migrations, the deployment workflow, Netlify and Next.js configuration, and the experiments directory.
- Built and ran the production app locally (`next build` and `next start`) against a disposable Postgres 16 database, with the same environment as the Playwright configuration and fake Discord credentials.
- Recreated Supabase's `anon` and `authenticated` roles and default privileges on a second disposable database to reproduce the Data API exposure.
- Staging contact was limited to one read-only `GET https://polycord.chev.dev/en` (to read response headers) and one unauthenticated `GET` of each Supabase API root (to confirm they answer). No credentials were sent, no data was read or written, and nothing was load tested.
- The live Supabase catalog could not be queried: outbound Postgres connections are blocked in the review environment. Every statement about live RLS state is therefore inferred from migrations and marked as unverified.
- `bun audit` was run for the full and production dependency trees.
- No Discord, Stripe or push service endpoints were called.

## Architecture

| Layer | Implementation |
| --- | --- |
| Hosting | Netlify (`@netlify/plugin-nextjs`), deployed from GitHub Actions to `polycord.chev.dev` |
| App | Next.js 15 App Router; route handlers under `src/app/api`; Node.js middleware |
| Identity | Discord OAuth (`identify email`), state nonce in a signed 10 minute cookie |
| Sessions | Stateless HMAC-SHA256 signed cookie (`polycord_session`, HttpOnly, SameSite=Lax, Secure in production, 30 days) bound to the account UUID; every request re-reads the account and its bans |
| Roles | Owner: Discord IDs in `POLYCORD_ADMIN_USER_IDS`. Moderator: a row in `staff_roles`. Member: everyone else |
| Data | Supabase Postgres via the session pooler, connected as the table owner through Drizzle |
| Payments | Stripe Checkout and Billing Portal; signed webhook that re-fetches the subscription |
| Media | Voice intros validated with `ffprobe`, stored as base64 in Postgres |
| Push | `web-push` to an allowlist of push service hosts |

## Threat model

### Assets

Moderator and owner powers; account PII (email, Discord identity, IP observations); report contents and reporter identities; private profiles and voice intros; ban and suspension state; Supporter entitlements; push subscriptions; the integrity of the moderation audit log.

### Actors

| Actor | Starting capability |
| --- | --- |
| Unauthenticated visitor | Public pages and APIs, anonymous copy, view and share events |
| Ordinary member | A valid session for their own account |
| Suspended or banned member | A session that the server must refuse |
| Moderator | Staff UI and moderation API for members |
| Owner | Everything, including staff and Supporter grants and IP bans |
| Holder of the Supabase anon key | Direct PostgREST and GraphQL access as `anon` |
| Page on a sibling `*.chev.dev` host | Same-site requests that carry `SameSite=Lax` cookies |
| Third-party page | Cross-site requests and framing |

### Trust boundaries and entry points

1. Browser to Next.js: 41 API route modules, the pages and the middleware. Each route derives the acting account from the signed session and re-checks it against the database.
2. Discord to OAuth callback: code exchange server-side; state compared against the signed cookie.
3. Stripe to webhook: HMAC signature with 5 minute tolerance, then a server-side fetch of the subscription.
4. Middleware to the internal ban check: static bearer token derived from `AUTH_SECRET`.
5. App to Postgres: owner role, parameterized queries.
6. Internet to Supabase Data API: protected only by table privileges and RLS (SEC-01).

### Paths from member to moderator

| Path | Result |
| --- | --- |
| Forge or alter a session cookie | Blocked. HMAC-SHA256 with constant-time comparison; the payload is bound to the account UUID and re-checked against `users` |
| Claim an owner Discord ID | Blocked. The Discord ID comes from Discord's `/users/@me` after a server-side code exchange |
| Call `POST /api/admin/staff` | Blocked. `authorizeOwner` returns 404 to members and 403 to moderators (regression test) |
| Swap `userId` in moderation, premium or IP ban requests | Blocked. Role is computed from the session, never from the body |
| Delete and recreate the account | No effect. `staff_roles` cascades on account deletion |
| Seed route | Staff only, environment gated, never writes `staff_roles` |
| Supabase Data API insert into `staff_roles` | **Possible before this change** (SEC-01). Blocked now |

### Paths across other boundaries

| Path | Result |
| --- | --- |
| Moderator suppresses reports about themselves or other staff | Possible before this change (SEC-04). Blocked now |
| Moderator bans or acts on staff | Blocked. Ban is owner only with 12 hour reauth; staff targets are protected |
| Banned or suspended user keeps using a session | Blocked. `getActiveUser` and the ban gate re-read restrictions on each request |
| Read another user's inbox, saved list, blocks, settings or export | Blocked. Every query filters by the session's account ID |
| Read a private, hidden or blocked profile or voice intro | Blocked. `publiclyVisible()` plus two-way block checks |
| Sibling subdomain forges a JSON POST with the victim's cookies | Possible before this change (SEC-05). Blocked now |
| Spoof an IP to dodge IP bans or rate limits | Blocked on Netlify; the IP comes from the function context or `x-nf-client-connection-ip` |

## Findings

### SEC-01: RLS disabled on 19 of 22 tables (High, fixed)

**Where:** `src/db/schema.ts`, migrations `0000` to `0038`.

**Issue:** Only `users`, `profiles` and `profile_target_languages` had RLS enabled. Supabase grants `anon` and `authenticated` full access to new `public` tables by default and serves them through PostgREST and GraphQL, which answer on the project. With the anon key, `POST /rest/v1/staff_roles {"user_id": "<own account id>"}` creates a moderator. The same access exposes IP observations, reports, push keys and ban tables.

**Reproduction:** On a disposable database with Supabase's roles and default privileges, `set role authenticated; insert into staff_roles ...` succeeded and returned `role = moderator`. Full transcript in DATABASE_SECURITY.md.

**Fix:** `.enableRLS()` on all 22 tables and migration `0039_enable_row_level_security` (RLS everywhere, revoke API role privileges and default privileges where those roles exist).

**Verification:** Re-running the reproduction returns `permission denied` for every table. `tests/integration/security-database.mjs` grants the API roles `ALL` inside a rolled-back transaction and proves every table reads empty and writes are rejected.

**Unverified:** whether the anon key was ever shared and whether any row was written through the Data API before the fix. DATABASE_SECURITY.md lists queries that check `staff_roles` against the moderation log.

### SEC-02: Next.js inside a critical advisory range (High, fixed)

**Where:** `package.json` pinned `next` to `15.5.25`.

**Issue:** `bun audit --prod` reported GHSA-2464-fhr4-w9xw (unauthenticated RCE in the image optimizer with SVG, `<= 15.5.27`, critical), GHSA-p3m5-59mp-jv5r (Server Actions DoS, high) and two moderate cache poisoning advisories.

**Exposure:** Not exploited or reproduced. The app has no Server Actions and does not set `dangerouslyAllowSVG`, and Netlify normally routes `/_next/image` to its own image CDN, but none of that removes the vulnerable code from the deployed server bundle.

**Fix:** `next` 15.5.29. `bun audit --prod` no longer reports `next`.

### SEC-03: Memory exhaustion through oversized arrays (Medium, fixed)

**Where:** `zod` 4.1.12, used by every request schema. GHSA-mrhx-c7xc-m3w5.

**Issue:** Zod validated every element of an array before applying `.max()`, producing one issue object per bad element. `POST /api/profile` also returns all issues to the client.

**Reproduction:** `profileSchema.safeParse` with a 2 MB body of 1,000,000 numeric tags produced 1,000,001 issues in 1.8 s and grew the process by about 880 MB. Any signed-in member can send this. With 4.6.7 the same input produces 1 issue in 26 ms with 24 MB growth.

**Fix:** `zod` 4.6.7. Zod 4.6 narrows `.refine()` output types for type guards, so `languageCodeField` now passes a plain boolean callback to keep the existing `string` type.

**Test:** `tests/security.test.js` asserts 200,000-element bodies fail with fewer than 5 issues for the profile and moderation schemas.

### SEC-04: Moderators can dismiss reports against staff (Medium, fixed)

**Where:** `src/app/api/admin/moderation/route.ts`.

**Issue:** The target protection check (`self`, or `canModerate` false) skipped `dismiss`. A moderator could close every pending report against themselves, other moderators and owners, so owners would never see them. The admin UI deliberately offered "Dismiss report" on protected accounts.

**Reproduction:** On unmodified `develop`, the new route-level test received `200` for a moderator dismissing a report against themselves.

**Fix:** `canDismissReports` in `src/features/Admin/permissions.ts`: owners may dismiss any report; moderators only for accounts they may action. The route, the desktop action bar, the mobile case footer and the mobile swipe-to-dismiss use it. Other actions keep the existing `protectionOf` rule.

**Tests:** `tests/admin-permissions.test.js` (rule matrix) and `tests/integration/security-moderation.mjs` (route handlers with synthetic owner, moderators and member; also checks members get 404 and moderators 403 on staff and Supporter grants).

### SEC-05: No origin check on mutating API routes (Medium, fixed)

**Where:** `src/middleware.ts`; only owner routes checked `Origin`.

**Issue:** Route handlers parse JSON regardless of `Content-Type`, so a `text/plain` form POST is a simple request that the browser sends without preflight. `SameSite=Lax` stops this from third-party sites, but not from another host on `chev.dev`, which is the same site. A page there could rewrite a victim's profile, change their account email, register a push subscription to their account, file reports or create blocks.

**Fix:** The middleware rejects `POST`, `PUT`, `PATCH` and `DELETE` requests to `/api/*` with `403` when an `Origin` header is present and its host differs from `Host` (including `Origin: null`). Requests without `Origin` (Stripe, the internal ban check, server-side tools) are unaffected because they cannot carry a victim's browser cookies. `isSameOrigin` moved to `src/lib/sameOrigin.ts` so the middleware and owner routes share it.

**Tests:** `tests/security.test.js` covers four methods from a foreign site, a sibling subdomain and a `null` origin, plus same-origin, origin-less and cross-origin `GET` requests. The existing Playwright journeys that post from the app's own origin continue to pass.

### SEC-06: Clickjacking and framework disclosure (Low, fixed)

**Where:** `next.config.ts`.

**Issue:** Staging responds without `X-Frame-Options` or `frame-ancestors` (checked with one `GET`), so a third-party page can frame signed-in pages such as the admin console and Settings. It also sends `x-powered-by: Next.js`. Netlify already adds HSTS and `nosniff`.

**Fix:** `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`, `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin` on every path, and `poweredByHeader: false`. A full content security policy was not added; it needs nonce support for the inline discovery bootstrap and load trace scripts.

**Verification:** `tests/security.test.js` checks the configuration, and the headers were confirmed with `curl` against the local production build on a page and an API route. Staging must be re-checked after deployment.

### SEC-07: Email in the session cookie (Low, fixed)

**Where:** `src/lib/auth-session.ts`.

**Issue:** The cookie payload is signed, not encrypted, and included the Discord email. The server already reloads the email from the database for every request, so the copy was unused and leaked PII to anything that logs cookies.

**Fix:** `createSessionCookieValue` drops `email`. Existing cookies keep working; their email field is ignored.

### SEC-08: Signing secret fallback (Low, fixed)

**Where:** `getAuthSecret` in `src/lib/auth-session.ts`.

**Issue:** Without `AUTH_SECRET`, session, OAuth state, ban marker and ban-check tokens were signed with `DISCORD_CLIENT_SECRET`, a credential shared with Discord and held in more places.

**Fix:** Only `AUTH_SECRET` is used. Without it no session is issued or accepted (fail closed). Staging already sets `AUTH_SECRET`; `scripts/deploy-staging.mjs` asserts it.

### SEC-09: Unthrottled analytics writes (Low, fixed)

**Where:** `src/app/api/analytics/route.ts`.

**Issue:** Anyone could insert an `analytics_events` row per request with no limit, growing the table and skewing product metrics.

**Fix:** A per-account or per-IP limit of 300 events per hour (override with `POLYCORD_RATE_LIMIT_ANALYTICS`). Over the limit the request still returns `204` and nothing is stored. It uses the new `withinRateLimit`, which does not write a `suspicious_activity` row for each rejection, so throttled traffic costs one counter update.

**Test:** `tests/integration/security-analytics.mjs` sends six events with a limit of three and asserts three rows, a counter of six and no suspicious activity rows.

### SEC-10: Trusted IP documentation (Info, fixed)

`docs/moderation/hard-bans.md` now describes the real order: Netlify context IP, `x-nf-client-connection-ip`, then the last `X-Forwarded-For` hop.

## Observations not changed

| ID | Observation | Risk | Recommendation |
| --- | --- | --- | --- |
| OBS-01 | The middleware calls `/api/internal/ban-check` on the request's own origin with a static token (`HMAC(AUTH_SECRET, "ban-check")`). A forged `Host` or `X-Forwarded-Host` did not change the target under `next start` (no callback reached a local listener). Netlify edge behaviour was not tested | Low, unconfirmed | Sign each ban-check body with a timestamp instead of a static token, or set `POLYCORD_DIRECT_BAN_CHECK=true` |
| OBS-02 | Sessions are stateless for 30 days. Logout clears only the current browser; a copied cookie stays valid until expiry or account deletion. Bans, suspensions and account deletion take effect immediately, and owner actions need a session under 12 hours old | Low | Add a per-account session version to support "sign out everywhere" |
| OBS-03 | Logout is a `GET`, so another site can sign a user out | Low | Move logout to `POST` |
| OBS-04 | `enforceRateLimit` inserts a `suspicious_activity` row for every rejected request | Low | Log the first rejection per window |
| OBS-05 | next-intl 4.3.12 is in range of GHSA-8f24-v5vv-gm5j (open redirect). It requires `localePrefix: 'as-needed'`; Polycord uses the default `always`. Probes with `//host`, `/\host`, encoded slashes and control characters produced only same-origin redirects | None found | Upgrade to 4.9.1 or later with the next dependency refresh |
| OBS-06 | Remaining production-tree advisories: `ajv`, `fast-uri`, `js-yaml` (commitlint), `yaml` (lint-staged), `postcss`, `nanoid`, `source-map-js` (bundled by Next at build time), `sharp` (optional image optimizer), `bn.js` (via `web-push`, parses only server-owned VAPID keys), `picomatch`. 128 advisories across the full tree before this change, mostly Storybook, webpack and Netlify CLI tooling | Low | Move commitlint, husky and lint-staged to `devDependencies`; run `bun audit fix` in a separate tooling ticket |
| OBS-07 | `experiments/database-burst/netlify/functions/driver-probe.mjs` authorizes `Bearer undefined` if `AUTH_SECRET` is unset. Its build only runs on the sandbox site (`SITE_ID` is asserted) | Low, conditional | Reject when `AUTH_SECRET` is unset |
| OBS-08 | Registering a push endpoint that another account already owns moves it to the new account. The endpoint is a browser secret that Polycord never shows to others | Low | Ignore conflicts from a different account |
| OBS-09 | `GET /api/admin/ip-bans?userId=` and `GET /api/voice?ids=` pass unvalidated strings to UUID columns; malformed values return `500` for owners only, or are filtered first for voice | Info | Validate as UUID |
| OBS-10 | The account email in Settings is not verified. It is only used to prefill Stripe Checkout | Info | Verify before using email for anything else |

## Controls confirmed sound

- Session and state cookies: HMAC-SHA256 via Web Crypto, constant-time comparison, expiry enforced, account binding re-checked against the database on each request.
- OAuth: state nonce from 24 random bytes, bound to an HttpOnly cookie, compared before the code exchange; `next` limited to same-origin locale paths; failure path rate limited per IP.
- Authorization: every member route derives the account from the session; every inbox, saved, block, push, settings, profile, voice and export query filters by that account ID. Staff routes return 404 to non-staff; owner routes add a same-origin check and a 12 hour reauthentication window.
- Injection: all application SQL goes through Drizzle parameters; the one string-built query (`banLookup.ts`) escapes validated IPs and signed Discord IDs with `escapeLiteral`. Search input is `LIKE`-escaped. No `dangerouslySetInnerHTML`; inline JSON escapes `<`; profile colours are validated hex; return links are restricted to known in-app paths.
- SSRF: push delivery is limited to four push service hosts over HTTPS on port 443; Stripe and Discord URLs are constants; `ffprobe` runs with `-protocol_whitelist file`.
- Uploads: 1 MB voice limit, 20 s duration, a single audio stream, MIME type taken from the decoded container rather than the client.
- Webhooks: Stripe signature with timestamp tolerance and timing-safe comparison; subscription state is re-fetched from Stripe rather than trusted from the payload.
- Rate limits: atomic upsert counters for reports, copies, views, shares, bumps, notifications and OAuth failures; IP from the Netlify context.
- Bans: enforced in middleware and in gated routes for identities and IPs, including the OAuth callback.
- Secrets: no credentials in the tree or git history (pattern scan for Stripe, AWS, Notion, private keys, Supabase URLs with passwords); `.env*` ignored apart from `.env.example`; CI masks staging variables.
- CI: the staging deploy job runs with `contents: read` and only for `develop` pushes in this repository.

## Tested and untested areas

| Area | Tested |
| --- | --- |
| RLS and API role privileges | Yes, disposable database with simulated Supabase roles |
| Moderator and owner boundaries on moderation, staff and Supporter routes | Yes, route handlers with synthetic sessions |
| Cross-origin write rejection | Yes, middleware unit tests and existing Playwright journeys |
| Security headers | Yes, configuration test and local production build |
| Session cookie contents and secret handling | Yes, unit tests |
| Oversized request bodies | Yes, schema tests and a before and after measurement |
| Analytics throttling | Yes, route handler test |
| Full regression suite | Yes, see verification below |
| Live Supabase catalog, grants, Storage buckets and policies | **No.** Postgres port unreachable from the review environment |
| Whether the Supabase anon key was ever distributed or used | **No** |
| Netlify edge handling of forged `Host` and `X-Forwarded-Host` | **No** |
| Headers on staging after deployment | **No**, deploy pending |
| Real Discord OAuth, Stripe and push providers | **No**, mocked only |
| Image optimizer exploitability (SEC-02) | **No**, patched by upgrade without reproduction |
| Load and concurrency beyond the existing atomic counters | **No**, flooding was out of bounds |

## Verification

Run on the `fix/safety-011` branch against a disposable localhost Postgres 16 database:

- `bun run check:all`: Biome, i18n and TypeScript pass.
- `bun test` with `TEST_DATABASE_URL`: 278 tests pass, 0 fail.
- `bun run test:security`: 26 tests pass. The same new tests run on unmodified `develop` (with its own lockfile) fail for each finding: cross-origin writes return 200, headers are missing, the cookie contains email, the Discord secret signs sessions, the schemas return 200,001 issues, 19 tables lack RLS, moderators dismiss staff reports with 200, and analytics stores 6 of 6 events.
- `bun run test:e2e` against the production build: 175 passed, 4 skipped, 0 failed.
- `bun run build-storybook` and `bun run test:storybook`: 599 play functions passed, including the updated TakeActionPanel stories that assert who sees the dismiss control.
- The admin console in the production build, driven as synthetic accounts: a moderator sees no dismiss control on another moderator's case at 1280 px or 390 px but does on a member's case, and an owner sees it on both.
- `curl` against the production build: the four security headers are present on a page, an API route and a 404, `x-powered-by` is absent, a cross-origin `POST /api/settings` returns 403 and a same-origin `PATCH` returns 200.

## Running the security tests

```bash
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/polycord_test bun run test:security
```

The database must be a disposable localhost database with all migrations applied. Never point `TEST_DATABASE_URL` at the shared Supabase database.

## Deployment steps

1. Apply migration `0039_enable_row_level_security` with `bun run db:migrate`. The Netlify build refuses to deploy until it is applied.
2. Run the verification queries in DATABASE_SECURITY.md and confirm every `staff_roles` row has a matching `grant` log entry.
3. After the deploy, confirm `X-Frame-Options: DENY` and `frame-ancestors 'none'` on `https://polycord.chev.dev/en` and that `x-powered-by` is gone.
4. If the anon key has ever been shared outside Supabase, rotate it in the Supabase dashboard. The app does not use it, so rotation has no application impact.
