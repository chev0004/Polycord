import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { listModerationActions, listReportsWithContext } from '@/db';
import { isAdmin } from '@/lib/admin';
import { getCurrentUser } from '@/lib/auth';
import { AdminRouteClient } from './AdminRouteClient';

export default async function AdminRoute({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ page?: string; queue?: string }>;
}) {
  const { lang } = await params;
  const query = await searchParams;
  const page = Math.max(
    1,
    Math.min(100000, Number.parseInt(query.page ?? '1', 10) || 1),
  );
  const resolved = query.queue === 'resolved';
  const t = await getTranslations('Admin');
  const user = await getCurrentUser();

  if (!user || !isAdmin(user)) {
    redirect(`/${lang}`);
  }

  const [reports, log] = await Promise.all([
    listReportsWithContext(100, page, resolved),
    listModerationActions(),
  ]);

  return (
    <main className="min-h-screen bg-background-main">
      <nav className="mx-auto flex max-w-[1140px] gap-6 px-6 pt-6 text-primary-light">
        <Link href={`/${lang}/admin`}>{t('pendingQueue')}</Link>
        <Link href={`/${lang}/admin?queue=resolved`}>{t('resolvedQueue')}</Link>
        {page > 1 ? (
          <Link
            href={`/${lang}/admin?queue=${resolved ? 'resolved' : 'pending'}&page=${page - 1}`}
          >
            {t('previousPage')}
          </Link>
        ) : null}
        {reports.length === 100 ? (
          <Link
            href={`/${lang}/admin?queue=${resolved ? 'resolved' : 'pending'}&page=${page + 1}`}
          >
            {t('nextPage')}
          </Link>
        ) : null}
      </nav>
      <AdminRouteClient
        reports={reports.map((entry) => ({
          id: entry.report.id,
          reason: entry.report.reason,
          details: entry.report.details ?? undefined,
          status: entry.report.status,
          createdAt: entry.report.createdAt.toISOString(),
          reportedName: entry.reported.displayName,
          reportedUsername: entry.reported.discordUsername,
          reportedSuspendedUntil:
            entry.reported.suspendedUntil?.toISOString() ?? undefined,
          reportedBanned: entry.reported.bannedAt !== null,
          reporterName: entry.reporter.displayName,
          reporterUsername: entry.reporter.discordUsername,
          profileBio: entry.reportedProfile?.bio,
          profileHidden: entry.reportedProfile?.hiddenByModeration ?? false,
        }))}
        log={log.map((entry) => ({
          id: entry.id,
          action: entry.action,
          note: entry.note ?? undefined,
          createdAt: entry.createdAt.toISOString(),
          adminName: entry.adminName ?? undefined,
          targetName: entry.targetName ?? undefined,
        }))}
      />
    </main>
  );
}
