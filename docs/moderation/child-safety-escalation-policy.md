# Child Safety Moderation Escalation Policy

Launch-readiness policy for how Polycord handles suspected child-safety risk in profiles, discovery content, and reports. This document sets severity levels, escalation expectations, and operational responsibilities at a product level. It does not define detection rules, keyword lists, classifier logic, storage schema, or external reporting integrations; those require the legal review and implementation work identified below before they can be built.

This policy builds on the profile moderation visibility states policy (`profile-visibility-states.md`). Every case in scope here is, at minimum, a critical safety review under that policy's tiers.

## Principles

1. Conservative by default. When a signal is ambiguous, treat it at the higher severity. Polycord is an adult-oriented matching surface for language exchange; content that sexualizes minors, solicits minors, or suggests exploitation has no legitimate variant worth preserving in public distribution.
2. Public distribution blocks are server-side and immediate. Content under critical review must not appear in discovery, search, recommendations, tag aggregation, bumps, profile cards, saved lists, or the public profile route. Client-only filtering is never sufficient.
3. Non-diagnostic user feedback. Affected accounts see only the generic hidden/pending states defined in the visibility policy. Nothing in the UI reveals what triggered review or that a child-safety process exists for their content.
4. Preserve, do not destroy. Content and account data connected to a critical case is retained for review and potential lawful requests rather than deleted, within limits that legal review must define.
5. Humans decide. Automation may hide and queue; only human review classifies a case, escalates it, or closes it.

## Severity levels

### S1: Contextual risk signal

Content or behavior that is not itself a violation but raises minor-safety context questions, e.g. a profile that states or implies the account holder is under the platform's minimum age.

- Expected handling: profile leaves public distribution pending review; standard admin review queue; outcome is either age-gate resolution (account removal per terms) or clearance.

### S2: Suspected minor sexualization or solicitation

Profile content, tags, or reported behavior suggesting sexualization of minors, sexual solicitation involving minor markers, or attempts to move minors to private channels.

- Expected handling: immediate removal from all public surfaces (the entire profile, not just the flagged field); priority position in the admin review queue; account restricted from bumps and profile edits taking public effect until review completes; human review required before any restoration.

### S3: Suspected exploitation, coercion, trafficking, or CSAM-adjacent content

Content or reports indicating exploitation, coercion, trafficking indicators, or language adjacent to child sexual abuse material.

- Expected handling: everything in S2, plus: account access suspended pending review; case flagged for legal/compliance escalation; evidence preserved under the audit expectations below; no restoration path without legal sign-off. If review confirms the case, the account is banned and the case is handed to the external reporting process once one exists.

Escalation is one-directional: reviewers may raise severity during review but must not lower it below the level the initial signal justified without recording why.

## Surfaces that must block critical content

Flagged S2/S3 content must not enter or remain in:

- Discovery feed, grid, search, filters, and recommendations
- Popular tags aggregation
- Bump queues and bump-driven ordering (no successful bump signal while held)
- Public profile route and profile cards rendered to anyone but the owner
- Saved/favorites entries rendered to other users
- Notifications embedding profile content

## Audit and review concepts

Required at a concept level; storage design is out of scope here:

- Every moderation decision on a child-safety case is recorded with who acted, what action, when, and the case it belonged to (the existing moderation audit log satisfies the shape of this).
- The content as it existed at flag time must remain reviewable even after the owner edits or deletes it, for a retention period legal review must set.
- Case records distinguish severity level, current state (queued, in review, escalated, closed), and outcome.
- Access to child-safety case content is limited to designated reviewers, not all admins, once role separation exists.

## Legal and compliance gate

The following must not be built or operated without legal/compliance review:

- External reporting workflows (e.g. NCMEC or local equivalents), including what is reported, by whom, and on what timeline
- Evidence preservation windows and deletion-request handling for content under an open case
- Jurisdictional obligations given the user base spans multiple countries
- Terms-of-service language covering minimum age, enforcement, and account termination

Until that review happens, Polycord's operational stance is: hide immediately, review by a human, ban confirmed cases, preserve the case record, and do not delete case data through ordinary account-deletion flows without legal guidance.

## Operational responsibilities

- Admin reviewers own S1/S2 triage through the existing report queue and moderation actions.
- The project owner is the escalation point for S3 until a designated safety role exists.
- Review of S2/S3 cases should happen within an explicit SLA once staffing allows; before that, the queue orders critical cases first.

## Open questions before implementation

- Which detection signals (user reports only, keyword heuristics, classifier) feed each severity level, and what are their false-positive tolerances?
- What retention period applies to preserved case content, and how does it interact with account deletion and data export (ACCOUNT-001)?
- Who is legally responsible for external reports, and in which jurisdiction is Polycord considered the operator?
- Does the platform need age verification at signup beyond Discord's own minimum-age terms?
- How are reviewers protected (exposure limits, wellness practices) once real case volume exists?
- Do S3 suspensions need a distinct non-diagnostic user-facing state, or is the generic hidden state sufficient?
