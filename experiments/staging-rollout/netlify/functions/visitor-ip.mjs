import {
  BAN_CHECK_AUTH_HEADER,
  isBanCheckToken,
} from '../../../../src/lib/auth-session';

// biome-ignore lint/style/noDefaultExport: Netlify function entry point
export default async (request, context) => {
  if (
    process.env.SITE_ID !== '694f7324-d2b5-43b5-9de4-ae33e0b927ee' ||
    !(await isBanCheckToken(request.headers.get(BAN_CHECK_AUTH_HEADER)))
  ) {
    return new Response('Forbidden', { status: 403 });
  }
  return Response.json(
    { ip: context.ip },
    { headers: { 'Cache-Control': 'no-store' } },
  );
};
