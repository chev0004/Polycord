# Discovery performance, DISC-009

Measured on 2026-09-23 against `develop` at `93e9b22` and this change. These are local production-build observations, not a deployed SLA or a diagnosis of staging cold starts.

## Conditions and results

Both builds used Next.js 15.5.25, Node 24.19.0, an isolated UTF-8 PostgreSQL database, 1,000 synthetic public profiles, and Chromium headless shell on Windows with an AMD Ryzen 7 5700X. Profiles had two tags, one target language, no remote avatar, and a 336-character biography. Analytics was disabled in both timing runs. No shared staging or production data was used.

The browser viewport was 1280 by 900. Chromium applied 4x CPU throttling, 100 ms network latency, 500,000 bytes/second download and 125,000 bytes/second upload. Each build was started afresh. The first navigation used a fresh browser context; three subsequent navigations reused its cache. PostgreSQL and OS caches were not flushed. The small sample is useful for identifying payload and rendering costs, not statistical claims about latency.

Content-ready measures navigation through DOMContentLoaded and the first visible profile heading. Search-ready measures filling the search box with `Discovery Fixture 1000` through the matching card becoming visible. These are journey timings, not LCP or INP. HTML sizes are decoded response bytes, including React's server payload.

| Measurement | Before | After |
| --- | ---: | ---: |
| Cold TTFB | 282 ms | 307 ms |
| Warm TTFB, median of 3 | 111 ms | 104 ms |
| Cold content-ready | 1,588 ms | 1,702 ms |
| Warm content-ready, median of 3 | 1,385 ms | 1,003 ms |
| Cold search-ready | 1,652 ms | 249 ms |
| Warm search-ready, median of 3 | 1,702 ms | 241 ms |
| Decoded HTML | 1,277,084 bytes | 123,969 bytes |
| Decoded scripts | 615,042 bytes | 617,798 bytes |
| Card elements for nine results | 27 | 9 |

The measured improvements are response size, repeated rendering, search and warm navigation. Cold content-ready increased by 114 ms in this sample, and the script budget is essentially unchanged. No cold-start improvement is claimed. Fonts now come from the application rather than a runtime Google CSS import; only the used Japanese weight is bundled and secondary fonts are not preloaded.

For this fixture and throttle, regression budgets are 200 KB decoded HTML, exactly nine card elements, 2 seconds cold content-ready, 1.2 seconds warm content-ready, and 500 ms search-ready. Recheck several samples before treating a timing breach as a regression. The response/card bounds are deterministic assertions; timings vary with the machine and network.

Raw measurements are included below.

## Larger fixture

The browser suite inserts 10,000 additional matching profiles with 100 different secondary tags, then deletes those fixtures. The database contained 11,000 public profiles during this check. Requests below include the synthetic fixture's tag. No browser network or CPU throttle was applied to these API measurements.

| Request | Response-ready | JSON bytes | Profiles | Tag counts |
| --- | ---: | ---: | ---: | ---: |
| First page | 55 ms | 6,627 | 9 | 32 |
| Page 1,000 | 91 ms | 6,648 | 9 | 32 |
| Search for Japanese | 156 ms | 6,627 | 9 | 32 |
| Language and country filters | 56 ms | 6,627 | 9 | 32 |

`e2e/discovery.pw.ts` asserts at most 16 KB per fixture response, nine profiles and at most 32 tag counts, and saves its measurements as a test artifact. Discovery uses four database statements for guests and five for authenticated viewers, plus the viewer lookup. Only nine profile records and their languages are materialized in the application. Counts, substring search, sorting, overlap calculations and large offsets still require database work proportional to the matching population. This is bounded transfer and query count, not constant database CPU at arbitrary scale. Availability ranges require PostgreSQL 14 or later.

## Refresh and navigation policy

