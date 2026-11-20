# Policy Claims

Claim-by-claim check of the Terms of Service, Privacy Policy and Community Guidelines in `src/features/Legal/legalContent.ts`, plus user-facing benefit copy, against implemented behavior. Reviewed 2026-09-24 against `develop` for LEGAL-002. Operator and Supporter rows rechecked 2026-11-19 for LEGAL-004 against the BILLING-004 and AUTH-004 changes.

Status values:

- **Verified**: the behavior matches the text, with code or test evidence.
- **Reworded**: the text described something the product does not do, so the wording now matches the evidence.
- **Open**: needs operational evidence or an owner decision that the repository cannot supply. The row names the dependency.

Every row is owned by Chev, the single maintainer. This is a consistency review, not legal advice or certification.

## Terms of Service

| Claim | Behavior and evidence | Status |
| --- | --- | --- |
| Users must be 13 or the local digital-consent age | No age is collected and there is no age gate. Adding age data is not assumed to be required. | Open: owner decides how eligibility is operationalized |
| Minors need a parent or guardian to review and agree | No guardian acknowledgement exists | Open: owner decision |
| Signing in or browsing is acceptance | No acceptance record or checkbox exists | Open: owner decides whether an explicit acknowledgement is needed |
| Polycord never sees the Discord password | OAuth code flow with `identify` scope in `src/app/api/auth/discord/route.ts`. The callback does not store Discord tokens. | Verified |
| Deleting the account removes the profile and disconnects Discord | Deletion removes the profile and revokes sessions (`tests/integration/account.mjs`, `e2e/account.pw.ts`) but cannot revoke the Discord authorization | Reworded: points to Discord Authorized Apps |
| Public profiles appear in discovery and on share links | `/[lang]/u/[id]` and discovery queries in `src/db/discovery.ts`; `e2e/safety.pw.ts` | Verified |
| Enforcement: hide, remove content, suspend, ban | Admin actions are warn, hide or unhide, suspend or unsuspend, ban or unban (`src/app/api/admin/moderation/route.ts`, `tests/integration/moderation.mjs`). There is no content removal action. | Reworded |
| Unlawful activity may be reported to Discord or authorities | No documented escalation process or contact route | Open: owner defines the escalation process |
| Price, plan contents and renewal dates are shown before subscribing | BILLING-004 removed the payment integration. Settings shows the plan table and says Supporter is not available to buy | Removed from the Terms |
| Subscriptions renew until cancelled and paid features last to period end | BILLING-004 converted active subscriptions into grants ending at their paid period end, and access now comes only from grants and the configured list | Removed from the Terms |
| The agreement is with the individual who operates Polycord, and liability is the operator's | The Terms and Privacy Policy intros name the operator role and use "we". No personal name, entity or trading name is published | Reworded: owner decides whether to form an entity or register a name |
| The Terms cover the website, the Polycord Discord app and Supporter | The website is this repository. The Discord app's `/profile` command renders the card layout chosen in Settings (`discordCardDescription`). Its code is not in this repository, and nothing here serves it: no bot token, no interactions endpoint and no API route for it. The only shared field is `users.discord_card`, so it presumably reads the database directly. Website sign-in requests only the `identify` scope, uses the OAuth token once to read `users/@me` without storing it, and stores the Discord ID, username, display name and avatar URL | Open: what the Discord app reads, stores and logs can only be checked in its own code. The Privacy Policy lists the Discord ID, username and avatar but not the display name |
| Supporter is an optional paid subscription that is not currently for sale, and Polycord takes no payments | BILLING-004 removed the payment integration. Settings shows the plan table and says Supporter is not available to buy. Access comes only from grants and the configured list | Verified |
| Questions go to the Polycord Discord server | Legal pages and the ban screen send people to the moderators in the Polycord Discord server through the footer and `NEXT_PUBLIC_DISCORD_INVITE_URL` (AUTH-004) | Open: owner sets the invite URL and staffs moderator intake |

## Privacy Policy

