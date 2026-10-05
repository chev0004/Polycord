import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import {
  BAN_CHECK_AUTH_HEADER,
  createBanCheckToken,
} from '../../src/lib/auth-session';

process.env.AUTH_SECRET = 'disc027-local-function-verification';
const result = execFileSync(
  'node',
  [
    '--input-type=module',
    '-e',
    `import assert from 'node:assert/strict';
    import { pathToFileURL } from 'node:url';
    const { default: check, config } = await import(pathToFileURL(process.argv[1]));
    let input=''; for await (const chunk of process.stdin) input+=chunk;
    const {token,header}=JSON.parse(input);
    assert.deepEqual(config,{path:'/api/internal/ban-check',method:'POST'});
    for (const [body,auth,status] of [[{},null,403],[{},token,400],[{ip:null,discordUserIds:[]},token,503]]) {
      const started=performance.now();
      const response=await check(new Request('https://unused.invalid/api/internal/ban-check',{
        method:'POST',headers:{'content-type':'application/json',...(auth&&{[header]:auth})},body:JSON.stringify(body)
      }));
      assert.equal(response.status,status); assert.equal(response.headers.get('cache-control'),'no-store');
      assert.ok(performance.now()-started<3500);
    }
    console.log('Compiled Node function: authentication, input, unavailable database and no-store passed');`,
    resolve('netlify/functions/ban-check.mjs'),
  ],
  {
    input: JSON.stringify({
      token: await createBanCheckToken(),
      header: BAN_CHECK_AUTH_HEADER,
    }),
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://unused:unused@127.0.0.1:1/unused',
      DISC027_TIMING: 'false',
    },
  },
);
assert.ok(result.includes('passed'));
process.stdout.write(result);
