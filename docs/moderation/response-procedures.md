# Support and Safety Response

How support, privacy, safety and ban-appeal requests reach Polycord, how moderators triage and hand them off, and how urgent cases escalate. The intake paths are the ones AUTH-004 built: the in-app report action and the moderators in the Polycord Discord server, linked from the footer and the ban screen through `NEXT_PUBLIC_DISCORD_INVITE_URL`.

The owner assigns moderators and responders and approves the policies referenced here. This document does not assign anyone.

## Intake

| Request | Who can send it | Arrives in | Notes |
| --- | --- | --- | --- |
| Report a profile | Signed-in members | Admin, Reports queue (`/[lang]/admin`) | Reason is one of spam, harassment, inappropriate, impersonation, disruptive profile or other, with optional details |
| General support | Anyone, signed in or out | Polycord Discord server | The footer link works while signed out |
| Privacy request (access, correction, deletion, restriction) | Anyone | Polycord Discord server | Export and deletion are self-service in Settings; route only requests those controls cannot handle |
| Safety concern without an account, or about something outside a profile | Anyone | Polycord Discord server | |
| Ban appeal | Banned accounts and blocked IPs | Polycord Discord server | The ban screen shows the reference and a Discord button and is reachable while banned |

Requests in Discord move to a private moderator channel or direct messages straight away. Never ask anyone to post personal data, screenshots of other people or abusive material in a public channel.

## Triage

Check the Reports queue and the Discord intake at least once a day, and immediately after any urgent signal.

1. **Urgent first.** Treat a report as urgent if it involves a minor's safety, sexual content involving minors, grooming, credible threats of violence or self-harm, or doxxing. Reports have no urgent reason, so read every `inappropriate` and `other` report's details before the rest of the queue.
2. **Identify the account.** In Admin, search by Discord ID, Discord username or display name, then open the case.
3. **Decide and act.** Moderators can warn (with a category or note), hide or unhide the profile, and suspend for 1 to 90 days or unsuspend. Ban and unban are owner-only actions. Add a note to every action, since it is stored in the moderation history and later moderators read it.
4. **Close the report** as reviewed or dismissed.
5. **Reply** to Discord requests with the outcome, without revealing who reported whom.

## Confidentiality

Reporter identities appear only on admin routes behind staff checks, and the reported member is never told who reported them. Moderators must not repeat reporter names or report details outside the moderator channel, including in replies to the reported member.

## Urgent escalation

1. Hide the profile and suspend the account at once to stop further contact. Add a note.
2. For suspected child exploitation, do not download, copy, forward or screenshot the material. Note only the profile, account and time.
3. Tell the primary responder named by the owner immediately, by the channel the owner set up for urgent cases.
4. The owner decides whether to report to Discord's Trust and Safety team or to the authorities, and records that decision. Moderators do not contact authorities themselves.
5. The owner bans the account if needed, and considers an IP block following [hard bans](hard-bans.md).

## Ban appeals

1. Ask the person for their Discord username or ID and the reference shown on their ban screen (`PC-XXXX-XXXX`).
2. Find the account in Admin and read the ban note in its moderation history.
3. The ban reference is a hash and cannot be searched in Admin, so it cannot be checked against the account. Confirm the identity through the Discord account sending the appeal.
4. Hand the appeal to the owner, who decides, unbans or keeps the ban, and notes the decision. A moderator replies with the outcome.

## Privacy requests

1. Point the person to Settings for export and deletion first.
2. For anything else, verify that the request comes from the Discord account linked to the Polycord account.
3. Hand the request to the owner, who completes it and records the date. Deletion removes the data listed in the Privacy Policy. Moderation restrictions and audit records stay, as the policy states.

## Handoff

When a case passes to another moderator or to the owner, the moderation notes and the report status carry the state. In the moderator channel, post only the case link and what is still needed, never personal data.

## Rehearsal

Synthetic cases only. No real member data, and no contact with real authorities.

| Case | Path exercised | Expected result | Evidence | Status |
| --- | --- | --- | --- | --- |
| Harassment report from a signed-in member | Report action, Reports queue, warn, close | Report reaches the queue and moves to resolved after the action; reporter hidden from the reported member | Automated: `e2e/admin-report-pages.pw.ts`, `e2e/safety.pw.ts`, `tests/integration/moderation.mjs` | Verified 2026-11-19: the four suites above plus `e2e/account.pw.ts` and `e2e/ip-bans.pw.ts`, 19 tests, passed on a disposable database |
| Urgent child-safety report | Report as `other` with details, hide, suspend, escalate | Profile hidden and account suspended at once; responder identified | Moderator walkthrough | Pending: owner names the responder and urgent channel |
| Signed-out support question | Footer Discord link | Reaches the moderator channel | Synthetic Discord message | Pending: invite URL and moderators |
| Privacy deletion request | Discord, Settings deletion | Self-service deletion succeeds; leftover request goes to the owner | Automated deletion: `e2e/account.pw.ts`; Discord step pending | Partly verified |
| Ban appeal | Ban screen Discord button, Admin search, owner unban | Moderator finds the account; owner records the decision | Ban screen: `e2e/ip-bans.pw.ts`; owner ban and unban: `e2e/journeys.pw.ts`; Discord step pending | Partly verified |

## Findings

- Reports have no reason for child safety or imminent harm, so urgent reports can sit among routine `other` and `inappropriate` reports. Triage reads those first until a dedicated reason or priority exists.
- Ban references cannot be looked up in Admin, so appeals rely on the Discord account to identify the person.
