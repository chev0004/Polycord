import 'server-only';

import { NextResponse } from 'next/server';
import {
  consumeRateLimit,
  logSuspiciousActivity,
  peekRateLimit,
  type RateLimitResult,
} from '@/db';

export type RateLimitAction = 'report' | 'bump' | 'copy' | 'auth-failure';

export type RateLimitSubject = {
  userId?: string;
  ip?: string | null;
};

const DEFAULT_LIMITS: Record<
  RateLimitAction,
  { max: number; windowMs: number }
> = {
  report: { max: 5, windowMs: 3_600_000 },
  bump: { max: 10, windowMs: 60_000 },
  copy: { max: 30, windowMs: 3_600_000 },
  'auth-failure': { max: 10, windowMs: 900_000 },
};

export const getRateLimit = (action: RateLimitAction) => {
  const raw =
    process.env[
      `POLYCORD_RATE_LIMIT_${action.replace('-', '_').toUpperCase()}`
    ];
  const match = raw?.match(/^(\d+):(\d+)$/);

  if (!match) {
    return DEFAULT_LIMITS[action];
  }

  return { max: Number(match[1]), windowMs: Number(match[2]) * 1000 };
};

const subjectKey = (subject: RateLimitSubject) =>
  subject.userId ? `user:${subject.userId}` : `ip:${subject.ip ?? 'unknown'}`;

export const enforceRateLimit = async (
  action: RateLimitAction,
  subject: RateLimitSubject,
): Promise<RateLimitResult> => {
  const { max, windowMs } = getRateLimit(action);
  const result = await consumeRateLimit(
    action,
    subjectKey(subject),
    max,
    windowMs,
  );

  if (!result.allowed) {
    await logSuspiciousActivity({
      action,
      userId: subject.userId ?? null,
      ip: subject.ip ?? null,
    });
  }

  return result;
};

export const isRateLimited = async (
  action: RateLimitAction,
  subject: RateLimitSubject,
): Promise<boolean> => {
  const { max, windowMs } = getRateLimit(action);
  const result = await peekRateLimit(
    action,
    subjectKey(subject),
    max,
    windowMs,
  );

  return !result.allowed;
};

export const requestIp = (request: Request) =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;

export const rateLimitedResponse = (retryAfterMs: number) =>
  NextResponse.json(
    { error: 'Too many requests', retryAfterMs },
    {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) },
    },
  );
