# Production Deployment

Production is a separate Netlify site and a separate Supabase project. It shares the package checks with staging but never its site, database, secrets or seed data. Releases come from the `main` branch, and only the owner deploys them, from a clean Linux checkout with their own credentials. GitHub never holds production credentials, so the release path works on GitHub Free with a private repository and keeps working when Actions minutes run out.

The production domain is `polycord.net` once the owner confirms its ownership. Until then, nothing points at it and staging keeps `polycord.chev.dev`.

## One-time setup

The owner does these steps. None of them is automated.

1. Point the confirmed domain at a new Netlify site on the same free team. Add `www.polycord.net` as a domain alias so Netlify redirects it to the apex domain, and wait until Netlify serves both over HTTPS.
2. On that Netlify site, stop builds (Site configuration, Build and deploy, Stop builds). Releases upload prepared packages, and the deploy fails while hosted builds are active.
3. Create a new Supabase project for production on the free plan. Local development, staging and tests must never point at it. Migrate it with `DATABASE_URL=<production direct URL> bunx drizzle-kit migrate` from a clean checkout of the release commit, after taking a [backup](readiness.md#backup) once it holds data.
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
| `POLYCORD_ENVIRONMENT`, `POLYCORD_SEED_ENABLED` | Leave unset |

6. Prepare the [owner deploy environment](../staging-deployment.md#owner-run-deployment) once. Production uses the same environment with its own values.

## Free plan limits

| Service | Limit that matters | What it means for releases |
| --- | --- | --- |
| Netlify legacy Free (team `The Chevvy Archives`, no payment method) | 100 GB bandwidth and 300 build minutes a month, hard limits, shared by every site on the team. Deploys are not metered. | Staging and production share the bandwidth, so heavy staging use can stop production serving until the month resets. Owner deploys use no build minutes. Never switch the team to a credit-based plan; see [Actions budget](actions-budget.md#publish-cadence). |
| Supabase Free | 2 active projects, 500 MB database, 5 GB egress. Projects pause after a week without activity. No automatic backups. | Staging and production use both free projects. Take the [manual backup](readiness.md#backup) before every migration and on a schedule. |

## Releasing a candidate

1. Choose a `develop` commit whose staging deploy is verified.
2. Point `main` at it with `git push origin <sha>:refs/heads/main`. While Actions minutes remain, the push runs the Tests workflow on `main`, whose `CI result` check becomes the release evidence.
3. Apply any pending migrations to the production database first, following [Migrations](readiness.md#migrations). The package build runs `scripts/check-migrations.ts` and fails if the database is behind.
4. In a codespace set up as in [owner-run deployment](../staging-deployment.md#owner-run-deployment), run:

```sh
git fetch origin && git switch --detach origin/main
export GITHUB_TOKEN="$POLYCORD_GITHUB_TOKEN" DATABASE_URL="$PRODUCTION_DATABASE_URL" \
  NETLIFY_PRODUCTION_SITE_ID=<site ID> POLYCORD_PRODUCTION_DOMAIN=polycord.net \
  NODE_OPTIONS=--max-old-space-size=8192
unset POLYCORD_GITHUB_TOKEN STAGING_DATABASE_URL PRODUCTION_DATABASE_URL
node scripts/deploy-production.mjs
```

`scripts/deploy-production.mjs` refuses to continue unless:

- it runs outside GitHub Actions on Linux with Node 22, from a clean checkout of the current `main` tip, the site is not the staging site, and the Netlify site's domain matches `POLYCORD_PRODUCTION_DOMAIN` with hosted builds stopped;
- the commit has a passing `CI result` check. Without one, it runs the full suite first (migrations, `check:all`, script tests, unit tests, browser tests and Storybook tests) against `TEST_DATABASE_URL`, a disposable database that must differ from `DATABASE_URL`, with the Netlify and GitHub tokens removed from the environment;
- `POLYCORD_PUBLIC_URL` and `DISCORD_REDIRECT_URI` use the production origin, `POLYCORD_ENVIRONMENT` and `POLYCORD_SEED_ENABLED` are unset, the Discord, VAPID, administrator and invite keys are present, and the database has no `seed_database` row.

It then builds offline, uploads with `--no-build`, and checks that the published server digest matches the package, the runtime is Node 22 and no hosted build ran. If a check fails after upload, it restores the previous deploy. The summary records the deploy ID, source commit, which validation it relied on, digest, origin, number of administrators, analytics setting and seed state, without secret values. Paste it into the release record.

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

Restore the previous deploy from the Netlify deploys list, or move `main` back to an earlier commit and run the owner deploy again. Only roll back to a build that works with the current database schema. See [Rollback](readiness.md#rollback).
