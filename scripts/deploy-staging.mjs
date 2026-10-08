import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFile } from 'node:fs/promises';
import { checkNetlifyPackage } from './check-netlify-package.mjs';

const siteId = '694f7324-d2b5-43b5-9de4-ae33e0b927ee';

export async function deployStaging(run = spawnSync, request = fetch) {
  assert.equal(process.env.GITHUB_REPOSITORY, 'chev0004/Polycord');
  assert.equal(process.env.GITHUB_REF, 'refs/heads/develop');
  assert.ok(
    ['push', 'workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME),
  );
  assert.ok(process.env.NETLIFY_AUTH_TOKEN, 'Netlify credential is required');
  assert.ok(process.version.startsWith('v22.'), 'Node 22 is required');

  const execute = (command, args, env = process.env, inherit = false) => {
    const result = run(command, args, {
      env,
      encoding: 'utf8',
      stdio: inherit ? 'inherit' : 'pipe',
    });
    assert.equal(result.status, 0, `${command} failed`);
    return result.stdout;
  };
  const cli = (args, env, inherit) =>
    execute(
      process.execPath,
      ['node_modules/netlify-cli/bin/run.js', ...args],
      env,
      inherit,
    );
  const api = async (path, method = 'GET') => {
    const response = await request(`https://api.netlify.com/api/v1/${path}`, {
      method,
      headers: { Authorization: `Bearer ${process.env.NETLIFY_AUTH_TOKEN}` },
    });
    assert.ok(response.ok, `Netlify request failed (${response.status})`);
    return response.json();
  };
  const current = () =>
    execute('git', ['ls-remote', 'origin', 'refs/heads/develop']).split(
      /\s/,
    )[0] === process.env.GITHUB_SHA;
  assert.equal(
    execute('git', ['rev-parse', 'HEAD']).trim(),
    process.env.GITHUB_SHA,
  );
  if (!current())
    return console.log('Skip staging: develop has a newer commit.');

  const site = await api(`sites/${siteId}`);
  assert.equal(site.id, siteId);
  assert.equal(site.custom_domain, 'polycord.chev.dev');
  assert.equal(site.build_settings.repo_branch, 'develop');
  assert.equal(
    site.build_settings.stop_builds,
    true,
    'Stop Netlify builds before cutover',
  );
  const values = JSON.parse(
    cli([
      'env:list',
      '--site',
      siteId,
      '--context',
      'production',
      '--scope',
      'builds',
      '--json',
    ]),
  );
  assert.ok(
    values.DATABASE_URL && values.AUTH_SECRET,
    'Staging build variables are required',
  );
  if (process.env.GITHUB_ACTIONS === 'true') {
    for (const value of Object.values(values)) {
      if (value)
        console.log(
          `::add-mask::${value.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A')}`,
        );
    }
  }
  const env = {
    ...process.env,
    ...values,
    NETLIFY_SITE_ID: siteId,
    SITE_ID: siteId,
    BRANCH: 'develop',
    COMMIT_REF: process.env.GITHUB_SHA,
  };
  cli(['build', '--offline', '--context', 'production'], env, true);
  const digest = await checkNetlifyPackage(
    values.NEXT_PUBLIC_DISCOVERY_SKELETON_ENABLED === 'true',
  );
  if (!current())
    return console.log('Skip staging: develop changed during packaging.');
  const uploaded = JSON.parse(
    cli(
      [
        'deploy',
        '--no-build',
        '--dir',
        '.netlify/static',
        '--prod',
        '--site',
        siteId,
        '--json',
      ],
      env,
    ),
  );
  try {
    const deploy = await api(`deploys/${uploaded.deploy_id}`);
    assert.equal(deploy.site_id, siteId);
    assert.equal(deploy.state, 'ready');
    assert.equal(deploy.build_id, null, 'Unexpected hosted Netlify build');
    const { functions } = await api(`sites/${siteId}/functions`);
    const server = functions.find(({ n }) => n === '___netlify-server-handler');
    assert.equal(server?.r, 'nodejs22.x');
    assert.equal(
      server?.d,
      digest,
      'Published server differs from prepared package',
    );
    assert.equal((await api(`sites/${siteId}`)).published_deploy.id, deploy.id);
    const summary = `Staging deployed: ${deploy.id}\nSource: ${process.env.GITHUB_SHA}\nServer SHA-256: ${digest}\nNetlify build job: none\n`;
    console.log(summary);
    if (process.env.GITHUB_STEP_SUMMARY)
      await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
  } catch (error) {
    if (
      (await api(`sites/${siteId}`)).published_deploy.id === uploaded.deploy_id
    ) {
      await api(
        `sites/${siteId}/deploys/${site.published_deploy.id}/restore`,
        'POST',
      );
      console.log(
        `Restored previous staging deployment: ${site.published_deploy.id}`,
      );
    }
    throw error;
  }
}

if (import.meta.main) {
  try {
    await deployStaging();
  } catch (error) {
    console.error(
      'Staging deployment failed:',
      error instanceof assert.AssertionError ? error.message : error.name,
    );
    process.exitCode = 1;
  }
}
