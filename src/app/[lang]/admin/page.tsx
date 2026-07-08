import { redirect } from 'next/navigation';
import { listModerationActions, listReportsWithContext } from '@/db';
import { isAdmin } from '@/lib/admin';
import { getCurrentUser } from '@/lib/auth';
import { AdminRouteClient } from './AdminRouteClient';

export default async function AdminRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const user = await getCurrentUser();

  if (!user || !isAdmin(user)) {
    redirect(`/${lang}`);
  }

  const [reports, log] = await Promise.all([
    listReportsWithContext(),
    listModerationActions(),
  ]);

  return (
    <main className="min-h-screen bg-background-main">
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
