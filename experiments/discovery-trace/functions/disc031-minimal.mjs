import {
  BAN_CHECK_AUTH_HEADER,
  isBanCheckToken,
} from '../../../src/lib/auth-session';
import payloads from '../../../src/lib/disc031Payloads.json' with {
  type: 'json',
};

const instance = crypto.randomUUID();
const moduleAt = performance.now();

// biome-ignore lint/style/noDefaultExport: Netlify entry point
export default async (request) => {
  const start = performance.now();
  const authenticated =
    process.env.DISC031_SITE === '0c36e849-7617-4665-a657-1eb2b60da3d2' &&
    (await isBanCheckToken(request.headers.get(BAN_CHECK_AUTH_HEADER)));
  return Response.json(
    authenticated ? payloads.discovery : { error: 'Forbidden' },
    {
      status: authenticated ? 200 : 403,
      headers: {
        'Cache-Control': 'private, no-store',
        'x-disc031-runtime': JSON.stringify({
          name: 'minimal',
          instance,
          ms: performance.now() - start,
          moduleAge: performance.now() - moduleAt,
          runtime: process.version,
        }),
      },
    },
  );
};

export const config = { path: '/api/internal/disc031-minimal' };
