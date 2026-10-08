# ADMIN-024 instant Take action panel

Opening Take action showed a spinner for one to two seconds: the panel and sheet chunks loaded on first open, the case request started only at the click, and the route ran five dependent database stages behind the edge ban lookup.

## Changes

- `caseCache` keeps a module-level cache shared by the desktop panel and the mobile sheet. It stores the in-flight promise and the result with its time, expires entries after 60 seconds, and never lets an older response overwrite a newer entry.
- For staff only, pointer down or Enter, Space and Arrow Down on a card's menu trigger starts the case request, and pointer down on the Take action item starts it again when the entry is missing or expired. The panel and sheet chunks are preloaded on the first menu open and when Discovery is idle. Members get no intent handler, so nothing runs for them, and the endpoint still returns 404.
- The panel opens in the same frame. It shows the case body from the cache when present. Otherwise it shows the header, display name, avatar, username and the moderation state already in the card data, with placeholders for the actions, reports and history. The mobile sheet shows the state chips and placeholders.
- An entry older than 10 seconds is shown first and refreshed in the background. The refresh is merged only while the panel has made no write, so it never overwrites a newer local change. A successful action replaces the profile's entry with the panel's current data, so the next open shows the new state.
- `GET /api/admin/case` runs on the DEV-024 `gatedRoute` wrapper. After the ban and session stage it runs the staff role, reports, log, related accounts (with warning counts) and their target languages as one parallel stage, keyed through the profile's user with subqueries instead of waiting for the profile row. `Server-Timing` reports `ban`, `account`, `staff` and `case` for the owner on staging.
- `listModerationUsers` now reads warning counts in the user query and target languages with a subquery, so every caller drops a dependent stage.

## Checks

`e2e/take-action-prefetch.pw.ts` runs against a production build and local PostgreSQL:

- Opening the card menu starts exactly one case request. Pressing Take action 600 ms later makes no second request and shows the toolbar, report details and reporter within 100 ms of the click.
- With a 1.5 second delay on the route, pressing Take action immediately shows the header and placeholders at once, then the case, from one request.
- After hiding a profile in the panel, closing and reopening shows Unhide profile with no request.
- The mobile sheet reuses the prefetch and opens with the case.
- A member's menu has no Take action item, makes no case request, and the endpoint returns 404.

The Storybook plays for the panel, sheet, Discovery page and card pass in Chrome; two panel assertions now wait for the case body, because the header is shown before it.

## Not measured

- Staging. The 500 ms no-lead budget, the two-stage `Server-Timing` of the case route and the effect of the DEV-024 edge change need an owner trace from a staging deploy.
- The case payload is unchanged apart from sharing one stage; trimming it was not needed to reach the stage count.
- Adding a compact report count to the staff Discovery payload (implementation note 3) was not done. The header uses the moderation state already in the card data.
