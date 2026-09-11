import { redirect } from 'next/navigation';
import {
  getAnalyticsEventCounts,
  getAnalyticsTotals,
  getDailyAnalyticsTotals,
  getRecentAnalyticsEvents,
} from '@/db';
import { AnalyticsDashboard } from '@/features/Analytics/AnalyticsDashboard';
import { isAdmin } from '@/lib/admin';
import { getCurrentUser } from '@/lib/auth';

const RANGE_DAYS = 30;
const DAILY_DAYS = 14;

export default async function AnalyticsRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const user = await getCurrentUser();

  if (!user || !isAdmin(user)) {
    redirect(`/${lang}`);
  }

  const [totals, eventCounts, daily, recent] = await Promise.all([
    getAnalyticsTotals(RANGE_DAYS),
    getAnalyticsEventCounts(RANGE_DAYS),
    getDailyAnalyticsTotals(DAILY_DAYS),
    getRecentAnalyticsEvents(25),
  ]);

  return (
    <main className="min-h-screen bg-background-main">
      <AnalyticsDashboard
        locale={lang}
        rangeDays={RANGE_DAYS}
        dailyDays={DAILY_DAYS}
        totals={totals}
        eventCounts={eventCounts}
        daily={daily}
        recent={recent.map((event) => ({
          id: event.id,
          name: event.name,
          userId: event.userId,
          locale: event.locale,
          metadata: event.metadata,
          createdAt: event.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}
