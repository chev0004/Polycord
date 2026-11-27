import { z } from 'zod';
import { recordSponsorEvent } from '@/db';
import { scopedRoute } from '@/db/client';
import { requestIp, withinRateLimit } from '@/lib/rateLimit';
import { isSameOrigin } from '@/lib/sameOrigin';

const eventSchema = z.enum(['view', 'click']);

export const POST = scopedRoute(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const event = eventSchema.safeParse(await request.text());
    if (
      isSameOrigin(request) &&
      z.uuid().safeParse(id).success &&
      event.success &&
      (await withinRateLimit('sponsor', { ip: requestIp(request) }))
    )
      await recordSponsorEvent(id, event.data);
    return new Response(null, { status: 204 });
  },
);
