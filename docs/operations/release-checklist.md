# Public Release Checklist

Everything that must change between the current staging deployment and a public production site. Staging stays `noindex` permanently; indexing is only ever enabled on production.

## Environment

- [ ] Production has its own database, separate from the shared staging and local Supabase database. See [readiness](readiness.md).
- [ ] Production has its own `AUTH_SECRET`, VAPID keys and `VAPID_SUBJECT`.
- [ ] Discord allows the production callback `https://<domain>/api/auth/discord/callback`, and `DISCORD_REDIRECT_URI` is set to it.
- [ ] `POLYCORD_ADMIN_USER_IDS` lists only current administrators.
- [ ] Analytics stays disabled until the privacy policy covers it. LEGAL-002 decides.
- [ ] Stripe stays unset until BILLING-002 has test-mode lifecycle evidence.

## Domain and indexing

| Item | Staging (`polycord.chev.dev`) | Production |
| --- | --- | --- |
| `POLYCORD_PUBLIC_URL` | Unset | Production origin, e.g. `https://polycord.app` |
| `/robots.txt` | `Disallow: /` | Allows public routes, disallows `/api/` and signed-in routes, links the sitemap |
| `/sitemap.xml` | Empty | Discovery and legal pages in both locales, with hreflang alternates |
| `X-Robots-Tag` from `next.config.ts` | `noindex, nofollow` (host-matched) | Not sent (host does not match) |
| `X-Robots-Tag` from `netlify.toml` | `noindex, nofollow` | **Must be removed or scoped.** The header applies to every host built from this repository. |

- [ ] Set `POLYCORD_PUBLIC_URL` in the production build environment. `robots.txt` and `sitemap.xml` are generated at build time, so rebuild after changing it.
- [ ] Scope or remove the `netlify.toml` `X-Robots-Tag` header so production does not inherit it, and confirm staging still returns it.
- [ ] Confirm the production domain matches the contact addresses in the legal pages (`polycord.app`).
- [ ] Verify the domain with the search console of choice after launch.

## Page metadata

- [x] The root description is localized for English and Japanese.
- [ ] Route-specific titles for discovery, legal, saved, settings, profile and onboarding. Every route currently shares the title `Polycord`.
- [ ] Canonical and hreflang `<link>` tags on public routes. The sitemap carries alternates, but the pages do not.
- [ ] Open Graph and social preview images.
- [ ] Public profile metadata and whether profiles are indexable. Owned by PROFILE-011. `robots.txt` disallows `/<locale>/u` until then.

## Staging identification

- [ ] Decide whether staging shows a visible staging badge. No badge exists today; staging is only identified by its domain and `noindex` headers.

## Integrations

- [ ] Push notifications deliver on the production domain with its VAPID subject.
- [ ] Discord login, logout and session expiry complete on the production domain.
- [ ] `/api/health` is polled by the chosen uptime monitor, and a test alert reaches its recipient. See [readiness](readiness.md).

## Launch gates

- [ ] Every Blocking row in [readiness](readiness.md) is resolved.
- [ ] LEGAL-002 and TEST-002 have no open acceptance blockers.
