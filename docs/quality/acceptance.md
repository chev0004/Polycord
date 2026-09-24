# Product Acceptance

Evidence-based acceptance pass for the readiness backlog, recorded 2026-09-24 for TEST-002. It maps every audit finding to its owning ticket and to the tests that prove the resolution, then records route coverage by identity and the blockers that remain.

**Polycord is not accepted as a complete product.** The blockers below are still open.

## Environment

- Browser: Chromium through Playwright (`bun run test:e2e`), on a production build (`next start`) against an isolated localhost PostgreSQL database. CI runs the same suite with a Postgres service container.
- Widths: 320, 375, 390, 768, 1024, 1280 and 1440 px are exercised by `e2e/mobile.pw.ts`, `e2e/layouts.pw.ts` and `e2e/navigation.pw.ts`.
- Not covered: Safari, Firefox, iOS and Android devices, real on-screen keyboards, and the deployed staging site. Emulated widths are not device proof.
- Identities: fixtures create disposable accounts per test (logged out, free, Premium through an active `subscriptions` row, suspended, banned, and an admin through `POLYCORD_ADMIN_USER_IDS=e2e-admin`). No shared staging or production data is used.

## Audit findings

| Findings | Area | Owning ticket | Evidence | Status |
| --- | --- | --- | --- | --- |
| 1-2 | Public profile detail and saved-card actions | PROFILE-011 (#112) | `e2e/discovery.pw.ts`, `e2e/journeys.pw.ts` (populated saved list: view, reload, return, unsave, block, tag filter, Back and Forward) | Resolved |
| 3-7 | Theme, application language, inert settings, recovery-email copy, time format | SETTINGS-004 (#109) | `e2e/preferences.pw.ts` | Resolved |
| 8-9 | Navigation shell, return paths, inert Bump | NAV-003 (#114) | `e2e/navigation.pw.ts` | Resolved in open PR #114 |
| 10-12 | Editor drafts, onboarding draft scope and tag caps, timezone and voice save contract | PROFILE-012 (#108) | `e2e/drafts.pw.ts` | Resolved |
| 13-20 | Discovery loading, prefetch, server paging, grid duplication, fonts | DISC-009 (#110) | `e2e/discovery.pw.ts`, `docs/performance/discovery.md` | Resolved |
| 21-23, 28 | Premium comparison at 320 px, hover-only actions, dialog height, focus, errors, motion | MOBILE-002 (#115) | `e2e/layouts.pw.ts`, `e2e/mobile.pw.ts` | Resolved in open PR #115, except device validation |
| 24-26, 27 (split) | Branded 404 and error recovery, identifier validation, failure states outside the inbox | QA-002 (#107) | `e2e/recovery.pw.ts` | Resolved |
| 27 (split), 29-33 | Inbox entitlements, inbox failure rollback, reload and actor destinations | NOTIF-004 (#105) | `e2e/notifications.pw.ts`, `tests/integration/notifications.mjs` | Resolved |
| 34-36 | Username privacy, block enforcement, unblock UI, copy ordering | SAFETY-002 (#106) | `e2e/safety.pw.ts`, `tests/integration/safety.mjs` | Resolved |
| 37 | Session revocation and export completeness | ACCOUNT-002 (#104) | `e2e/account.pw.ts`, `tests/integration/account.mjs` | Resolved |
| Billing | Deployed Stripe lifecycle and truthful Premium states | BILLING-002 | None | Blocked: not started |
| Legal | Policy claims against behavior and operations | LEGAL-002 (#116) | `docs/legal/claims.md`, `e2e/legal.pw.ts`, `tests/integration/analytics.mjs` | Resolved in open PR #116, with open owner rows |
| Operations | Monitoring, alerts, backups, production data boundary | DEV-013 (#111) | `docs/operations/readiness.md` | Blocking rows remain |
| Test stability | Accessibility scans racing animations | TEST-003 (#113) | `e2e/accessibility.pw.ts` | Resolved |

## Route coverage

| Route | Logged out | Free | Premium | Restricted or admin |
| --- | --- | --- | --- | --- |
| Discovery `/[lang]` | `discovery.pw.ts`, `safety.pw.ts` guest payloads | `discovery.pw.ts`, `navigation.pw.ts` | `notifications.pw.ts`, `tests/integration/boosts.mjs` | Restricted profiles hidden from others: `safety.pw.ts` |
| Public profile `/[lang]/u/[id]` | `safety.pw.ts`, `recovery.pw.ts` | `discovery.pw.ts`, `journeys.pw.ts` | `notifications.pw.ts` actor links | Suspended and banned members can read: `journeys.pw.ts` |
| Saved `/[lang]/saved` | Redirect: `product.pw.ts` | `journeys.pw.ts` populated, `navigation.pw.ts` | Not separately covered | Writes rejected: `journeys.pw.ts` |
| Profile editor | Redirect: `product.pw.ts` | `drafts.pw.ts`, `mobile.pw.ts` | `drafts.pw.ts` lapsed Premium | Writes rejected: `journeys.pw.ts` |
| Settings, every section | Redirect: `product.pw.ts` | `preferences.pw.ts`, `drafts.pw.ts`, `accessibility.pw.ts` | `layouts.pw.ts` Premium tab | Writes rejected: `journeys.pw.ts` |
| Onboarding | Redirect: `src/middleware.test.ts` | `drafts.pw.ts` | Not separately covered | Not covered |
| Inbox | Not shown | `notifications.pw.ts`, `layouts.pw.ts` | `notifications.pw.ts` | Warnings reach members: `journeys.pw.ts` |
| Legal | `legal.pw.ts`, `recovery.pw.ts` | `navigation.pw.ts` | Same content | Same content |
| Admin and analytics | Not covered | Redirect and API 404: `journeys.pw.ts` | Not separately covered | Admin warn flow and analytics page: `journeys.pw.ts` |
| Missing and failing routes | `recovery.pw.ts` in both locales | `recovery.pw.ts` | Same | Same |

`navigation.pw.ts`, `layouts.pw.ts` and `legal.pw.ts` arrive with PRs #114, #115 and #116.

Direct entry, refresh, Back and Forward, locale changes and return journeys are exercised in `discovery.pw.ts`, `navigation.pw.ts`, `preferences.pw.ts` and `journeys.pw.ts`. Failed network responses are simulated in `discovery.pw.ts`, `preferences.pw.ts` and `notifications.pw.ts`; full offline mode is not simulated.

## Blockers

1. BILLING-002 has not started, so purchase, renewal, failure, cancellation and the hardcoded renewal dates in Settings Premium are unverified.
2. PRs #114, #115 and #116 must merge before their findings count as resolved on `develop`.
3. The Open rows in `docs/legal/claims.md` need owner evidence or decisions: mailbox delivery, eligibility and guardian acknowledgement, escalation, no-sale and security assertions.
4. The Blocking rows in `docs/operations/readiness.md` remain: production database separation, uptime monitoring and alerting.
5. No Safari, iOS or real-device evidence exists for any layout or keyboard behavior.
