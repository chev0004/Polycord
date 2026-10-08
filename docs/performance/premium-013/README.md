# PREMIUM-013 instant voice intros

Pressing play on a voice intro used to request the clip at click time, behind the middleware ban lookup and a new request pool, with four sequential queries and no Range support. The clip is now in memory before the press.

## Changes

- `GET /api/voice?ids=a,b,c` returns the stored base64 clips of up to 12 profiles in one query. The query applies the public profile, block and Premium conditions of the single-clip route (`listPlayableVoiceIntros`, which reuses `publiclyVisible` and `isPremiumAccount`). Profiles that fail any condition are absent from the response. It runs on the DEV-024 `gatedRoute` wrapper, so the ban check and session lookup share one stage.
- `GET /api/voice/[profileId]` reads the clip with the same query after the session and ban stage, falls back to the owner's own clip only when that finds nothing, and answers `Range` requests with 206 (or 416 for an unsatisfiable range) and `Accept-Ranges: bytes`. Responses stay `private, no-store`.
- `voiceClips` keeps a module-level store: object URLs in an LRU of 10 (evicted URLs are revoked), in-flight promises so a press during a prefetch reuses the request, and a debounced queue that sends one batch per 150 ms window.
- A Premium card's chip observes itself with a 200 px root margin. When it is near the viewport, the page has painted its first contentful paint and the browser is idle, it queues its clip. Nothing is queued with `navigator.connection.saveData`.
- Pointer enter, focus and pointer down on a chip whose clip is missing fetch that clip alone, unless a request for it is already in flight. The mobile sheet and the profile page fetch their single clip on mount.
- The press points the audio element at the blob URL and calls `play()` in the click. Stop resets `currentTime` instead of the press. Saving or deleting a voice intro clears the store.
- The voice routes report `Server-Timing` spans for the owner on staging.

## Checks

`e2e/voice-prefetch.pw.ts` runs against a production build and local PostgreSQL:

- Three visible Premium cards produce one batch request and no per-card request, and pressing play makes no request. In headless Chromium the time from the click to the audio `playing` event stayed under 100 ms.
- A press while the batch is still in flight makes no second request.
- A replaced clip appears in the next batch, and a deleted clip, a lapsed subscription and a blocked profile disappear from the batch and return 404 from the single route.
- Range requests return 206 with the right `Content-Range`, a suffix range works, and a start past the end returns 416.
- A banned IP receives 403 from both routes.

The existing VoiceChip, VoiceIntroEditor and profile preview Storybook plays pass in Chrome.

## Not measured

- Android Chrome and iOS Safari. The cache-hit press calls `play()` synchronously in the click, but a press that waits for an in-flight prefetch calls it after the request resolves, which Safari may refuse. The next press then plays from memory.
- Staging. The cold press target of 500 ms and the owner trace spans need a staging deploy.
- Object storage and a CDN (Phase 3) are not needed unless the staging cold press misses its target.
