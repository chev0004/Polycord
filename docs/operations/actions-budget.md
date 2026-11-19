# GitHub Actions Budget

Baseline and forecast for running Polycord CI from a private repository. The repository is public today, so standard Ubuntu runners are free and none of the figures below are charged yet.

## Plan and Entitlements

| Item | Value | Status |
| --- | --- | --- |
| Owner plan | Not readable with the workflow token (`GET /user` returns no plan) | Owner to confirm |
| Included compute | Free: $12/month (about 2,000 Linux minutes). Pro: $18/month (about 3,000 Linux minutes) | GitHub billing docs, Nov 19 2026 |
| Linux 2-core rate | $0.006 per minute, each job rounded up to a whole minute, re-runs billed again | GitHub billing docs |
| Artifact storage | Free 500 MB, Pro 1 GB, billed hourly as GB-months, $0.25 per GB-month over | GitHub billing docs |
| Cache storage | 10 GB per repository, separate from artifact storage | GitHub billing docs |
| Environment secrets in a private repo | Pro or higher. On Free they are public-only | GitHub environments docs |
| Deployment branch policy in a private repo | Pro or higher | GitHub environments docs |
| Required reviewers and wait timers in a private repo | Not available on Free, Pro or Team | GitHub environments docs |

The `staging` environment holds `NETLIFY_AUTH_TOKEN` and `DATABASE_URL` and restricts deployment to `develop`. On GitHub Free a private repository loses both, so the staging deploy would stop working. Keeping the current staging isolation needs Pro or higher.

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

Storage on Nov 19: 684 MB of unexpired artifacts (failure uploads kept for the 90-day default) and 2.2 GB of cache across 14 entries.

## Forecast

Assumes the current per-run cost, no change to the workflow, and that about 63% of develop pushes run full validation (the Oct 12 to 18 share).

| Scenario | Minutes | Gross cost | Over Free | Over Pro |
| --- | --- | --- | --- | --- |
| Busy month (Sep 24 to Oct 23 activity) | about 20,100 | about $121 | about $109 | about $103 |
| Half that activity | about 10,000 | about $60 | about $48 | about $42 |
| Quiet month (Oct 19 to Nov 19 activity) | about 250 | about $1.50 | $0 | $0 |

Artifact storage adds at most a few cents a month at the current size. Cache stays inside the free 10 GB.

At the busy-week rate a $0 budget on Pro runs out of included minutes in about six days, after which every hosted job, including staging deploys, is blocked until the next billing cycle.

## Pending Owner Decisions

1. Confirm the plan, and whether to move to Pro before changing visibility.
2. Set the monthly Actions budget and whether it stops usage at the limit or only alerts.
3. Choose when to change visibility.

## Monitoring

GitHub emails the owner at 90% and 100% of included usage and at 75%, 90% and 100% of a budget. Review the Actions usage report at Settings, Billing and licensing, Usage weekly during active development and after any burst of merges.

When a budget with stop-usage is reached, GitHub blocks hosted runners. PR checks and the staging deploy do not run, and the published staging deploy keeps serving. To recover, raise the budget or wait for the next cycle, then re-run the newest `develop` workflow so staging catches up. Netlify publishes only a completed upload, so staging keeps serving the last verified deploy while runners are blocked.

## Cutover Checks

After visibility changes, confirm with real runs:

1. A normal PR runs the Tests workflow.
2. Ticket sync updates Notion from the PR.
3. A `develop` merge deploys staging with the environment secrets.
4. Record the first month of billed usage from the billing usage report here.
