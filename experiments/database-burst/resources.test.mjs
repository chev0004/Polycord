import { expect, test } from 'bun:test';
import { sandboxOrigin, sandboxResource } from './resources.mjs';

const connection = (project, port = 6543) =>
  `postgresql://postgres.${project}:unused@aws-0-us-east-2.pooler.supabase.com:${port}/postgres`;

test('sandbox jobs reject staging, unrelated projects and altered endpoints', () => {
  for (const url of [
    connection('lqyekuxzhxkjsctdpybi'),
    connection('unrelated-project'),
    connection('vioatoyjsfzqrpohliaa').replace('aws-0-', 'aws-1-'),
    connection('vioatoyjsfzqrpohliaa').replace('/postgres', '/other'),
    connection('vioatoyjsfzqrpohliaa', 5433),
  ]) {
    expect(() => sandboxResource(url)).toThrow();
  }
});

test('sandbox targets must belong to the configured disposable database', () => {
  const resource = sandboxResource(connection('vioatoyjsfzqrpohliaa'));
  const deploy =
    'https://0123456789abcdef01234567--polycord-disc027-supabase.netlify.app';
  expect(() => sandboxOrigin(deploy, resource, true)).not.toThrow();
  for (const origin of [
    'https://polycord.chev.dev',
    'https://0123456789abcdef01234567--polycord-test006-supabase.netlify.app',
    deploy.replace('https:', 'http:'),
    `${deploy}/en`,
    'https://polycord-disc027-supabase.netlify.app',
  ]) {
    expect(() => sandboxOrigin(origin, resource, true)).toThrow();
  }
});

test('retained TEST-006 jobs keep their original database and site boundary', () => {
  const resource = sandboxResource(connection('ftlxjximfprlplbihcph', 5432));
  expect(() =>
    sandboxOrigin('https://polycord-test006-supabase.netlify.app', resource),
  ).not.toThrow();
  expect(() =>
    sandboxOrigin('https://polycord-disc027-supabase.netlify.app', resource),
  ).toThrow();
});