| Claim | Behavior and evidence | Status |
| --- | --- | --- |
| Underage reports go to the Polycord Discord server | Legal pages and the ban screen send people to the moderators in the Polycord Discord server through the footer and `NEXT_PUBLIC_DISCORD_INVITE_URL` (AUTH-004) | Open: owner sets the invite URL and staffs moderator intake and a review process |
| Discord ID, username and avatar are collected, and email is not requested or stored | `normalizeDiscordUser` in `src/lib/auth.ts` and the `identify` scope. Migration 0040 cleared stored addresses | Verified |
| Profile, usage, service and billing data listed | Tables in `src/db/schema.ts`: `profiles`, `analytics_events`, `saved_profiles`, `user_blocks`, `reports`, `notifications`, `push_subscriptions`, `subscriptions` | Verified |
| IP addresses are kept for abuse prevention | `suspicious_activity.ip` and IP-keyed `rate_limit_counters` | Verified |
| Public profile details are visible to members and link holders | Also visible to signed-out visitors. Signed-in members always receive the Discord username; guests only with `allowAnonymousCopy` (`toDiscoveryProfile` in `src/db/profiles.ts`, `e2e/safety.pw.ts`) | Reworded |
| Timezone and availability display are controlled in Settings | Timezone is in Settings and the profile editor; availability only in the profile editor | Reworded |
| Blocking hides people | Blocks are mutual between signed-in accounts (`src/db/discovery.ts`, `tests/integration/safety.mjs`). Public profiles stay visible when signed out, as Settings already states. | Reworded |
| Turning off Product analytics stops future account-linked events | `trackEvent` skips events for users with `productAnalytics` off; deletion clears the account link (`tests/integration/analytics.mjs`) | Verified |
| Discord message content is not collected | Scopes are `identify` only | Verified |
| Cookies keep sign-in and language; browser storage keeps preferences and onboarding | Cookies: session, OAuth state, `NEXT_LOCALE`. Preferences are stored with the account. Session storage holds unsaved form drafts and the discovery return position (`src/hooks/useFormDraft.ts`). | Reworded |
| Polycord is run by an individual operator | Privacy Policy intro, matching the Terms | Reworded |
| Data is shared with hosts, Discord and push services | Matches the integrations in `src/lib/push` and the Discord routes. Voice intros are stored in the database. BILLING-004 removed the payment provider | Verified |
| Personal data is never sold | No code path sells data. This is an accountable business commitment. | Open: owner review |
| Deletion removes listed data; some records remain | Matches the retention note in `getAccountExportByUserId` and Settings `deleteAccountRetentionNote` (`tests/integration/account.mjs`) | Reworded |
| Export covers account, profile, settings and voice | Export also includes saved profiles, blocks, reports, inbox, billing, boosts, push registrations and analytics (`src/db/account.ts`) | Reworded |
| Industry-standard security measures | No security review or control inventory backs this phrase | Open: owner review |

## Community Guidelines

| Claim | Behavior and evidence | Status |
| --- | --- | --- |
| Blocking makes someone no longer appear for you | Mutual hiding while signed in, inbox filtering (`src/db/notifications.ts`), and no notification to the blocked person | Reworded |
| Reports are confidential | Reporter identity appears only on the admin route behind `isAdmin` | Verified |
| Enforcement: hide, remove content, warn, remove account | Warn, hide, suspend and ban. Warnings reach free and Supporter inboxes (`tests/integration/notifications.mjs`). | Reworded |
| Serious issues are escalated to authorities | No documented escalation process | Open: owner defines the process |
| Contact the moderators in the Polycord Discord server | Legal pages and the ban screen send people to the moderators in the Polycord Discord server through the footer and `NEXT_PUBLIC_DISCORD_INVITE_URL` (AUTH-004) | Open: owner sets the invite URL and staffs moderator intake |

## Product copy

| Claim | Behavior and evidence | Status |
| --- | --- | --- |
| Japanese legal pages: "a translation is on the way" | No translation is planned or scheduled. The pages show the English text. | Reworded: English applies, no delivery promise (`e2e/legal.pw.ts`) |
| Profiles with a voice intro "get noticed first" | Discovery sorting ignores voice intros (`src/features/Discovery/discoverySort.ts`) | Reworded: the intro adds a play button to the card |
| Voice intros help you "stand out in discovery" | Same as above | Reworded |
| Settings export and deletion descriptions | Already match the export route and deletion behavior | Verified |
