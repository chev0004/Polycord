# Profile Moderation Visibility States

Product-level policy for how profile content behaves when moderation flags it. This document defines intent, not implementation: no classifier design, no schema, no keyword lists. Those are out of scope here and tracked by their own tickets.

## Principles

1. Saving is not publishing. A profile edit always saves privately for its owner. Whether the content reaches public surfaces is a separate, server-side decision.
2. Private pending publication, never fake publication. When distribution is held, the owner sees an honest "saved" or "pending review" state. The UI never claims public visibility that does not exist.
3. Feedback is truthful, vague, and non-diagnostic. Users are told the state of their content, never which words, patterns, or rules triggered review.
4. Public surfaces fail closed. If a profile's review state is unknown or pending, it does not appear on any public surface.
5. Server-side enforcement only. Client-side filtering or hiding is a presentation aid, never the mechanism that keeps flagged content out of distribution.

## State model

A profile version is in exactly one of these states:

| State | Owner sees | Public sees |
|---|---|---|
| Draft/saved | Their latest content, marked saved | Previous approved version, or nothing if none exists |
| Approved | Their content, live | The content, on all eligible surfaces |
| Pending review | Their latest content, marked pending | Previous approved version, or nothing |
| Rejected | Their latest content, marked as not publishable, with a path to edit or appeal | Previous approved version, or nothing |
| Hidden (moderator action) | A notice that the profile is not publicly visible | Nothing |

Notes:

- States apply per profile version. An edit to an approved profile that gets flagged holds the new version privately while the old approved version stays live, unless the flag severity requires hiding the live version too (see review tiers).
- `isPublic` (the owner's own visibility toggle) and moderation state are independent. Public distribution requires both: owner opted in and content approved.

## Surfaces that must never show unapproved flagged content

Flagged content that has not been approved must not appear on any of these:

- Discovery feed cards and the discovery grid
- Search results and filter results
- Recommendations and match ranking output
- Popular tags aggregation (flagged content must not contribute tags)
- Public profile route (`/u/[id]`)
- Saved/favorites lists of other users (the saved entry may remain, rendering the last approved version or an unavailable state)
- Bump queues and bump-driven visibility ordering
- Profile previews rendered for anyone other than the owner
- Notifications that embed profile content (names, bios, tags)

The owner's own editor, preview, and settings views may always show their own content, clearly marked with its state.

## Bump behavior for flagged or pending profiles

- A bump only reports success when the profile is actually eligible for public distribution.
- If the profile is pending review or rejected, the bump action is either unavailable ("Your profile is pending review") or queues without claiming public effect ("Your bump will apply once your profile is live").
- Never show a fake successful bump. Never silently drop a bump the user was told succeeded.

## User-facing language

Acceptable copy patterns per state. Exact production copy is finalized later; these set the tone: calm, truthful, non-diagnostic.

- Saved: "Your changes are saved."
- Queued/pending: "Your changes are saved and will be visible to others shortly." or "Your profile is under review. It stays private until review completes."
- Rejected: "Your recent changes could not be published. Edit your profile and try again, or contact support."
- Hidden by moderation: "Your profile is currently not visible to others. Check your notifications or contact support."

Never acceptable:

- Naming the triggering words, rules, categories, or detection method.
- Claiming public visibility while distribution is held.
- Copy that implies an accusation for routine review states.

## Review tiers

Three tiers, distinguished by what happens to already-live content and who must look at the flag:

1. Normal review. Routine quality or policy checks. New version held privately, previous approved version stays live. Cleared automatically or by a moderator.
2. Adult-content review. Content flagged as potentially adult or sexually suggestive. New version held privately, previous version usually stays live unless it carries the same flag. Requires human review before approval.
3. Critical safety review. Content flagged for potential harm to others, including any minor-safety signal. Entire profile leaves all public surfaces immediately, including the previously approved version. Human review required, with escalation per the child-safety escalation policy (MOD-003). The owner sees only the generic hidden state.

## Interaction with existing work

- Profile save flow (PROFILE-002): save endpoint continues to accept and store content. Moderation state gates distribution downstream, not the save itself.
- Discovery (DISC-001, DISC-002): feed and search queries must filter on approval state server-side, alongside the existing `isPublic` filter.
- Bumps (DISC-005): bump eligibility checks approval state before touching `lastBumpedAt` or reporting success.
- Reports and blocks (MOD-001): user reports can move a profile into review tiers. Admin actions (ADMIN-001) can set the hidden state directly.

## Open questions

For legal, policy, and implementation review before build:

- Does an appeal mechanism exist at launch, or is "contact support" sufficient?
- How long may content stay in pending review before auto-approval or forced human review?
- Do we retain rejected versions, and for how long, for audit and appeal purposes?
- Should pending review affect the owner's ability to bump at all, or only the bump's public effect?
- Which locales need the moderation copy at launch, and who signs off on the wording?
- Does a hidden profile's owner keep access to messaging-adjacent features (saved lists, notifications), or is hiding always paired with account-level restrictions?
