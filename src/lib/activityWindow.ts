import { z } from 'zod';
import {
  ACTIVITY_KINDS,
  type ActivityKind,
  LOG_ACTIONS,
  type LogAction,
  REPORT_REASONS,
  REPORT_VIEWS,
  type ReportReason,
  type ReportView,
} from '@/features/Admin/types';

export const ACTIVITY_PAGE_SIZE = 25;

const MAX_WINDOW_MS = 26 * 3600000;
const MAX_MONTH_MS = 32 * 24 * 3600000;
const cursorPattern =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z)\|([0-9a-f-]{36})$/;

export type ActivityCursor = { at: string; id: string };

export type ActivityWindow = {
  from: Date;
  to: Date;
  cursor?: ActivityCursor;
  action?: LogAction;
  staffId?: string;
  reason?: ReportReason;
  status?: ReportView;
};

const schema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  cursor: z.string().regex(cursorPattern).optional(),
  action: z.enum(LOG_ACTIONS).optional(),
  staffId: z.string().uuid().optional(),
  reason: z.enum(REPORT_REASONS).optional(),
  status: z.enum(REPORT_VIEWS).optional(),
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
    reason: params.get('reason') ?? undefined,
    status: params.get('status') ?? undefined,
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
    reason: parsed.data.reason,
    status: parsed.data.status,
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

const isTimeZone = (value: string) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

const daysSchema = z.object({
  kind: z.enum(ACTIVITY_KINDS),
  from: z.string().datetime(),
  to: z.string().datetime(),
  timeZone: z.string().max(64).refine(isTimeZone),
});

export type ActivityDaysQuery = {
  kind: ActivityKind;
  from: Date;
  to: Date;
  timeZone: string;
};

export const parseActivityDays = (
  params: URLSearchParams,
): ActivityDaysQuery | null => {
  const parsed = daysSchema.safeParse({
    kind: params.get('kind') ?? undefined,
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
    timeZone: params.get('timeZone') ?? undefined,
  });
  if (!parsed.success) return null;

  const from = new Date(parsed.data.from);
  const to = new Date(parsed.data.to);
  const span = to.getTime() - from.getTime();
  if (span <= 0 || span > MAX_MONTH_MS) return null;

  return {
    kind: parsed.data.kind,
    from,
    to,
    timeZone: parsed.data.timeZone,
  };
};
