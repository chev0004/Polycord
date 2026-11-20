# GitHub Actions Budget

Baseline, budget and fallback for running Polycord CI from a private repository on GitHub Free. The repository is public today, so standard Ubuntu runners are free and none of the figures below are charged yet.

## Decision

| Item | Decision |
| --- | --- |
| GitHub plan | Free, staying on Free |
| Netlify plan | Free, staying on Free |
| Actions overage budget | $0 with a hard stop. Usage stops at the included allowance and nothing is ever billed |
| Deployments | Owner-run from a Linux checkout, never from GitHub Actions once private. See [owner-run deployment](../staging-deployment.md#owner-run-deployment) |
| Visibility | Private, after the owner-run staging deploy is proven. See [making the repository private](../staging-deployment.md#making-the-repository-private) |

## Plan and Entitlements

| Item | GitHub Free, private repository | Source |
| --- | --- | --- |
| Included compute | $12 a month, about 2,000 Linux minutes | GitHub billing docs, Nov 19 2026 |
| Linux 2-core rate | $0.006 per minute, each job rounded up to a whole minute, re-runs billed again | GitHub billing docs |
| Artifact storage | 500 MB | GitHub billing docs |
| Cache storage | 10 GB per repository, separate from artifact storage | GitHub billing docs |
| Environment secrets | Not available. Free offers them in public repositories only | GitHub environments docs |
| Deployment branch policies, required reviewers, wait timers | Not available | GitHub environments docs |
| Repository secrets | Available, and passed to `pull_request` runs from branches in this repository | GitHub secrets docs |

The `staging` environment's `NETLIFY_AUTH_TOKEN` and `DATABASE_URL` stop working when the repository becomes private. Moving them to repository secrets would hand deployment credentials to every pull request job from a branch in this repository, so they leave GitHub instead and deployments become owner-run.

## Hard Stop

Without a payment method on the account, GitHub blocks hosted runners once the included usage is used up, so nothing can be billed. If a payment method is ever added, set an Actions budget of $0 with **Stop usage when budget limit is reached** at Settings, Billing and licensing, Budgets and alerts before changing visibility.

When the stop is reached, until the next billing cycle:

- Pull request and `develop` runs do not start, so no `CI result` evidence is produced and ticket sync stops. Run `bun run tickets sync` locally after merges.
- The Husky pre-push hook still runs `check:all` locally on every push that changes more than docs.
- Staging and production keep serving their last verified deploys. Owner-run deploys continue: without a passing `CI result`, they run the full suite locally against a disposable database before packaging.
- When the cycle resets, re-run the newest `develop` workflow so `CI result` and `staging/published` evidence catch up.

## Measured Usage

Source: Actions run and job records for `chev0004/Polycord`, Sep 24 to Nov 19 2026 (1,000 runs, the API listing limit). Billed minutes round each job up to the next minute, the way private-repository usage is charged. Runs before Sep 24 are not included.

| Window | PR runs | PR minutes | Develop runs | Develop minutes | Ticket sync | Total |
| --- | --- | --- | --- | --- | --- | --- |
| Sep 24 to Oct 23 (busy month) | 491 | 8,180 | 252 | 3,801 | 247 | 12,228 |
| Oct 12 to Oct 18 (busy week) | 80 | 2,708 | 41 | 875 | 41 | 3,624 |
| Oct 19 to Nov 19 (quiet month) | 8 | 242 | 0 | 0 | 0 | 242 |

Within the busy month, failed runs used 2,315 minutes, canceled runs 496, retried runs 1,507 across all attempts, and staging deploy jobs 99.

The current suite costs more per run than the September runs did:

| Run type | Billed minutes | Wall time |
| --- | --- | --- |
| PR run (Nov 19, seven runs) | 29 to 31 (e2e 16 to 18, storybook 6 to 8, unit 3, package 2 to 3, gate 1) | about 7 minutes |
| Validated develop run (Oct 12 to 18, 26 runs) | 32 average | |
| Develop run skipped by the gate | 1 | |

Storage on Nov 19: 684 MB of unexpired artifacts (failure uploads kept for the 90-day default) and 2.2 GB of cache across 14 entries. Artifact storage is over the Free plan's 500 MB, so failure uploads need a shorter retention before the switch.

## Forecast on Free

Assumes the current per-run cost and that about 63% of develop pushes run full validation (the Oct 12 to 18 share).

| Scenario | Minutes needed | Fits in 2,000? | When the allowance runs out |
| --- | --- | --- | --- |
| Busy month (Sep 24 to Oct 23 activity) | about 20,100 | No | About day 4 at the busy-week rate |
| Half that activity | about 10,000 | No | About day 6 |
| Quiet month (Oct 19 to Nov 19 activity) | about 250 | Yes | Never |

2,000 minutes buys about 65 full PR runs, or about 220 docs and copy PRs once scoped plans are on (about 9 minutes each), or any mix in between. Develop runs that reuse PR evidence cost 1 minute instead of 32. In a busy month the allowance still runs out early, and the rest of the month relies on the local checks and owner-run deploys above.

## Publish Cadence

Owner-run deploys use no Actions minutes and no Netlify build minutes, but each one is a Netlify production deploy. Staging and production sit on the same free Netlify team, so they share its allowance:

| Netlify team type | Allowance | Cadence |
| --- | --- | --- |
| Credit-based Free (teams created from September 2025) | 300 credits a month. A deploy costs 15, bandwidth 20 per GB, compute 10 per GB-hour, requests 2 per 10,000. Every site on the team pauses when credits run out | Keep deploys to about 6 a month in total (90 credits), for example one staging publish a week plus a release, leaving the rest for production traffic. Check Usage before every deploy once production is live |
| Legacy Free (created before September 2025) | 100 GB bandwidth, 300 build minutes, 125,000 function invocations per site a month. Deploys are not metered | Publish staging after each batch of merges, up to once a day |

The team type for `The Chevvy Archives` has not been read yet: it is under Netlify, Team settings, Usage and billing. Record it here before choosing between the two rows.

## Monitoring

GitHub emails the owner at 90% and 100% of included usage. Review the Actions usage report at Settings, Billing and licensing, Usage weekly during active development and after any burst of merges. Review Netlify usage on the team's Usage page before each staging publish when the team is credit-based.

## Cutover Checks

Before visibility changes:

1. The owner-run staging deploy succeeds once from the `develop` tip, following [making the repository private](../staging-deployment.md#making-the-repository-private).
2. Failure-upload retention is short enough to keep artifacts under 500 MB.

After visibility changes, confirm with real runs:

1. A normal PR runs the Tests workflow.
2. Ticket sync updates Notion from the PR.
3. Record the first month of billed usage from the billing usage report here.
