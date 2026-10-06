import { z } from 'zod';
import { LOG_ACTIONS, type LogAction } from '@/features/Admin/types';

export const ACTIVITY_PAGE_SIZE = 25;

const MAX_WINDOW_MS = 26 * 3600000;
const cursorPattern =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z)\|([0-9a-f-]{36})$/;

export type ActivityCursor = { at: string; id: string };

export type ActivityWindow = {
  from: Date;
  to: Date;
  cursor?: ActivityCursor;
  action?: LogAction;
  staffId?: string;
};

const schema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  cursor: z.string().regex(cursorPattern).optional(),
  action: z.enum(LOG_ACTIONS).optional(),
  staffId: z.string().uuid().optional(),
});

export const parseActivityWindow = (
  params: URLSearchParams,
): ActivityWindow | null => {
  const parsed = schema.safeParse({
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
    cursor: params.get('cursor') ?? undefined,
    action: params.get('action') ?? undefined,
    staffId: params.get('staffId') ?? undefined,
  });
  if (!parsed.success) return null;

  const from = new Date(parsed.data.from);
  const to = new Date(parsed.data.to);
  const span = to.getTime() - from.getTime();
  if (span <= 0 || span > MAX_WINDOW_MS) return null;

  const match = parsed.data.cursor?.match(cursorPattern);
  return {
    from,
    to,
    cursor: match ? { at: match[1], id: match[2] } : undefined,
    action: parsed.data.action,
    staffId: parsed.data.staffId,
  };
};

export const pageOf = <T extends { id: string; cursorAt: string }>(
  rows: T[],
) => {
  const page = rows.slice(0, ACTIVITY_PAGE_SIZE);
  const last = page.at(-1);
  return {
    page,
    nextCursor:
      rows.length > ACTIVITY_PAGE_SIZE && last
        ? `${last.cursorAt}|${last.id}`
        : undefined,
  };
};
