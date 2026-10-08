import 'server-only';

import { RequestCookies } from 'next/dist/compiled/@edge-runtime/cookies';
import { NextResponse } from 'next/server';
import { withRequestPool } from '@/db/client';
import { findActiveIpBan } from '@/db/ipBans';
import { getSessionIdentity, isBannedIdentity } from './auth';
import {
  AUTH_BAN_COOKIE,
  type CurrentUser,
  readBanCookieValue,
} from './auth-session';
import { clientIp } from './clientIp';
import { createLoadTrace, type LoadMeasure, measureLoad } from './loadTrace';

export type Gate = {
  user: (CurrentUser & { accountId: string }) | null;
  measure: LoadMeasure;
};

const isBannedRequest = async (request: Request) => {
  const ip = clientIp(request.headers);
  const banCookie = new RequestCookies(request.headers).get(
    AUTH_BAN_COOKIE,
  )?.value;
  const bannedId = banCookie ? await readBanCookieValue(banCookie) : null;
  const [ipBan, cookieBanned] = await Promise.all([
    ip ? findActiveIpBan(ip) : null,
    bannedId ? isBannedIdentity(bannedId) : false,
  ]);
  return Boolean(ipBan) || cookieBanned;
};

const screen = async (request: Request, measure: LoadMeasure) => {
  const [banned, identity] = await Promise.all([
    measure('ban', () => isBannedRequest(request)),
    measure('account', getSessionIdentity),
  ]);
  if (banned || identity?.restriction === 'banned') return null;
  return {
    user: identity?.restriction
      ? null
      : (identity?.account?.currentUser ?? null),
    measure,
  };
};

export const gatedRoute =
  <A extends [Request, ...unknown[]]>(
    handler: (gate: Gate, ...args: A) => Promise<Response>,
  ) =>
  async (...args: A) => {
    const [request] = args;
    const trace = await createLoadTrace(request);
    const response = await withRequestPool(async () => {
      const noStore = { 'Cache-Control': 'no-store' };
      let gate: Gate | null;
      try {
        gate = await screen(request, trace?.measure ?? measureLoad);
      } catch {
        return NextResponse.json(
          { error: 'Temporarily unavailable' },
          { status: 503, headers: { ...noStore, 'Retry-After': '5' } },
        );
      }
      if (!gate) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403, headers: noStore },
        );
      }
      return handler(gate, ...args);
    });
    if (trace) {
      response.headers.set(
        'Server-Timing',
        trace.headers('handler')['Server-Timing'],
      );
    }
    return response;
  };
