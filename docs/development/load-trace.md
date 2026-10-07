# Owner discovery load trace

Enable `POLYCORD_ENVIRONMENT=staging` and `POLYCORD_LOAD_TRACE_ENABLED=true` on the staging deployment. Leave `POLYCORD_PUBLIC_URL` unset. Production/public deployments remain disabled. Use an owner session from `POLYCORD_ADMIN_USER_IDS`.

For Netlify, apply these values to the serving staging site's production context and both function/edge scopes. The app's staging flag is distinct from Netlify's context name.

On Netlify, the existing guarded discovery document adds an owner-only trace bootstrap. The document is private and uncached. The panel appears with the hydrated controls, including browser navigation timing for the earlier blank wait, and updates until the initial grid or empty result has rendered. The viewer and first page arrive from one bootstrap request, recorded under both phases, and it must succeed before completion. Errors remain visible while retries continue counting; subsequent filters retain the completed initial trace. Reload starts a fresh trace.

The panel records document/redirect/connection/first-byte timing, controls, viewer and discovery requests, reported gate and API spans, and deferred grid readiness. Request history retains failures, cancellations and superseded responses before completion so a retry does not erase the earlier wait. Its copy button exports timing/status only. Nothing is stored or sent to an analytics service. API spans include connection/query work where the existing functions combine it; they do not represent isolated database engine execution.

Server spans arrive with each response. Parallel spans overlap. Time outside the reported gate/handler includes unexposed platform work, network/transfer and client processing and cannot be labeled purely Netlify or Supabase. Grid completion excludes remaining image downloads. The native document bootstrap is specific to the hosted Netlify adapter; local UI proof uses the Storybook trace states and isolated access tests.

Disable the flag and redeploy to remove the diagnostic. No ban transport, database setting or deadline changes are required.