- Public discovery and detail reads remain dynamic. The feed API sends `Cache-Control: private, no-store`; no personalized HTML or profile result is put in a shared application cache.
- Loaded cards remain on screen while filters refresh. New requests cancel previous requests, so older responses cannot replace newer input. Failures retain the prior cards and offer a retry.
- Returning to discovery revalidates the current URL's query and page. Browser history and the explicit detail return button preserve context. Session storage holds only the return URL and scroll position, never profile or account data.
- Feed mount, tab focus, browser page restoration, successful saves, blocks, unblocks and bumps trigger fresh reads. Detail mount, tab focus and browser restoration refresh its server route. A profile made private while away disappears on return. An already visible page can retain its previous content while that check is in flight.
- Privacy, moderation, blocking and subscription entitlements are evaluated by each database request. Saved IDs are queried for the current viewer and the displayed page only. Both directions of a block exclude discovery candidates.
- Automatic footer prefetch is limited to policy pages. Discovery, profile, account and locale switches are fetched when requested, avoiding speculative view notifications and stale personalized prefetches. Static script and font assets retain normal browser caching.
- Route progress follows transitions and pathname/search changes. It no longer declares success after an eight-second timer. Repeated links and modifier clicks do not start a stranded progress bar.
- Analytics and profile-view notifications run through Next.js `after`. The browser test holds the notification table locked and verifies that the profile response completes before delivery is released.

## Verification

`bun run check:all`, the production build, the Storybook build, 54 unit/database tests and 10 production browser tests passed. The database test compares localized search and weekly availability behavior, and covers moderation, private profiles, bidirectional blocks, saved-state isolation and expired subscriptions. Browser coverage includes failed and slow refreshes, query-only navigation, explicit return, back/forward, revocation on return, and 320/375/390-pixel routes. Nine Storybook journeys and their rendered end states were checked, including natural-height masonry, filters, pagination and refresh failure.

Run the integration and browser checks with `TEST_DATABASE_URL` pointing to an isolated local UTF-8 PostgreSQL database and `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` set when using a separately installed Chromium. Run the production server on port 3119 before the browser suite; otherwise its configuration starts development mode. Use the same fixture, browser throttles and fresh-process sequence above for before/after timings. Deployed connection latency, hosting cold starts, real mobile devices and production traffic remain release-level measurements.

## Raw measurements

### Before

```json
[
  {
    "run": "cold-browser",
    "contentReadyMs": 1588,
    "searchReadyMs": 1652,
    "htmlBytes": 1277084,
    "ttfb": 282.0999999642372,
    "dom": 27,
    "scriptBytes": 615042
  },
  {
    "run": "warm-browser",
    "contentReadyMs": 1385,
    "searchReadyMs": 1681,
    "htmlBytes": 1277084,
    "ttfb": 143.20000004768372,
    "dom": 27,
    "scriptBytes": 615042
  },
  {
    "run": "warm-browser",
    "contentReadyMs": 1534,
    "searchReadyMs": 1702,
    "htmlBytes": 1277084,
    "ttfb": 104.90000003576279,
    "dom": 27,
    "scriptBytes": 615042
  },
  {
    "run": "warm-browser",
    "contentReadyMs": 1373,
    "searchReadyMs": 1763,
    "htmlBytes": 1277084,
    "ttfb": 111.30000001192093,
    "dom": 27,
    "scriptBytes": 615042
  }
]
```

### After

```json
[
  {
    "run": "cold-browser",
    "contentReadyMs": 1702,
    "searchReadyMs": 249,
    "htmlBytes": 123969,
    "ttfb": 307.30000001192093,
    "dom": 9,
    "scriptBytes": 617798
  },
  {
    "run": "warm-browser",
    "contentReadyMs": 1003,
    "searchReadyMs": 249,
    "htmlBytes": 123969,
    "ttfb": 126.30000001192093,
    "dom": 9,
    "scriptBytes": 617798
  },
  {
    "run": "warm-browser",
    "contentReadyMs": 1029,
    "searchReadyMs": 232,
    "htmlBytes": 123969,
    "ttfb": 100.10000002384186,
    "dom": 9,
    "scriptBytes": 617798
  },
  {
    "run": "warm-browser",
    "contentReadyMs": 868,
    "searchReadyMs": 241,
    "htmlBytes": 123969,
    "ttfb": 104.30000001192093,
    "dom": 9,
    "scriptBytes": 617798
  }
]
```
