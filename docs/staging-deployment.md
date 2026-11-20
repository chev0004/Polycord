# Staging deployment

The existing Polycord repository builds staging in GitHub Actions and uploads
the prepared Next.js static files, server function and edge handlers to
`polycord.chev.dev`. Netlify continues hosting the application. No separate
repository is needed.

## Activation

1. Create a GitHub environment named `staging`, restricted to the `develop`
   branch. Store `NETLIFY_AUTH_TOKEN` and `DATABASE_URL` as environment
   secrets, not in the repository or workflow file. Netlify masks secret
   variables, so `DATABASE_URL` must come from GitHub.
2. Set the repository variable `NETLIFY_STAGING_DEPLOY_ENABLED` to `true` when
   ready to cut over. Until enabled, the deployment job is skipped.
3. Stop builds on Netlify site `694f7324-d2b5-43b5-9de4-ae33e0b927ee` after
   verifying the replacement package. Preserve the current working deployment.
4. Merge the deployment PR into `develop`. Its successful Tests workflow can
   publish staging after both the browser/unit and Storybook jobs pass.

The deployment job accepts only `develop` in `chev0004/Polycord` and serializes
uploads. PRs and forks cannot invoke the deployment job. The deployment secret
is restricted to the staging environment. Keep fork PR tests separate from
privileged deployment.

## Develop runs

Every push to `develop` starts the Tests workflow, including docs-only pushes.
Its gate job runs `scripts/develop-plan.mjs`, which decides whether to validate
and deploy:

- After each verified publish, the deployment job sets the
  `staging/published` commit status on the source commit. The gate looks for
  the newest such status in the last 50 first-parent commits. When the only
  differences from it are docs, tests or stories (`scripts/deploy-inputs.mjs`),
  the run validates and builds nothing.
