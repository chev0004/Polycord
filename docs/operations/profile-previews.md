# Profile link previews, PROFILE-024

Shared profile links unfurl in Discord and other apps from ordinary Open Graph metadata and a generated image. No bot, webhook or stored image is involved.

## What a preview contains

`/{locale}/u/{profileId}` serves the metadata, and `/{locale}/user/{username}` redirects there with a real `307` (PROFILE-023), so both links unfurl the same way. Everything is localized from the locale in the URL; cookies and browser language are never read.

| Tag | Value |
| --- | --- |
| `og:title`, `twitter:title` | Display name |
| `og:description`, `twitter:description` | Bio. Bios are required, so the language summary fallback only applies to older rows |
| `og:site_name` | Polycord |
| `og:url` | Absolute profile URL built from the request host |
| `og:image`, `twitter:image` | `/{locale}/u/{profileId}/og?v={version}`, 1200 by 630 PNG, with localized alt text |
| `twitter:card` | `summary_large_image` |
| `theme-color` | The profile's representative colour, see below |

Link unfurls cannot control Discord's author, field or footer layout, so the image carries that structure: `@username` (only when the guest payload includes it), display name, bio, the avatar as the thumbnail, then Languages, Availability, Location with the country flag, Timezone, tag pills and a Polycord footer.

### Colour

The colour comes from the owner's effective card theme, including the premium entitlement fallback. Solid themes use the banner colour. Gradients keep the gradient in the image stripe, and `theme-color` uses the theme accent, which for a custom gradient is the fixed blend of its two stops. Free themes are never reduced to the shared gray accent.

### Truncation

| Content | Rule |
| --- | --- |
| Display name | 28 characters, then an ellipsis, at most two lines |
| Username | 32 characters |
| Bio | Whitespace collapsed, 150 characters, clamped to two lines |
| Target languages | First three, then `+N` |
| Tags | First six, each at most 24 characters, then `+N` |

Missing avatar, country, timezone, availability or tags drop their element. A failed avatar or flag fetch (3 second timeout) falls back to an initial in the theme colour or no flag. Non-Latin text and emoji are rendered with fonts that `next/og` fetches from Google Fonts at render time; if that fetch fails the text still renders, without those glyphs.

Availability is shown as the owner's recurring days and hours with the owner's timezone abbreviation. There is no current time, "your time" conversion or last active value, because the image is static and no public activity source exists.

## Visibility

Metadata and image requests are unauthenticated, so both use the guest rules independently: the profile must be public, not hidden by moderation, and the owner not banned or suspended. Otherwise the page is a `404` without preview tags and the image route returns `404`. The username route additionally requires anonymous copying for guests. When copying is off, the UUID preview omits the username, as the guest payload already does.

## Caching

- The image route answers with `Cache-Control: no-store`, overriding the year-long immutable default of `next/og`, so neither the CDN nor a direct fetch can serve an image after the profile becomes hidden.
- `v` in the image URL is the later of the profile and user `updated_at`, so an edit to the profile, display name or avatar produces a new image URL on the next unfurl.
- Discord caches unfurls and proxied images on its side for an unpublished period. Polycord cannot purge those copies; a message that already unfurled keeps its preview until Discord refreshes it. Hiding a profile stops new unfurls and makes the original image URL return `404`.
- A subscription change alone does not bump `v`; the next profile or account edit does.

## Manual QA

Discord behaviour has to be checked on a deployed host, because Discord cannot reach localhost:

1. Post `https://<host>/en/user/<username>` and `/ja/user/<username>` in a test channel and confirm the localized title, bio, image and embed colour.
2. Post a UUID link for an owner with anonymous copying off and confirm no username appears.
3. Make the profile private, post a fresh link and confirm it does not unfurl.
4. Inspect headers with `curl -sIL -A "Discordbot/2.0" https://<host>/en/user/<username>` and confirm the `307` then `200`.
