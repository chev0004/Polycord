import { NextResponse } from 'next/server';
import { z } from 'zod';
import { deleteSponsor, setSponsorPaused } from '@/db';
import { scopedRoute } from '@/db/client';
import { authorizeOwner, readBody } from '@/lib/admin';

type Params = { params: Promise<{ id: string }> };

const pauseSchema = z.object({ paused: z.boolean() });

const sponsorId = async (params: Params['params']) => {
  const { id } = await params;
  return z.uuid().safeParse(id).success ? id : null;
};

export const PATCH = scopedRoute(
  async (request: Request, { params }: Params) => {
    const { error } = await authorizeOwner(request);
    if (error) return error;

    const [id, body] = await Promise.all([
      sponsorId(params),
      readBody(request, pauseSchema),
    ]);
    if (!id || !body)
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const sponsor = await setSponsorPaused(id, body.paused);
    if (!sponsor)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ sponsor });
  },
);

export const DELETE = scopedRoute(
  async (request: Request, { params }: Params) => {
    const { error } = await authorizeOwner(request);
    if (error) return error;

    const id = await sponsorId(params);
    if (!id || !(await deleteSponsor(id)))
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return new Response(null, { status: 204 });
  },
);
