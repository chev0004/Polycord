import { BAN_CHECK_AUTH_HEADER, isBanCheckToken } from '@/lib/auth-session';
import { clientIp } from '@/lib/clientIp';

export const dynamic = 'force-dynamic';

export const GET = async (request: Request) => {
  if (
    new URL(process.env.DATABASE_URL as string).username !==
      'postgres.ftlxjximfprlplbihcph' ||
    !(await isBanCheckToken(request.headers.get(BAN_CHECK_AUTH_HEADER)))
  ) {
    return new Response('Forbidden', { status: 403 });
  }
  return Response.json(
    { ip: clientIp(request.headers) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
};
