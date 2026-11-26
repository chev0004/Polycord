# Support and Safety Response

How support, privacy, safety and ban-appeal requests reach Polycord, how moderators triage and hand them off, and how urgent cases escalate. The intake paths are the ones AUTH-004 built: the in-app report action and the moderators in the Polycord Discord server, linked from the footer and the ban screen through `NEXT_PUBLIC_DISCORD_INVITE_URL`.

Chev, the owner, handles support, privacy, safety and appeal intake and is the primary responder for urgent cases, as decided on 2026-11-26. The owner assigns any further moderators and approves the policies referenced here.

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
2. Paste the reference into Ban reference in Admin, in the moderation header on desktop or the Users tab on mobile. It shows whether the ban is an IP block or an account ban, its date, its note and the account involved, never the IP address. Account ban references shown before 2026-11-26 are not found, and the ban screen shows a current one when reopened.
3. Check that the account matches the Discord account sending the appeal, and read the ban note in its moderation history.
4. Hand the appeal to the owner, who decides, unbans or keeps the ban, and notes the decision. A moderator replies with the outcome.

## Privacy requests

1. Point the person to Settings for export and deletion first.
2. For anything else, verify that the request comes from the Discord account linked to the Polycord account.
3. Hand the request to the owner, who completes it and records the date. Deletion removes the data listed in the Privacy Policy. Moderation restrictions and audit records stay, as the policy states.

## Handoff

When a case passes to another moderator or to the owner, the moderation notes and the report status carry the state. In the moderator channel, post only the case link and what is still needed, never personal data.

## Rehearsal

Synthetic cases only. Use dedicated member, moderator and banned fixtures. Confirm the invite and assigned urgent channel with the owner before exercising them.

1. Open the footer invite while signed out and submit a synthetic support case. From Discord, submit separate synthetic privacy and safety cases. Confirm that the privacy request reaches the owner and that moderators can receive a safety concern from someone without a Polycord account through the private intake.
2. Open the ban screen with a banned fixture. Follow the invite and submit a synthetic appeal with its reference. Confirm receipt and the owner’s decision in the moderation record.
3. File a clearly labeled urgent exercise through the report form. Have the moderator triage the report and hand it off through the assigned urgent channel. Record the responder’s acknowledgment and next action. Keep the exercise within Polycord.
4. Record the candidate SHA, UTC time, test case, queue or responder role, acknowledgment time, outcome, and a redacted evidence link for each exercise.

| Case | Path exercised | Expected result | Evidence | Status |
| --- | --- | --- | --- | --- |
| Harassment report from a signed-in member | Report action, Reports queue, warn, close | Report reaches the queue and moves to resolved after the action; reporter hidden from the reported member | Automated: `e2e/admin-report-pages.pw.ts`, `e2e/safety.pw.ts`, `tests/integration/moderation.mjs` | Verified 2026-11-19: `e2e/admin-report-pages.pw.ts`, `e2e/safety.pw.ts`, `e2e/account.pw.ts` and `e2e/ip-bans.pw.ts` (19 tests) passed on a disposable database. `tests/integration/moderation.mjs` runs in CI |
| Urgent child-safety report | Report as `other` with details, hide, suspend, escalate | Profile hidden and account suspended at once; responder identified | Staging walkthrough on `750a0017` and the [rehearsal record](https://github.com/chev0004/Polycord/pull/371#issuecomment-7151054165); hide and suspend: `e2e/journeys.pw.ts` | Verified 2026-11-25: a labeled urgent report against a seeded dummy profile reached the Reports queue at 02:56 UTC, and the owner dismissed it in Admin with a rehearsal note at 03:14 UTC. The urgent handoff reached the owner, the primary responder, by private Discord message at 02:33 UTC and was acknowledged at 02:35 UTC. Hide and suspend were not applied to the dummy profile |
| Signed-out support question | Footer Discord link | Reaches moderators or the owner privately | Synthetic Discord message and the [rehearsal record](https://github.com/chev0004/Polycord/pull/371#issuecomment-7151054165) | Verified 2026-11-25: signed-out home, Terms, Privacy and Guidelines pages in English and Japanese on staging `750a0017` linked to the configured Discord server. A labeled support case reached the owner by private Discord message at 02:39 UTC |
| Safety concern from someone without a Polycord account | Footer Discord link and private intake | Moderator acknowledges the concern and records the next action | Redacted intake record in the [rehearsal record](https://github.com/chev0004/Polycord/pull/371#issuecomment-7151054165) | Verified 2026-11-25: the Discord intake needs no Polycord account. A member of the Discord server sent a labeled urgent safety case to the owner by private message at 02:33 UTC, and the owner acknowledged it in the same conversation at 02:35 UTC |
| Privacy deletion request | Discord, Settings deletion | Self-service deletion succeeds; leftover request goes to the owner | Automated deletion: `e2e/account.pw.ts`; Discord step: the [rehearsal record](https://github.com/chev0004/Polycord/pull/371#issuecomment-7151054165) | Verified 2026-11-25: a labeled privacy case reached the owner by private Discord message at 02:39 UTC |
| Ban appeal | Ban screen Discord button, Admin search, owner unban | Moderator finds the account; owner records the decision | Ban screen: `e2e/ip-bans.pw.ts`; owner ban and unban: `e2e/journeys.pw.ts`; staging walkthrough on `750a0017` and the [rehearsal record](https://github.com/chev0004/Polycord/pull/371#issuecomment-7151054165) | Verified 2026-11-25: the owner banned a test account in Admin at 03:15 UTC with a rehearsal note. It saw the ban screen with reference `PC-TW0E-JJJ6` and a Discord button to the footer invite, and the owner unbanned it in the same minute. The activity log records both actions under the owner. An appeal with a dummy reference reached the owner by private Discord message at 02:39 UTC. Reference lookup in Admin came later with ADMIN-035 and is covered by `e2e/ip-bans.pw.ts` |

## Findings

- Reports have no reason for child safety or imminent harm, so urgent reports can sit among routine `other` and `inappropriate` reports. Triage reads those first until a dedicated reason or priority exists (SAFETY-013).