- When the push is a merged PR whose Tests run passed on the exact landed tree,
  the run deploys without repeating validation. See [CI result](#ci-result).
- A stale gate skips its push. The latest push owns validation until an equivalent
  publish is recorded.
- Otherwise, including when the status, history or GitHub API is unavailable,
  the run validates fully and then deploys.

Validation jobs that already started finish independently. Deploy jobs queue
without replacing pending jobs and recheck freshness before packaging and upload.

## PR job plans

The gate runs `scripts/ci-plan.mjs` on the PR merge diff. Static checks
(Biome, locale checks and TypeScript) run in their own job before any unit,
package, browser or Storybook job starts, so a failing static check starts
nothing expensive. The gate summary lists the reason for every planned and
skipped job.

| Changed files | Jobs |
| --- | --- |
| Docs only (`*.md`, `docs/`, `LICENSE`) | none |
| Story files (`src/**/*.stories.tsx`) | static, Storybook |
| Locale copy with unchanged parsed message structure and a known coverage mapping | static and the jobs mapped to the changed keys |
| `scripts/tickets.ts`, Husky hooks, `commitlint.config.mjs` | static |
| Anything else, including a mix with anything else, or an unavailable diff | everything |

Scoped plans apply only when the repository variable `CI_SCOPED_PLANS` is
`true`. Until then every non-docs PR runs everything, and the gate summary
records which jobs the scoped plan would have skipped, so plans can be compared
with full runs before skips are enabled. Docs-only PRs skip validation either
way. To force the full suite on a scoped PR, add the `full-ci` label and re-run
the workflow.

## CI result

Every Tests run ends with the `CI result` job. It passes only when the gate
succeeded and every job the gate planned succeeded, and staging requires it.
Use `CI result` as the single required status check for `develop` where the
plan supports branch protection.

For a validated PR from this repository, `CI result` sets a `ci/result` commit
status on the PR head with the checked-out merge tree
(`git rev-parse HEAD^{tree}`) and a hash of the CI policy files
(`scripts/ci-evidence.mjs`). After the merge, the develop gate reuses that run
only when:

- the PR's merge commit is the pushed commit, and the status tree and policy
  match the landed commit;
- the merge changed none of the CI policy files, so the run used the reviewed
  workflow;
- GitHub's run record is the Tests workflow for that PR head in this
  repository, and its latest attempt completed successfully;
- every job in that attempt succeeded or was skipped, and every job the landed
  diff's plan requires succeeded. A scoped run is reused only when its jobs
  cover that plan.

If the PR run is still active, the gate waits up to 15 minutes for it. A base
that advanced after the run, a canceled or incomplete job, a later attempt than
the one that recorded the status, a fork PR, a direct push or any missing record takes full validation.

## Environment changes and manual deployment

Keep application variables on the Netlify staging site. This site's main
deployment uses the Netlify **production** context even though the site is
called staging. The job resolves the current build variables from that context
at every run, masks them before printing build output and uses an offline local
Netlify build. Do not print raw environment responses or upload them as artifacts.

After changing a variable, open **GitHub > Polycord > Actions > Tests > Run
workflow**, choose **develop**, and run it. No code commit is required. A manual
run always validates fully before rebuilding and uploading the latest
configuration, even when staging already serves the same code. Use the same
path to republish after restoring an older deploy in Netlify, because the gate
trusts the newest `staging/published` status.

The build retains `scripts/check-migrations.ts`. Pending migrations fail the
job; deployment never applies migrations automatically. Node 22, Bun 1.3.14,
Netlify CLI 27.11.0 and Next adapter 5.16.2 are pinned for packaging compatibility.

The upload uses `--no-build --dir .netlify/static --prod` on the exact staging
site. The job verifies the ready deployment has no hosted build job, the
published server digest matches the prepared archive, and the runtime is Node
22. If post-upload verification fails while that deployment is still serving,
the job restores the previous immutable deployment.

## Owner-run deployment

The owner can publish staging without GitHub Actions, using the same script and checks. This is the only staging path once the repository is private on GitHub Free, because environment secrets then stop working and repository secrets would reach every pull request job from a branch in this repository. Deployment credentials stay with the owner and never go into GitHub.

The Netlify Next adapter cannot package on Windows, so run it on Linux. The supported environment is a GitHub Codespace on this repository, which uses the separate Codespaces allowance (120 core-hours a month on Free), not Actions minutes.

Once, in GitHub, Settings, Codespaces, Secrets, add these user secrets with access limited to `chev0004/Polycord`. Codespaces secret names cannot start with `GITHUB_`:

| Secret | Value |
| --- | --- |
| `NETLIFY_AUTH_TOKEN` | A Netlify personal access token with an expiry |
| `POLYCORD_GITHUB_TOKEN` | A fine-grained token for this repository only: Checks read, Commit statuses read and write |
| `STAGING_DATABASE_URL` | The staging database's session pooler URL (Supabase, Connect, Session pooler), because codespaces cannot reach the IPv6-only direct URL |

To publish, create a 4-core codespace on `develop` and run:

```sh
nvm install 22
curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.14" && export PATH="$HOME/.bun/bin:$PATH"
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=polycord_test postgres:17
git fetch origin && git switch --detach origin/develop
bun install --frozen-lockfile && bunx playwright install --with-deps chromium
export GITHUB_TOKEN="$POLYCORD_GITHUB_TOKEN" DATABASE_URL="$STAGING_DATABASE_URL" \
  TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/polycord_test \
  NODE_OPTIONS=--max-old-space-size=8192
unset POLYCORD_GITHUB_TOKEN STAGING_DATABASE_URL
node scripts/deploy-staging.mjs
```

Codespaces puts every user secret into each shell, and the deploy script only strips the names it uses, so the `unset` keeps the original copies away from the test suite. Stop the codespace afterwards. The Postgres container is the disposable test database; it never holds staging or production data.

The script refuses to run on another platform or Node version, from a checkout with local changes or from anything other than the current `develop` tip. When the commit has a passing `CI result` check, it relies on that. Otherwise, for example once Actions minutes run out, it runs the full suite against a disposable local `TEST_DATABASE_URL` named `polycord_test` (or a database with that prefix) without the deployment tokens in the environment and stops on the first failure. Then it packages, checks migrations, uploads, verifies the digest, restores the previous deploy on failure and records `staging/published` exactly as the Actions job does. The summary says which validation it relied on.

## Making the repository private

Before switching visibility, while the Actions job still works:

1. Run one owner-run deployment of the current `develop` tip and confirm the summary, `/api/build` and that `polycord.chev.dev` pages, `robots.txt` and CSS still send `X-Robots-Tag: noindex, nofollow`.
2. Set `NETLIFY_STAGING_DEPLOY_ENABLED` to `false`, then delete the `staging` environment's secrets. Do not move them to repository secrets.
3. Switch visibility. Pull request and `develop` validation keep running within the Free plan's Actions allowance and stop when it runs out; deploys continue through the owner path.

If the domain is confirmed, staging moves to `staging.polycord.net`: add it as the staging site's custom domain, update the domain in `scripts/deploy-staging.mjs`, the `noindex` host in `next.config.ts`, `DISCORD_REDIRECT_URI` and the Discord redirect list.

## Access

Netlify Free has no password protection, so staging is public to anyone who has its address: `polycord.chev.dev`, `polycord-staging.netlify.app` and each deploy permalink (`<deploy ID>--polycord-staging.netlify.app`) all answer without signing in. Netlify adds `noindex` to deploy permalinks and `netlify.toml` adds it to static files on every host. `next.config.ts` adds it to pages on `polycord.chev.dev` only, so `polycord-staging.netlify.app` pages are indexable until DEV-034 scopes indexing to the production origin. Treat it as public and never put production or real member data there. Set the staging site's deploy log visibility to private, because the deploy list, including permalinks and source commits, is otherwise readable through the Netlify API without a token.

## Reversal

Set `NETLIFY_STAGING_DEPLOY_ENABLED` to `false` and cancel any running deployment
job. Restore the previous working deployment if necessary, then activate builds
on the same Netlify site. Activation alone does not start a build; trigger one
in Netlify or push a new commit. Retain the previous deploy until the next
deployment is verified.

Building in GitHub uses GitHub runner resources instead of Netlify build
minutes. Netlify hosting, function execution and bandwidth usage still apply.
