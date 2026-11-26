# Public Release Checklist

Everything that must change between the current staging deployment and a public production site. Staging stays `noindex` permanently; indexing is only ever enabled on production. Setup and the deploy procedure are in [production deployment](production.md).

## Environment

- [x] Production has its own database, separate from the shared staging and local Supabase database. See [readiness](readiness.md).
- [x] Production has its own `AUTH_SECRET`, VAPID keys and `VAPID_SUBJECT`.
- [x] Discord allows the production callback `https://<domain>/api/auth/discord/callback`, and `DISCORD_REDIRECT_URI` is set to it.
- [x] `POLYCORD_ADMIN_USER_IDS` lists only current administrators. Since 2026-11-26 it holds the owner's main account alone.
- [x] Analytics stays disabled until the privacy policy covers it. LEGAL-002 decides.
- [x] `POLYCORD_SEED_ENABLED` and `POLYCORD_ENVIRONMENT` are unset, and the production database has no `seed_database` row. See [dummy profiles](dummy-profiles.md).

## Domain and indexing

| Item | Staging (`polycord.chev.dev`) | Production |
| --- | --- | --- |
| `POLYCORD_PUBLIC_URL` | Unset | `https://polycord.net` |
| `/robots.txt` | `Disallow: /` | Allows public routes, disallows `/api/`, `/banned`, profile routes and signed-in routes including the inbox, links the sitemap |
| `/sitemap.xml` | Empty | Discovery and legal pages in both locales, with hreflang alternates |
| `X-Robots-Tag` on pages, from `next.config.ts` | `noindex, nofollow` on every host | Sent on every host except the `POLYCORD_PUBLIC_URL` host |
| `X-Robots-Tag` on static files, from `netlify.toml` | `noindex, nofollow` | `noindex, nofollow` |

- [x] Set `POLYCORD_PUBLIC_URL` in the production build environment. `robots.txt` and `sitemap.xml` are generated at build time, so rebuild after changing it. Every production deploy checks it matches the production origin.
- [x] Scope the page `X-Robots-Tag` header by environment in `next.config.ts`, based on `POLYCORD_PUBLIC_URL`. `netlify.toml` keeps it on static files, which never pass through Next.js.
- [x] After the first staging deploy with this change, confirm `X-Robots-Tag` on pages and static files on `polycord.chev.dev`, `polycord-staging.netlify.app` and a deploy permalink. Confirmed on 2026-11-26, along with `noindex` on a production deploy permalink and none on `polycord.net` pages.
- [x] Confirm `polycord.net` and `www.polycord.net` serve HTTPS and `www` redirects to the apex domain.
- [ ] Verify the domain with the search console of choice after launch.

## Page metadata

- [x] The root description is localized for English and Japanese.
- [x] Route-specific titles for discovery, legal, saved, settings, profile and onboarding. Pages read `Polycord | <page>` and profiles `Polycord | <name>`; Discovery keeps `Polycord`.
- [ ] Canonical and hreflang `<link>` tags on public routes. The sitemap carries alternates, but the pages do not.
- [ ] Open Graph and social preview images.
- [ ] Public profile metadata and whether profiles are indexable. Owned by PROFILE-011. `robots.txt` disallows `/<locale>/u` until then.

## Staging identification

- [x] Decide whether staging shows a visible staging badge. Decided on 2026-11-25: no badge for now. Staging is identified by its domain and `noindex` headers.

## Integrations

- [x] Push notifications deliver on the production domain with its VAPID subject.
- [ ] Discord login, logout and session expiry complete on the production domain.
- [x] The [post-deploy checks](monitoring.md#post-deploy-checks) pass on the launch candidate, and the assigned responder receives the [pre-launch test alert](monitoring.md#uptime-monitoring-and-pre-launch-test-alert).

## Launch gates

- [x] Every Blocking row in [readiness](readiness.md) is resolved. The last one, the support contact, was resolved on 2026-11-26.
- [ ] LEGAL-002 and TEST-002 have no open acceptance blockers.
