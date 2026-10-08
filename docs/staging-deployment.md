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

The deployment job accepts only `develop` in `chev0004/Polycord`, serializes
uploads and skips commits superseded before or during packaging. PRs and forks
cannot invoke the deployment job. The deployment secret is restricted to the
staging environment. Keep fork PR tests separate from privileged deployment.

## Environment changes and manual deployment

Keep application variables on the Netlify staging site. This site's main
deployment uses the Netlify **production** context even though the site is
called staging. The job resolves the current build variables from that context
at every run, masks them before printing build output and uses an offline local
Netlify build. Do not print raw environment responses or upload them as artifacts.

After changing a variable, open **GitHub > Polycord > Actions > Tests > Run
workflow**, choose **develop**, and run it. No code commit is required. Both
checks run before rebuilding and uploading the latest configuration.

The build retains `scripts/check-migrations.ts`. Pending migrations fail the
job; deployment never applies migrations automatically. Node 22, Bun 1.3.14,
Netlify CLI 27.11.0 and Next adapter 5.16.2 are pinned for packaging compatibility.

The upload uses `--no-build --dir .netlify/static --prod` on the exact staging
site. The job verifies the ready deployment has no hosted build job, the
published server digest matches the prepared archive, and the runtime is Node
22. If post-upload verification fails while that deployment is still serving,
the job restores the previous immutable deployment.

## Reversal

Set `NETLIFY_STAGING_DEPLOY_ENABLED` to `false` and cancel any running deployment
job. Restore the previous working deployment if necessary, then activate builds
on the same Netlify site. Activation alone does not start a build; trigger one
in Netlify or push a new commit. Retain the previous deploy until the next
deployment is verified.

Building in GitHub uses GitHub runner resources instead of Netlify build
minutes. Netlify hosting, function execution and bandwidth usage still apply.
