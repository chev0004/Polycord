# Production Deployment

Production is a separate Netlify site and a separate database. It shares the package checks with staging but never its site, database, secrets or seed data. Releases come from the `main` branch and only deploy when someone runs the Production workflow by hand.

## One-time setup

The owner does these steps. None of them is automated.

1. Confirm ownership of `polycord.net` and point it at a new Netlify site. Add `www.polycord.net` as a domain alias so Netlify redirects it to the apex domain, and wait until Netlify serves both over HTTPS.
2. On that Netlify site, stop builds (Site configuration, Build and deploy, Stop builds). The workflow uploads prepared packages, and the deploy fails while hosted builds are active.
3. Create an isolated Postgres database for production. Local development, staging and tests must never point at it. Migrate it with `DATABASE_URL=<production direct URL> bunx drizzle-kit migrate` from a clean checkout of the release commit, after taking a [backup](readiness.md#backup) once it holds data.
4. In the Discord developer portal, add `https://polycord.net/api/auth/discord/callback` as a redirect URI.
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

6. In GitHub, create an environment named `production` restricted to the `main` branch. Store `NETLIFY_AUTH_TOKEN` and `DATABASE_URL` (the production database) as environment secrets. Add repository variables `NETLIFY_PRODUCTION_SITE_ID`, `POLYCORD_PRODUCTION_DOMAIN=polycord.net` and, when ready, `NETLIFY_PRODUCTION_DEPLOY_ENABLED=true`. Environment secrets in a private repository need GitHub Pro or higher; see [Actions budget](actions-budget.md).

## Releasing a candidate

1. Choose a `develop` commit whose Tests run passed and whose staging deploy is verified.
2. Point `main` at it (`git push origin <sha>:refs/heads/main`). The push runs the Tests workflow on `main`.
3. Apply any pending migrations to the production database first, following [Migrations](readiness.md#migrations). The package build runs `scripts/check-migrations.ts` and fails if the database is behind.
4. Run **Actions > Production > Run workflow** on `main`.

`scripts/deploy-production.mjs` then refuses to continue unless:

- the run is a manual run on `main` in `chev0004/Polycord`, the site is not the staging site, and the Netlify site's domain matches `POLYCORD_PRODUCTION_DOMAIN` with hosted builds stopped;
- the commit has a passing `CI result` check, and `main` has no newer deployable changes;
- `POLYCORD_PUBLIC_URL` and `DISCORD_REDIRECT_URI` use the production origin, `POLYCORD_ENVIRONMENT` and `POLYCORD_SEED_ENABLED` are unset, the Discord, VAPID, administrator and invite keys are present, and the database has no `seed_database` row.

It then builds offline, uploads with `--no-build`, and checks that the published server digest matches the package, the runtime is Node 22 and no hosted build ran. If a check fails after upload, it restores the previous deploy. The job summary records the deploy ID, source commit, digest, origin, number of administrators, analytics setting and seed state, without secret values.

## Indexing

`POLYCORD_PUBLIC_URL` controls indexing at build time:

| | Staging and local (unset) | Production (`https://polycord.net`) |
| --- | --- | --- |
| `X-Robots-Tag` | `noindex, nofollow` on every response | Sent on every host except `polycord.net`, so the `*.netlify.app` address stays out of search |
| `/robots.txt` | `Disallow: /` | Allows public pages. Disallows `/api/`, `/banned` and the signed-in or profile routes (`admin`, `analytics`, `inbox`, `onboarding`, `profile`, `saved`, `settings`, `u`, `user`) in both locales, and links the sitemap |
| `/sitemap.xml` | Empty | Discovery and legal pages in English and Japanese on `https://polycord.net`, with hreflang alternates |

Public profiles stay disallowed until PROFILE-011 decides the profile indexing policy.

## Rollback

Restore the previous deploy from the Netlify deploys list, or rerun the workflow on an earlier `main` commit after moving `main` back to it. Only roll back to a build that works with the current database schema. See [Rollback](readiness.md#rollback).
