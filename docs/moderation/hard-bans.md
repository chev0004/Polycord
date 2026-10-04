# Hard Bans

How a ban denies access to Polycord, what it guarantees, and where it stops.

## What is enforced

A ban blocks two things independently. Each can be added and reversed without touching the other, and every IP change is written to the moderation audit trail with actor, reason, target and timestamp.

| Block | Keyed on | Effect |
|---|---|---|
| Account ban | The Discord identity (`users.banned_at` and the durable `moderation_restrictions` row) | Sign-in is rejected, existing sessions stop working, and every request carrying that identity gets the banned screen. Survives account deletion and recreation. |
| IP block | A normalized IPv4 or IPv6 address chosen by an owner | Every request from that address gets the banned screen, whether logged out, in a fresh browser, on another account, or from another device on the same network. |

Banning an account never blocks an IP automatically, and blocking an IP never marks any account as banned. Owners pick which observed addresses to block.

## Where it runs

`src/middleware.ts` runs on the Node.js runtime for every path except the Next.js build assets in `/_next/static`, `/favicon.ico` and `/polycord-wordmark.svg`, which the banned screen needs. A blocked request is answered before any page, API, media or metadata route runs:

- Page navigations receive the banned screen with status 403 and `Cache-Control: no-store`.
- APIs, `/_next/image`, `robots.txt`, `sitemap.xml`, service worker and other files receive a bare 403.
- `/api/health` and the Stripe webhook stay reachable, because they expose no browsing content and the webhook authenticates itself with its signature.

The banned screen is `src/app/banned/page.tsx` and follows the banned-user design in `ui_kits/web_app/Banned.html`. It renders only when the middleware supplied the ban details, so visiting `/banned` directly is a 404.

An identity ban is detected from the signed session cookie. A banned person who tries to sign in is turned away at the OAuth callback, which also sets a signed `polycord_banned` marker so the same browser keeps seeing the banned screen while signed out.

## Trusted client IP

`src/lib/clientIp.ts` reads exactly one header, `x-nf-client-connection-ip`, which Netlify sets at its edge and overwrites if a client sends it. `POLYCORD_CLIENT_IP_HEADER` overrides the header name for another proxy. `X-Forwarded-For` and `X-Real-IP` are never read, so a client cannot spoof an unblocked address or cause the proxy address to be recorded. The same helper feeds the rate limits.

Addresses are normalized before they are stored or compared: IPv6 is compressed and lower-cased, zone ids are dropped, and IPv4-mapped IPv6 collapses to IPv4.

This relies on the origin only being reachable through Netlify. If the site is ever served from another host, set the header name for that proxy before relying on IP blocks.

## IP retention

IP addresses are observed only at Discord sign-in and kept in `ip_observations` for 30 days, purged on each new sign-in write. Only owners can read them, and they are used solely to choose addresses to block. An account that never signs in again has no recent observation.

## Limits

- An IP identifies a network exit, not a person. A banned person on a new IP, a VPN, Tor, mobile data or another network is not recognised until that address is blocked.
- Another device on a blocked IP is blocked as well. Shared household, school, workplace and carrier addresses can lock out unrelated visitors, so owners must select addresses explicitly and revoke them when they stop being useful.
- An unsigned-in visitor on an unknown IP who has never held the banned account cannot be recognised.
- Content a visitor already downloaded cannot be erased.

The guarantee is denial of known banned identities and explicitly blocked IP addresses. VPN or proxy reputation checks and abuse challenges are possible follow-up work, not part of this change.
