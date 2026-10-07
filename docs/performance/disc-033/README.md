# DISC-033 discovery startup

DISC-031 and the DISC-032 owner trace showed a signed-in staging load of 8.5 seconds: a gated locale redirect, four ban lookups, a new database connection for every query, and two API requests that each repeated the account lookup and started only after hydration.

## Changes

- The bare `/` redirect is answered by the discovery edge function from the saved locale or `Accept-Language`, without a ban lookup. Banned visitors are still refused at the locale document.
- A ban lookup is one multi-statement round trip with the same 2.5 second server statement timeout. The client query timeout is 2.75 seconds so the server cancels first and the connection closes cleanly.
- Database access inside a request shares a request-scoped pool of three connections, two of them opened in parallel with the first query. The global pool keeps its one-use Lambda recycling for every other route.
- The account and its moderation restriction are read together.
- `/api/discovery/bootstrap` returns the viewer and the first page from one request. It enforces IP bans, remembered-ban cookies and banned or suspended accounts itself, so it skips the middleware ban gate. `/api/discovery/viewer` is removed.
- The page requests the bootstrap from `DiscoveryPage` on first load and reports the viewer to the shell. A failed first load shows the existing feed error with its retry.
- The served document starts the default `/en` or `/ja` bootstrap request before hydration, and the page reuses it. Other URLs, and a failed or mismatched early request, fall back to a normal request.
- The grid chunk is preloaded while the request is in flight.

## Measurement

Production builds of `develop` at `fa8ec193` and this branch, Node 26.1.0, Next.js 15.5.25, Chromium 149.0.7827.55 on Windows, PostgreSQL 17 with 40 public profiles, anonymous and signed-in sessions, a fresh browser context per load, 4 loads per cell after one warm-up. `AWS_LAMBDA_FUNCTION_NAME` was set so the baseline recycles connections as it does on Netlify, and the direct ban transport was used for both.

A local proxy added 40 ms in each direction to every database packet and 500 ms to each new connection. These values are an assumption chosen to resemble the 0.7 second connection and 80 ms query round trip in DISC-031, not a measurement of Supabase. Both builds were served by `next start`, so the Netlify edge document, its `/` redirect and the injected early request were not exercised except where noted.

| Time to first card, median of 4 | Guest | Signed in |
| --- | ---: | ---: |
| `develop` | 4.68 s | 12.05 s |
| This branch | 2.84 s | 2.85 s |
| This branch, early request injected into the document | 2.26 s | 2.80 s |

Loads were consistent: guest 4.64 to 5.10 s before and 2.82 to 2.85 s after; signed in 12.01 to 12.54 s before and 2.76 to 2.89 s after.

The signed-in baseline was dominated by serial single-use connections. After the change a signed-in bootstrap has one connection wave and seven serial query stages of about 100 ms each under the emulated latency: identity, profile, profile languages, tags with settings and staff role, ids with count, rows, then row languages with saved profiles.

## Not measured

- Netlify staging. The edge `/` redirect, the injected request on the real document, cold functions and the real pooler have not been run. Compare the DISC-032 owner trace before and after deploying.
- The direct ban transport is selected by `POLYCORD_DIRECT_BAN_CHECK=true`. Staging currently leaves it unset, so the document gate still crosses the HTTPS function hop until that variable is set.
- Cold functions after idle still pay framework startup and the first connection. Nothing here keeps functions warm.

## Remaining ideas

- Run the first-page query in parallel with the profile lookup when the request needs no viewer availability, saving about one stage.
- Join the profile and its target languages in one query.
- Serve a short-lived anonymous first page from the edge for guests, which would need a decision on the no-store policy in `discovery.md`.
