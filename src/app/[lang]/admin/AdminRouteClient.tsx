'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { useRouteProgressRouter } from '@/features/Navigation/RouteProgress';

type AdminReport = {
  id: string;
  reason: string;
  details?: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  createdAt: string;
  reportedName: string;
  reportedUsername: string;
  reportedSuspendedUntil?: string;
  reportedBanned: boolean;
  reporterName: string;
  reporterUsername: string;
  profileBio?: string;
  profileHidden: boolean;
};

type AdminLogEntry = {
  id: string;
  action: string;
  note?: string;
  createdAt: string;
  adminName?: string;
  targetName?: string;
};

type AdminRouteClientProps = {
  reports: AdminReport[];
  log: AdminLogEntry[];
};

const stateChipClasses =
  'inline-flex items-center rounded-full bg-danger-surface px-2.5 py-0.5 text-[11px] font-semibold text-danger uppercase tracking-[0.05em]';

const isSuspended = (report: AdminReport) =>
  report.reportedSuspendedUntil !== undefined &&
  new Date(report.reportedSuspendedUntil).getTime() > Date.now();

export const AdminRouteClient = ({ reports, log }: AdminRouteClientProps) => {
  const t = useTranslations('Admin');
  const router = useRouteProgressRouter();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [errorReportId, setErrorReportId] = useState<string | null>(null);

  const act = async (reportId: string, action: string) => {
    setPendingAction(`${reportId}:${action}`);
    setErrorReportId(null);

    try {
      const response = await fetch('/api/admin/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, action }),
      });

      if (!response.ok) {
        throw new Error('Moderation action failed');
      }

      router.refresh();
    } catch {
      setErrorReportId(reportId);
    } finally {
      setPendingAction(null);
    }
  };

  const actionButton = (report: AdminReport, action: string, label: string) => (
    <Button
      variant="outline"
      onClick={() => act(report.id, action)}
      disabled={pendingAction !== null}
      className="h-8 whitespace-nowrap px-3 text-[12px]"
    >
      {pendingAction === `${report.id}:${action}` ? t('actionWorking') : label}
    </Button>
  );

  return (
    <div className="mx-auto w-full max-w-[1140px] px-6 pt-8 pb-24">
      <div className="mb-6">
        <h1 className="font-bold font-figtree text-[30px] text-foreground leading-[1.1]">
          {t('title')}
        </h1>
        <p className="mt-1.5 font-light text-[15px] text-muted">
          {t('subtitle')}
        </p>
      </div>

      <section className="flex flex-col gap-4 rounded-3xl bg-background-dark p-6 shadow-xl">
        <h2 className="border-line border-b pb-3.5 font-figtree font-semibold text-[19px] text-primary">
          {t('queueTitle')}
        </h2>

        {reports.length === 0 ? (
          <p className="text-[14px] text-muted">{t('queueEmpty')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {reports.map((report) => (
              <li
                key={report.id}
                className="flex flex-col gap-3 rounded-xl bg-background-darker p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-overlay px-2.5 py-0.5 font-semibold text-[11px] text-soft uppercase tracking-[0.05em]">
                    {t(`reason_${report.reason}`)}
                  </span>
                  <span className="text-[12px] text-subtle">
                    {t(`status_${report.status}`)}
                  </span>
                  <span className="text-[12px] text-subtle">
                    {new Date(report.createdAt).toLocaleString()}
                  </span>
                  {report.profileHidden ? (
                    <span className={stateChipClasses}>{t('stateHidden')}</span>
                  ) : null}
                  {isSuspended(report) ? (
                    <span className={stateChipClasses}>
                      {t('stateSuspended')}
                    </span>
                  ) : null}
                  {report.reportedBanned ? (
                    <span className={stateChipClasses}>{t('stateBanned')}</span>
                  ) : null}
                </div>

                <div className="flex flex-col gap-1 text-[14px]">
                  <p className="text-foreground">
                    {t('reportedLabel')}{' '}
                    <span className="font-semibold">{report.reportedName}</span>{' '}
                    <span className="text-muted">
                      @{report.reportedUsername}
                    </span>
                  </p>
                  <p className="text-muted">
                    {t('reporterLabel')} {report.reporterName} @
                    {report.reporterUsername}
                  </p>
                  {report.details ? (
                    <p className="text-soft">{report.details}</p>
                  ) : null}
                  {report.profileBio ? (
                    <p className="text-[13px] text-subtle">
                      {t('bioLabel')} {report.profileBio}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {report.status === 'pending'
                    ? actionButton(report, 'dismiss', t('actionDismiss'))
                    : null}
                  {actionButton(report, 'warn', t('actionWarn'))}
                  {report.profileHidden
                    ? actionButton(report, 'unhide_profile', t('actionUnhide'))
                    : actionButton(report, 'hide_profile', t('actionHide'))}
                  {isSuspended(report)
                    ? actionButton(report, 'unsuspend', t('actionUnsuspend'))
                    : actionButton(report, 'suspend', t('actionSuspend'))}
                  {report.reportedBanned
                    ? actionButton(report, 'unban', t('actionUnban'))
                    : actionButton(report, 'ban', t('actionBan'))}
                </div>

                {errorReportId === report.id ? (
                  <p className="text-[13px] text-danger">{t('actionError')}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 flex flex-col gap-4 rounded-3xl bg-background-dark p-6 shadow-xl">
        <h2 className="border-line border-b pb-3.5 font-figtree font-semibold text-[19px] text-primary">
          {t('logTitle')}
        </h2>

        {log.length === 0 ? (
          <p className="text-[14px] text-muted">{t('logEmpty')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {log.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center gap-2 rounded-xl bg-background-darker px-4 py-2.5 text-[13px]"
              >
                <span className="font-semibold text-foreground">
                  {t(`action_${entry.action}`)}
                </span>
                <span className="text-muted">
                  {entry.targetName ?? t('unknownUser')}
                </span>
                <span className="text-subtle">
                  {t('byAdmin', { admin: entry.adminName ?? t('unknownUser') })}
                </span>
                <span className="ml-auto text-subtle">
                  {new Date(entry.createdAt).toLocaleString()}
                </span>
                {entry.note ? (
                  <span className="w-full text-muted">{entry.note}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
