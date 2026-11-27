import { z } from 'zod';
import { getSponsorImage } from '@/db';
import { scopedRoute } from '@/db/client';

export const GET = scopedRoute(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string; variant: string }> },
  ) => {
    const { id, variant } = await params;
    const image =
      z.uuid().safeParse(id).success && ['image', 'phone'].includes(variant)
        ? await getSponsorImage(id, variant === 'phone')
        : null;
    if (!image) return new Response('Not found', { status: 404 });
    return new Response(Buffer.from(image.data, 'base64'), {
      headers: {
        'Content-Type': image.type,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  },
);
