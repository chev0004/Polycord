import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';

export async function checkNetlifyPackage(
  skeletonEnabled = process.env.NEXT_PUBLIC_DISCOVERY_SKELETON_ENABLED ===
    'true',
) {
  await access('.netlify/static/_next/static');
  const manifest = JSON.parse(
    await readFile('.netlify/functions/manifest.json', 'utf8'),
  );
  const server = manifest.functions.find(
    ({ name }) => name === '___netlify-server-handler',
  );
  assert.equal(
    server?.runtimeVersion,
    'nodejs22.x',
    'Expected Node 22 package',
  );
  const edge = JSON.parse(
    await readFile('.netlify/edge-functions/manifest.json', 'utf8'),
  );
  assert.ok(edge.functions.length, 'Expected Next middleware');
  if (skeletonEnabled) {
    assert.ok(
      edge.functions.some(
        ({ function: name }) => name === 'polycord-discovery-shell',
      ),
      'Expected guarded discovery shell',
    );
  }
  return createHash('sha256')
    .update(await readFile('.netlify/functions/___netlify-server-handler.zip'))
    .digest('hex');
}

if (import.meta.main) {
  console.log(`Verified Netlify package: ${await checkNetlifyPackage()}`);
}
