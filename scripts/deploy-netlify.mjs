import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFile } from 'node:fs/promises';
import { checkNetlifyPackage } from './check-netlify-package.mjs';
import { deployableChanges } from './deploy-inputs.mjs';

const repository = 'chev0004/Polycord';

const fullValidation = [
  ['bunx', 'drizzle-kit', 'migrate'],
  ['bun', 'run', 'check:all'],
  [process.execPath, '--test', 'scripts/*.node.mjs'],
  ['bun', 'test'],
  [
    'env',
    'NEXT_PUBLIC_DISCOVERY_SKELETON_ENABLED=true',
    'bun',
    'run',
    'test:e2e',
  ],
  [
    'env',
    'NEXT_PUBLIC_DISCOVERY_SKELETON_ENABLED=false',
    'bun',
    'run',
    'test:e2e',
    'e2e/discovery-bar-only.pw.ts',
    'e2e/dev-settings.pw.ts',
  ],
  ['bun', 'run', 'build-storybook'],
  ['bun', 'run', 'test:storybook'],
];

export async function deployNetlify(target, run = spawnSync, request = fetch) {
  const { name, siteId, domain, branch, events } = target;
  const actions = process.env.GITHUB_ACTIONS === 'true';
  if (actions) {
    assert.equal(process.env.GITHUB_REPOSITORY, repository);
    assert.equal(process.env.GITHUB_REF, `refs/heads/${branch}`);
    assert.ok(events.includes(process.env.GITHUB_EVENT_NAME));
  }
  assert.ok(siteId, 'Netlify site ID is required');
  assert.ok(domain, 'Site domain is required');
  assert.ok(process.env.NETLIFY_AUTH_TOKEN, 'Netlify credential is required');
  assert.ok(process.env.DATABASE_URL, `${name} database URL is required`);
  assert.ok(process.env.GITHUB_TOKEN, 'GitHub token is required');
  assert.ok(process.version.startsWith('v22.'), 'Node 22 is required');
  assert.equal(process.platform, 'linux', 'Package on Linux');

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
    request(`https://api.github.com/repos/${repository}/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
      },
    });
  const sha = execute('git', ['rev-parse', 'HEAD']).trim();
  const tip = () =>
    execute('git', ['ls-remote', 'origin', `refs/heads/${branch}`]).split(
      /\s/,
    )[0];
  const current = () => {
    const latest = tip();
    if (latest === sha) return true;
    execute('git', ['fetch', '--depth=1', 'origin', latest]);
    const changes = deployableChanges(sha, latest, run);
    assert.ok(changes, `Cannot compare with the ${branch} tip`);
    return changes.length === 0;
  };
  const validate = async () => {
    if (actions) return 'Tests workflow';
    const response = await github(
      `commits/${sha}/check-runs?check_name=CI%20result`,
    );
    assert.ok(response.ok, `CI lookup failed (${response.status})`);
    const { check_runs } = await response.json();
    if (check_runs.some(({ conclusion }) => conclusion === 'success'))
      return 'CI result';
    const database = URL.parse(process.env.TEST_DATABASE_URL ?? '');
    const deployDatabase = new URL(process.env.DATABASE_URL);
    assert.ok(
      database &&
        ['postgresql:', 'postgres:'].includes(database.protocol) &&
        ['localhost', '127.0.0.1'].includes(database.hostname) &&
        database.pathname.startsWith('/polycord_test') &&
        database.pathname.toLowerCase() !==
          deployDatabase.pathname.toLowerCase() &&
        !database.search,
      'No passing CI result: set TEST_DATABASE_URL to a disposable local polycord_test database',
    );
    const env = {
      ...process.env,
      DATABASE_URL: database.href,
      NETLIFY_AUTH_TOKEN: undefined,
      GITHUB_TOKEN: undefined,
    };
    for (const [command, ...args] of fullValidation)
      execute(command, args, env, true);
    return 'full local suite';
  };
  if (actions) assert.equal(sha, process.env.GITHUB_SHA);
  else {
    assert.equal(
      execute('git', ['status', '--porcelain']),
      '',
      'Deploy from a clean checkout',
    );
    assert.equal(tip(), sha, `Check out the ${branch} tip`);
  }
  if (!current())
    return console.log(`Skip ${name}: ${branch} has newer deployable changes.`);
  const validation = await validate();

  const site = await api(`sites/${siteId}`);
  assert.equal(site.id, siteId);
  assert.equal(site.custom_domain, domain);
  const buildSettings = site.build_settings;
  if (target.repoBranch)
    assert.equal(buildSettings?.repo_branch, target.repoBranch);
  if (
    target.repoBranch ||
    site.git_provider ||
    buildSettings?.repo_url ||
    buildSettings?.repo_path ||
    buildSettings?.repo_branch ||
    buildSettings?.provider
  )
    assert.equal(
      buildSettings?.stop_builds,
      true,
      'Stop Netlify builds before cutover',
    );
  const readEnv = (scope) =>
    JSON.parse(
      cli([
        'env:list',
        '--site',
        siteId,
        '--context',
        'production',
        '--scope',
        scope,
        '--json',
      ]),
    );
  const values = readEnv('builds');
  assert.ok(values.AUTH_SECRET, `${name} build variables are required`);
  if (actions) {
    for (const value of Object.values(values)) {
      if (value)
        console.log(
          `::add-mask::${value.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A')}`,
        );
    }
  }
  const checks = (await target.checkValues?.(values, readEnv)) ?? [];
  const env = {
    ...process.env,
    ...values,
    DATABASE_URL: process.env.DATABASE_URL,
    NETLIFY_SITE_ID: siteId,
    SITE_ID: siteId,
    BRANCH: branch,
    COMMIT_REF: sha,
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
      `Source: ${sha}`,
      `Validation: ${validation}`,
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
  const recorded = await github(`statuses/${sha}`, {
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
