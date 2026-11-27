import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  SPONSOR_IMAGE_MAX_BYTES,
  SPONSOR_TIERS,
  type SponsorImageSlot,
} from '@/constants/sponsors';
import { createSponsor, listSponsors } from '@/db';
import { scopedRoute } from '@/db/client';
import { authorizeOwner, getStaffRole } from '@/lib/admin';
import { getCurrentUser } from '@/lib/auth';
import { inspectSponsorImage } from '@/lib/sponsorMedia';

const sponsorSchema = z
  .object({
    tier: z.enum(SPONSOR_TIERS),
    name: z.string().trim().min(1).max(80),
    url: z.url({ protocol: /^https$/ }),
    altEn: z.string().trim().min(1).max(200),
    altJa: z.string().trim().min(1).max(200),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  })
  .refine(({ startsAt, endsAt }) => endsAt > startsAt);

const readImage = async (
  file: FormDataEntryValue | null,
  slot: SponsorImageSlot,
) => {
  if (!(file instanceof File) || file.size > SPONSOR_IMAGE_MAX_BYTES)
    return null;
  const bytes = Buffer.from(await file.arrayBuffer());
  try {
    return {
      data: bytes.toString('base64'),
      type: await inspectSponsorImage(bytes, slot),
    };
  } catch {
    return null;
  }
};

export const GET = scopedRoute(async () => {
  const currentUser = await getCurrentUser();
  if (!currentUser || (await getStaffRole(currentUser)) !== 'owner')
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ sponsors: await listSponsors() });
});

export const POST = scopedRoute(async (request: Request) => {
  const { error } = await authorizeOwner(request);
  if (error) return error;

  const form = await request.formData().catch(() => null);
  const body = sponsorSchema.safeParse(
    Object.fromEntries(form?.entries() ?? []),
  );
  if (!form || !body.success)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const banner = body.data.tier === 'banner';
  const [image, phone] = await Promise.all([
    readImage(form.get('image'), body.data.tier),
    banner ? readImage(form.get('phoneImage'), 'phone') : null,
  ]);
  if (!image || (banner && !phone))
    return NextResponse.json({ error: 'Invalid image' }, { status: 400 });

  const sponsor = await createSponsor({
    ...body.data,
    image: image.data,
    imageType: image.type,
    phoneImage: phone?.data,
    phoneImageType: phone?.type,
  });
  if (!sponsor)
    return NextResponse.json({ error: 'Fully booked' }, { status: 409 });
  return NextResponse.json({ sponsor });
});
