# DEV-020 request-scoped database connections

On Netlify the shared pool recycles every connection after one use, so each query on a page or API route opened its own TLS and SCRAM connection. Settings opened 11 connections for one page, a member profile 19, and a plain legal page 7 because the app layout alone runs five queries.

## Changes

- `withRenderPool` gives one request-scoped pool of three connections to everything that renders a request: `tracePage` (every app page), the app layout and the member page metadata. React `cache` makes the layout, page and metadata of one render share the same pool, which is closed by `after`.
- `scopedRoute` wraps every API handler that queries the database, and `withRequestPool` (used by `/api/discovery/bootstrap`) closes its pool in a `finally`. Excluded: `/api/health`, `/api/auth/logout`, `/api/auth/discord` and the fail-closed `/api/internal/ban-check`, which owns its client.
- Both only apply when `AWS_LAMBDA_FUNCTION_NAME` is set. Elsewhere the long-lived shared pool is already reusable, and a per-request pool made the notification spam test five times slower.
- Queries that run after a request pool starts closing (`after` callbacks, streamed children) fall back to the shared pool instead of failing with "Cannot use a pool after calling end".
- Strict TLS, the 3 second connection timeout, the 10 second query timeout, single-use recycling of the shared pool and the fail-closed ban gate are unchanged. No client outlives its request.

## Measurement

Production builds of `develop` at `37486ca9` and this branch, Node 26.1.0, Next.js 15.5.25, Windows, PostgreSQL 17 with the owner account, 6 public profiles and 6 saved profiles. The same seeded database and the same `next start` environment were used for both builds, with `AWS_LAMBDA_FUNCTION_NAME` set so the baseline recycles connections as it does on Netlify. Each row is the median of 6 requests after one warm-up, one request at a time, 600 ms apart.

A local TCP proxy delayed every database packet by 30 ms in each direction and every new connection by a further 310 ms. That gives about 60 ms per query and 370 ms per connection, the figures in the ticket. They are an assumption, not a measurement of Supabase. Connections are counted by the proxy per request and include the middleware ban gate connection.

| Route | Before | After | Connections before | Connections after |
| --- | ---: | ---: | ---: | ---: |
| Profile | 3.10 s | 1.40 s | 10 | 4 |
| Settings | 2.94 s | 1.24 s | 11 | 4 |
| Saved | 3.55 s | 1.47 s | 13 | 4 |
| Admin | 4.37 s | 1.44 s | 16 | 4 |
| Member profile | 4.36 s | 1.42 s | 19 | 9 |
| Inbox | 1.95 s | 1.17 s | 7 | 4 |
| Legal terms | 1.95 s | 1.30 s | 7 | 4 |
| `GET /api/notifications` | 1.94 s | 1.25 s | 6 | 4 |
| `GET /api/block` | 1.94 s | 1.17 s | 6 | 4 |
| `GET /api/profile/boost` | 1.93 s | 1.14 s | 5 | 4 |
| `GET /api/push/subscription` | 1.92 s | 1.14 s | 6 | 4 |
| `GET /api/discovery` | 4.90 s | 1.66 s | 14 | 4 |

The four connections are the three of the request pool and the middleware ban gate. The member profile also runs its view analytics and notification in `after`, which use the shared pool and open five more connections once the response has been sent.

What remains is one ban gate connection of about 0.43 s on every navigation, one pool connection wave of about 0.37 s, and the query stages of the layout and the page. The ban gate transport is a separate topic.

### Prewarm and pool size

Settings, profile and saved with the same proxy, pool size 3 unless noted:

| Prewarmed | Profile | Settings | Saved | Connections |
| --- | ---: | ---: | ---: | ---: |
| 0 | 1.61 s | 1.45 s | 1.63 s | 4 |
| 1 | 1.37 s | 1.25 s | 1.45 s | 4 |
| 2 | 1.36 s | 1.25 s | 1.44 s | 4 |
| 3, pool size 4 | 1.35 s | 1.26 s | 1.47 s | 5 |
| 4, pool size 5 | 1.33 s | 1.26 s | 1.48 s | 6 |
| 1, pool size 2 | 1.47 s | 1.33 s | 1.63 s | 3 |

Not prewarming costs about 0.25 s, and prewarming more than two buys nothing while adding connections. Two prewarmed connections and a pool of three were kept, which is what the bootstrap request already used.

## Checks

`tests/request-pool.test.js` runs sequential queries, a failing handler, committed and rolled back transactions and a burst of 20 concurrent handlers against PostgreSQL with `AWS_LAMBDA_FUNCTION_NAME` set. A request uses at most three connections, and afterwards no connection stays open and none is idle in a transaction.

## Not measured

- Netlify staging. The real pooler, TLS and SCRAM costs, cold functions and the real concurrency of the layout and page have not been run. Compare the DEV-018 owner trace for profile, settings, saved, admin, member, inbox and legal before and after deploying, and watch the pooler connection count: a request now holds up to three connections at once where it held up to two.
- Production traffic. Only one request ran at a time.
