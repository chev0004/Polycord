# Production Deployment

Production is a separate Netlify site and a separate Supabase project. It shares the package checks with staging but never its site, database, secrets or seed data. Releases come from the `prod` branch, and only the owner deploys them, from a clean Linux checkout with their own credentials. Owner credentials stay in the owner's Codespace secrets, outside GitHub Actions.

The production domain is `polycord.net` once the owner confirms its ownership. Until then, nothing points at it and staging keeps `polycord.chev.dev`.

## One-time setup

The owner does these steps. None of them is automated.

1. Point the confirmed domain at a new Netlify site on the same free team. Add `www.polycord.net` as a domain alias so Netlify redirects it to the apex domain. Verify HTTPS on both hosts before launch.
2. Keep the production Netlify site unlinked from Git. If a repository is linked, stop hosted builds in the project's build settings before deploying. The owner deploy uploads a prepared package.
3. Create a new Supabase project for production on the free plan. Local development, staging and tests must never point at it. Apply migrations from a clean checkout of the release commit using the production Session pooler URL in Codespaces. Take a [backup](readiness.md#backup) before migrating a database that holds data.
4. In the Discord developer portal, add `https://polycord.net/api/auth/discord/callback` as a redirect URI. This is part of the approved release setup, not before.
5. Set the production site's build variables in the Netlify **production** context:

| Key | Value |
| --- | --- |
| `AUTH_SECRET` | New random value, never the staging one |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | The Discord application's credentials |
| `DISCORD_REDIRECT_URI` | `https://polycord.net/api/auth/discord/callback` |
| `POLYCORD_PUBLIC_URL` | `https://polycord.net` |
| `POLYCORD_ADMIN_USER_IDS` | Current administrators only |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | A new key pair, never the staging pair |
| `VAPID_SUBJECT` | `https://polycord.net` |
| `NEXT_PUBLIC_DISCORD_INVITE_URL` | The Polycord Discord server invite |
| `POLYCORD_ANALYTICS_DISABLED` | `true` until the owner approves analytics in production |
| `NEXT_PUBLIC_DISCOVERY_SKELETON_ENABLED` | Same value as staging |
| `POLYCORD_DIRECT_BAN_CHECK` | `true`, as on staging, so the middleware checks bans in-process instead of calling `/api/internal/ban-check` |
| `POLYCORD_ENVIRONMENT`, `POLYCORD_SEED_ENABLED` | Leave unset |

6. In the Netlify site's **production** context, set `DATABASE_URL` to the approved production Supabase runtime connection URL and select **Contains secret values**. Use Netlify's allowed secret scopes, including **Functions**. Set `POLYCORD_PRODUCTION_SUPABASE_PROJECT_REF` to the approved project reference in the same context. The app checks that its database URL matches this reference before connecting.
7. Prepare the [owner deploy environment](../staging-deployment.md#owner-run-deployment). Set `POLYCORD_PRODUCTION_SUPABASE_PROJECT_REF` to the same project reference and provide a separate owner-side `DATABASE_URL` for the offline build. The deploy checks the local URL and the Netlify Functions project reference before building. Record the site ID and project reference and keep both connection URLs out of logs and evidence.

## Free plan limits

| Service | Limit that matters | What it means for releases |
| --- | --- | --- |
| Netlify legacy Free (team `The Chevvy Archives`, no payment method) | 100 GB bandwidth and 300 build minutes a month, hard limits, shared by every site on the team. Deploys are not metered. | Staging and production share the bandwidth, so heavy staging use can stop production serving until the month resets. Owner deploys use no build minutes. Never switch the team to a credit-based plan; see [Actions budget](actions-budget.md#publish-cadence). |
| Supabase Free | 2 active projects, 500 MB database, 5 GB egress. Projects pause after a week without activity. No automatic backups. | Staging and production use both free projects. Take the [manual backup](readiness.md#backup) before every migration and on a schedule. |

## Releasing a candidate

1. Choose a `develop` commit whose staging deploy is verified.
2. Point `prod` at it with `git push origin <sha>:refs/heads/prod`. While Actions minutes remain, the push runs the Tests workflow on `prod` and records `ci/release` once validation is confirmed.
3. Apply any pending migrations to the production database first, following [Migrations](readiness.md#migrations). The package build runs `scripts/check-migrations.ts` and fails if the database is behind.
4. In a codespace set up as in [owner-run deployment](../staging-deployment.md#owner-run-deployment), run:

```sh
git fetch origin && git switch --detach origin/prod
export GITHUB_TOKEN="$POLYCORD_GITHUB_TOKEN" DATABASE_URL="$PRODUCTION_DATABASE_URL" \
  NETLIFY_PRODUCTION_SITE_ID=<site ID> POLYCORD_PRODUCTION_DOMAIN=polycord.net \
  POLYCORD_PRODUCTION_SUPABASE_PROJECT_REF=<approved project ref> \
  NODE_OPTIONS=--max-old-space-size=8192
unset POLYCORD_GITHUB_TOKEN STAGING_DATABASE_URL PRODUCTION_DATABASE_URL
node scripts/deploy-production.mjs
```

`scripts/deploy-production.mjs` refuses to continue unless:

- it runs outside GitHub Actions on Linux with Node 22, from a clean checkout of the current `prod` tip. It requires the production site and domain and checks that hosted builds are stopped if Git is linked;
- validation is confirmed by matching `ci/release` evidence or by running the full suite (migrations, `check:all`, script tests, unit tests, browser tests and Storybook tests) against `TEST_DATABASE_URL`, a disposable database that must differ from `DATABASE_URL`, with the Netlify and GitHub tokens removed from the environment;
- `POLYCORD_PUBLIC_URL` and `DISCORD_REDIRECT_URI` use the production origin, `POLYCORD_ENVIRONMENT` and `POLYCORD_SEED_ENABLED` are unset, the Discord, VAPID, administrator and invite keys are present, and the database has no `seed_database` row.

It then builds offline, uploads with `--no-build`, and checks that the published server digest matches the package, the runtime is Node 22 and no hosted build ran. A database-backed health check runs against the new deploy permalink, where Netlify supplies the masked credential to the app. If a check fails after upload, the script reports the failure and restores the previous deploy when one exists. The summary records the deploy ID, source commit, validation, digest, origin, approved project reference, number of administrators, analytics setting and seed state. Paste it into the release record.

## Indexing

`POLYCORD_PUBLIC_URL` controls indexing at build time:

| | Staging and local (unset) | Production (`https://polycord.net`) |
| --- | --- | --- |
| `X-Robots-Tag` on pages, API routes and generated files | `noindex, nofollow` on every host, from `next.config.ts` | Sent on every host except `polycord.net`, so the `*.netlify.app` address stays out of search |
| `X-Robots-Tag` on static files (`/_next/static`, `public/`) | `noindex, nofollow`, from `netlify.toml` | Same. Netlify serves these without running Next.js, so `next.config.ts` headers never reach them, and pages decide what is indexed |
| `/robots.txt` | `Disallow: /` | Allows public pages. Disallows `/api/`, `/banned` and the signed-in or profile routes (`admin`, `analytics`, `inbox`, `onboarding`, `profile`, `saved`, `settings`, `u`, `user`) in both locales, and links the sitemap |
| `/sitemap.xml` | Empty | Discovery and legal pages in English and Japanese on `https://polycord.net`, with hreflang alternates |

Netlify also sends `X-Robots-Tag: noindex` on every deploy permalink (`<deploy ID>--<site>.netlify.app`). Public profiles stay disallowed until PROFILE-011 decides the profile indexing policy.

## Rollback

Restore the previous deploy from the Netlify deploys list, or move `prod` back to an earlier commit and run the owner deploy again. Only roll back to a build that works with the current database schema. See [Rollback](readiness.md#rollback).
