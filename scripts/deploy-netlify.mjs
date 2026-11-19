import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFile } from 'node:fs/promises';
import { checkNetlifyPackage } from './check-netlify-package.mjs';
import { deployableChanges } from './deploy-inputs.mjs';

export async function deployNetlify(target, run = spawnSync, request = fetch) {
  const { name, siteId, domain, branch, events } = target;
  assert.equal(process.env.GITHUB_REPOSITORY, 'chev0004/Polycord');
  assert.equal(process.env.GITHUB_REF, `refs/heads/${branch}`);
  assert.ok(events.includes(process.env.GITHUB_EVENT_NAME));
  assert.ok(siteId, 'Netlify site ID is required');
  assert.ok(domain, 'Site domain is required');
  assert.ok(process.env.NETLIFY_AUTH_TOKEN, 'Netlify credential is required');
  assert.ok(process.env.DATABASE_URL, `${name} database URL is required`);
  assert.ok(process.env.GITHUB_TOKEN, 'GitHub token is required');
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
  const github = (path, init = {}) =>
    request(
      `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/${path}`,
      {
        ...init,
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
        },
      },
    );
  const current = () => {
    const tip = execute('git', [
      'ls-remote',
      'origin',
      `refs/heads/${branch}`,
    ]).split(/\s/)[0];
    if (tip === process.env.GITHUB_SHA) return true;
    execute('git', ['fetch', '--depth=1', 'origin', tip]);
    const changes = deployableChanges(process.env.GITHUB_SHA, tip, run);
    assert.ok(changes, `Cannot compare with the ${branch} tip`);
    return changes.length === 0;
  };
  assert.equal(
    execute('git', ['rev-parse', 'HEAD']).trim(),
    process.env.GITHUB_SHA,
  );
  if (!current())
    return console.log(`Skip ${name}: ${branch} has newer deployable changes.`);
  if (target.requireCi) {
    const response = await github(
      `commits/${process.env.GITHUB_SHA}/check-runs?check_name=CI%20result`,
    );
    assert.ok(response.ok, `CI lookup failed (${response.status})`);
    const { check_runs } = await response.json();
    assert.ok(
      check_runs.some(({ conclusion }) => conclusion === 'success'),
      'The candidate has no passing CI result',
    );
  }

  const site = await api(`sites/${siteId}`);
  assert.equal(site.id, siteId);
  assert.equal(site.custom_domain, domain);
  if (target.repoBranch)
    assert.equal(site.build_settings.repo_branch, target.repoBranch);
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
  assert.ok(values.AUTH_SECRET, `${name} build variables are required`);
  if (process.env.GITHUB_ACTIONS === 'true') {
    for (const value of Object.values(values)) {
      if (value)
        console.log(
          `::add-mask::${value.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A')}`,
        );
    }
  }
  const checks = (await target.checkValues?.(values)) ?? [];
  const env = {
    ...process.env,
    ...values,
    DATABASE_URL: process.env.DATABASE_URL,
    NETLIFY_SITE_ID: siteId,
    SITE_ID: siteId,
    BRANCH: branch,
    COMMIT_REF: process.env.GITHUB_SHA,
  };
  cli(['build', '--offline', '--context', 'production'], env, true);
  const digest = await checkNetlifyPackage(
    values.NEXT_PUBLIC_DISCOVERY_SKELETON_ENABLED === 'true',
  );
  if (!current())
    return console.log(`Skip ${name}: ${branch} changed during packaging.`);
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
    const summary = [
      `${name} deployed: ${deploy.id}`,
      `Source: ${process.env.GITHUB_SHA}`,
      `Server SHA-256: ${digest}`,
      'Netlify build job: none',
      ...checks,
      '',
    ].join('\n');
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
        `Restored previous ${name} deployment: ${site.published_deploy.id}`,
      );
    }
    throw error;
  }
  if (!target.statusContext) return;
  const recorded = await github(`statuses/${process.env.GITHUB_SHA}`, {
    method: 'POST',
    body: JSON.stringify({
      state: 'success',
      context: target.statusContext,
      target_url: `https://${domain}`,
      description: `Netlify deploy ${uploaded.deploy_id}`,
    }),
  });
  assert.ok(
    recorded.ok,
    `Recording the published source failed (${recorded.status})`,
  );
}

export async function runDeploy(deploy, name) {
  try {
    await deploy();
  } catch (error) {
    console.error(
      `${name} deployment failed:`,
      error instanceof assert.AssertionError ? error.message : error.name,
    );
    process.exitCode = 1;
  }
}
