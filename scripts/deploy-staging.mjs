import { spawnSync } from 'node:child_process';
import { publishedContext } from './deploy-inputs.mjs';
import { deployNetlify, runDeploy } from './deploy-netlify.mjs';

export const stagingSiteId = '694f7324-d2b5-43b5-9de4-ae33e0b927ee';

export const deployStaging = (run = spawnSync, request = fetch) =>
  deployNetlify(
    {
      name: 'Staging',
      siteId: stagingSiteId,
      domain: 'polycord.chev.dev',
      branch: 'develop',
      events: ['push', 'workflow_dispatch'],
      repoBranch: 'develop',
      statusContext: publishedContext,
    },
    run,
    request,
  );

if (import.meta.main) await runDeploy(deployStaging, 'Staging');
