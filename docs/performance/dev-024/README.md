# DEV-024 in-route ban checks

Every gated API request paid for two new database connections before it did any work: one for the middleware ban lookup and one for the request pool inside the function. It then waited for that pool to close before answering.

## Changes

- `gatedRoute` (`src/lib/gatedRoute.ts`) is the shared wrapper for API routes. It opens the request pool, then runs the IP ban, the remembered-ban cookie and the session identity (which carries banned accounts) in one parallel stage. Banned callers get the same `403 {"error":"Forbidden"}` with `Cache-Control: no-store` as the middleware, and a failed lookup gets the same fail-closed `503`. The handler receives the signed-in user and the trace `measure`.
- `/api/discovery/bootstrap` moved onto the wrapper with no change in behavior. `/api/voice/[profileId]` and `/api/admin/case` use it too.
- The middleware skips the ban gate for a path only when it matches `src/lib/gatedPaths.ts`. Documents, every other API route and the service routes keep the middleware gate.
- `withRequestPool` closes its pool with `after()`, as `renderPool` already did, so the response is sent before the connections shut down. A query that runs after the pool starts closing falls back to the shared pool.
- The voice and case routes report `Server-Timing` spans to the owner on staging: `ban` and `account` (the same parallel stage), `profile`, `premium` and `voice` for a clip, `staff` and `case` for a case, plus `handler` for the total. The middleware adds its `gate` span.

## Checks

- `tests/gated-route.test.js` calls the voice, case and bootstrap routes with a banned IP, a banned remembered-ban cookie, a banned account and a failing lookup, and checks the 403 and 503 responses. It also asks the middleware about every route under `src/app/api` and fails when a path it skips is not one of the three service routes and its `route.ts` does not use `gatedRoute`.
- `tests/request-pool.test.js` and its cleanup script now run the `after()` callbacks. The cleanup script asserts that connections are still open when the handler returns and that none remain once the callbacks have run. The burst of 20 concurrent handlers leaves no connection and no idle transaction.
- A production build served with `next start` against local PostgreSQL returned 403 for a banned IP on all three routes and the document, 404 for an unbanned caller on the voice and case routes, and 200 on bootstrap.

## Not measured

- Netlify staging. The hosted baseline for the edge gate, function connect, each query stage and pool close of the voice and case routes, and the warm-request drop after this change, need the owner trace from a staging deploy. The new spans make those readable without further code.
- Whether more GET API routes should move onto the wrapper depends on those hosted numbers.
