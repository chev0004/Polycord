# Policy Claims

Claim-by-claim check of the Terms of Service, Privacy Policy and Community Guidelines in `src/features/Legal/legalContent.ts`, plus user-facing benefit copy, against implemented behavior. Reviewed 2026-09-24 against `develop` for LEGAL-002.

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
| Polycord never sees the Discord password | OAuth code flow with `identify email` scope in `src/app/api/auth/discord/route.ts`. The callback does not store Discord tokens. | Verified |
| Deleting the account removes the profile and disconnects Discord | Deletion removes the profile and revokes sessions (`tests/integration/account.mjs`, `e2e/account.pw.ts`) but cannot revoke the Discord authorization | Reworded: points to Discord Authorized Apps |
| Public profiles appear in discovery and on share links | `/[lang]/u/[id]` and discovery queries in `src/db/discovery.ts`; `e2e/safety.pw.ts` | Verified |
| Enforcement: hide, remove content, suspend, ban | Admin actions are warn, hide or unhide, suspend or unsuspend, ban or unban (`src/app/api/admin/moderation/route.ts`, `tests/integration/moderation.mjs`). There is no content removal action. | Reworded |
| Unlawful activity may be reported to Discord or authorities | No documented escalation process or contact route | Open: owner defines the escalation process |
| Price, plan contents and renewal dates are shown before subscribing | Settings shows the price and plan table, and payment runs through Stripe Checkout (`createCheckoutSession`). Settings also shows a hardcoded "renews July 11, 2026" (`premiumPriceRenewal`, `premiumMembershipDescriptionPremium`), which is not a real renewal date. | Reworded to price and Stripe Checkout. Open: renewal copy belongs to BILLING-002 |
| Subscriptions renew until cancelled and paid features last to period end | `isSubscriptionActive` checks status and `currentPeriodEnd`, and the webhook stores `cancelAtPeriodEnd` | Open: deployed Stripe lifecycle is verified under BILLING-002 |
| Questions go to support@polycord.app | The domain has MX records only. Delivery, ownership and staffing have no evidence. | Open: owner verifies the mailbox |

## Privacy Policy

| Claim | Behavior and evidence | Status |
| --- | --- | --- |
| Underage reports go to privacy@polycord.app | Same mailbox evidence gap as support | Open: owner verifies the mailbox and review process |
| Discord ID, username, avatar and email are collected | `normalizeDiscordUser` in `src/lib/auth.ts` | Verified |
| Profile, usage, service and billing data listed | Tables in `src/db/schema.ts`: `profiles`, `analytics_events`, `saved_profiles`, `user_blocks`, `reports`, `notifications`, `push_subscriptions`, `subscriptions` | Verified |
| IP addresses are kept for abuse prevention | `suspicious_activity.ip` and IP-keyed `rate_limit_counters` | Verified |
| Public profile details are visible to members and link holders | Also visible to signed-out visitors. Signed-in members always receive the Discord username; guests only with `allowAnonymousCopy` (`toDiscoveryProfile` in `src/db/profiles.ts`, `e2e/safety.pw.ts`) | Reworded |
| Email is never public | `toDiscoveryProfile` has no email field | Verified |
| Timezone and availability display are controlled in Settings | Timezone is in Settings and the profile editor; availability only in the profile editor | Reworded |
| Blocking hides people | Blocks are mutual between signed-in accounts (`src/db/discovery.ts`, `tests/integration/safety.mjs`). Public profiles stay visible when signed out, as Settings already states. | Reworded |
| Turning off Product analytics stops future account-linked events | `trackEvent` skips events for users with `productAnalytics` off; deletion clears the account link (`tests/integration/analytics.mjs`) | Verified |
| Discord message content is not collected | Scopes are `identify email` only | Verified |
| Cookies keep sign-in and language; browser storage keeps preferences and onboarding | Cookies: session, OAuth state, `NEXT_LOCALE`. Preferences are stored with the account. Session storage holds unsaved form drafts and the discovery return position (`src/hooks/useFormDraft.ts`). | Reworded |
| Data is shared with hosts, Discord, Stripe and push services | Matches the integrations in `src/lib/stripe.ts`, `src/lib/push`, and the Discord routes. Voice intros are stored in the database. | Verified |
| Personal data is never sold | No code path sells data. This is an accountable business commitment. | Open: owner review |
| Deletion removes listed data; some records remain | Matches the retention note in `getAccountExportByUserId` and Settings `deleteAccountRetentionNote` (`tests/integration/account.mjs`) | Reworded |
| Export covers account, profile, settings and voice | Export also includes saved profiles, blocks, reports, inbox, billing, boosts, push registrations and analytics (`src/db/account.ts`) | Reworded |
| Industry-standard security measures | No security review or control inventory backs this phrase | Open: owner review |

## Community Guidelines

| Claim | Behavior and evidence | Status |
| --- | --- | --- |
| Blocking makes someone no longer appear for you | Mutual hiding while signed in, inbox filtering (`src/db/notifications.ts`), and no notification to the blocked person | Reworded |
| Reports are confidential | Reporter identity appears only on the admin route behind `isAdmin` | Verified |
| Enforcement: hide, remove content, warn, remove account | Warn, hide, suspend and ban. Warnings reach free and Premium inboxes (`tests/integration/notifications.mjs`). | Reworded |
| Serious issues are escalated to authorities | No documented escalation process | Open: owner defines the process |
| Contact safety@polycord.app | Same mailbox evidence gap | Open: owner verifies the mailbox |

## Product copy

| Claim | Behavior and evidence | Status |
| --- | --- | --- |
| Japanese legal pages: "a translation is on the way" | No translation is planned or scheduled. The pages show the English text. | Reworded: English applies, no delivery promise (`e2e/legal.pw.ts`) |
| Profiles with a voice intro "get noticed first" | Discovery sorting ignores voice intros (`src/features/Discovery/discoverySort.ts`) | Reworded: the intro adds a play button to the card |
| Voice intros help you "stand out in discovery" | Same as above | Reworded |
| Settings export and deletion descriptions | Already match the export route and deletion behavior | Verified |
