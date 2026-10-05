import assert from 'node:assert/strict';

const resources = [
  {
    project: 'ftlxjximfprlplbihcph',
    site: 'polycord-test006-supabase',
    id: '69325f10-4cec-4ed6-a390-7a6392a48470',
  },
  {
    project: 'vioatoyjsfzqrpohliaa',
    site: 'polycord-disc027-supabase',
    id: '0c36e849-7617-4665-a657-1eb2b60da3d2',
  },
];

export const sandboxResource = (connectionString) => {
  const url = new URL(connectionString);
  const resource = resources.find(
    ({ project }) => url.username === `postgres.${project}`,
  );
  assert.ok(resource, 'Known disposable database required');
  assert.equal(url.hostname, 'aws-0-us-east-2.pooler.supabase.com');
  assert.equal(url.pathname, '/postgres');
  assert.ok(['5432', '6543'].includes(url.port));
  return resource;
};

export const sandboxOrigin = (origin, resource, immutable = false) => {
  const prefix = immutable ? '[a-f0-9]{24}--' : '(?:[a-f0-9]{24}--)?';
  assert.match(
    origin,
    new RegExp(`^https://${prefix}${resource.site}\\.netlify\\.app$`),
  );
};
