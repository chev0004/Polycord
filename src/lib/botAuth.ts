import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

const digest = (value: string) => createHash('sha256').update(value).digest();

export const isBotRequest = (request: Request) => {
  const key = process.env.POLYCORD_BOT_KEY;
  const given = request.headers.get('authorization')?.replace(/^Bearer /, '');

  if (!key || !given) {
    return false;
  }

  return timingSafeEqual(digest(key), digest(given));
};

export const botUnauthorized = () =>
  NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } },
  );
