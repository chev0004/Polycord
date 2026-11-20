# Release Candidate Sign-off

Launch acceptance for the core website on the exact production candidate. Fill in this record on the candidate itself. Automated Chromium coverage is in [product acceptance](acceptance.md); this record adds the real devices, the production domain and production sign-in that automation cannot prove.

Use only dedicated test accounts that the owner created for this check. Never use real members' accounts or data. Delete the test accounts at the end, or record why they stay.

## Candidate

Fill these in before testing, and check them again before signing off. Every journey must run on the same candidate.

| Field | Value | How to read it |
| --- | --- | --- |
| Origin | | `https://polycord.net`, see [production deployment](../operations/production.md) |
| Build ID | | `GET /api/build` on the origin returns the source commit |
| Netlify deploy ID | | The owner deploy summary from `scripts/deploy-production.mjs` |
| Server SHA-256 | | The owner deploy summary |
| Validation | | The owner deploy summary: `CI result` or full local suite |
| Date and tester | | |

## Devices

| Device | Browser and version | OS version | Tester |
| --- | --- | --- | --- |
| Desktop | | | |
| iPhone (real device) | Safari | | |
| Android phone (real device) | Chrome | | |

Emulated widths and simulators do not count.

## Test accounts

| Account | Identity on Polycord | Used for |
| --- | --- | --- |
| A | New member, not yet onboarded | Sign-in, onboarding, first bump, export, deletion |
| B | Existing member with a public profile | Discovery, sharing, save, block, report target |
| C | Moderator in `POLYCORD_ADMIN_USER_IDS` or staff | Report triage, moderation |

Record only the account letter in results, never Discord usernames or IDs.

## Journeys

Mark each cell Pass, Fail (with a finding number) or N/A with a reason.

| Journey | Desktop | iPhone | Android | Account |
| --- | --- | --- | --- | --- |
| Discord web sign-in on the production domain, returning to the original page | | | | A |
| Onboarding, then first bump appears in Discovery | | | | A |
| Discovery: filters, paging, opening a profile | | | | B |
| Profile sharing: copy link, open it signed out | | | | B |
| Save and unsave a profile | | | | A |
| Block and unblock, the profile disappears for both accounts while signed in | | | | A, B |
| Report a profile, then triage and act on it in Admin | | | | A, C |
| Inbox shows the warning or notification | | | | B |
| Push: allow, receive a notification, then deny or revoke and confirm none arrives | | | | B |
| Account export downloads complete JSON | | | | A |
| Logout ends the session on that device | | | | A |
| Session expiry or revocation: a deleted or signed-out session cannot act | | | | A |
| Account deletion, then sign-in starts fresh | | | | A |
| Key routes in English and Japanese: Discovery, profile, Settings, legal pages | | | | A |

## Privacy checks

| Check | Expected | Result |
| --- | --- | --- |
| A hidden or suspended profile | Not in Discovery, its direct link and voice media unavailable to others | |
| A blocked account | Not shown in Discovery, direct link or inbox for either side while signed in | |
| Signed-out visitor | Sees public profiles; Discord username only when the member allows anonymous copying | |
| Denied notification permission | No prompt loop and no error; Settings shows notifications off | |
| `robots.txt`, `sitemap.xml` and `X-Robots-Tag` | Match [production deployment](../operations/production.md#indexing) | |

## Findings

| # | Journey | Device | What happened | Launch-blocking | Fixed in | Retested on build |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |

Fix every launch-blocking finding, deploy a new candidate, and repeat the affected journeys on it. If the candidate changes, update the Candidate table and rerun the sign-in journey on every device.

## Sign-off

| Role | Decision | Date |
| --- | --- | --- |
| Owner | | |
