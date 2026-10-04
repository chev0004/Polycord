'use client';

import { useEffect, useState } from 'react';
import { Sheet } from '@/components/Sheet';
import type { ToastData } from '@/hooks/useToast';
import { ActionSheets } from './ModerationMobile';
import { ActionError, Spinner } from './ModerationParts';
import type { StaffRole } from './types';
import { useModeration } from './useModeration';
import { useModerationNotify } from './useModerationToasts';
import { type ProfileCase, useProfileCase } from './useProfileCase';

const CLOSE_DELAY = 350;

const MobileCase = ({
  found,
  meId,
  meRole,
  addToast,
  onClose,
}: {
  found: ProfileCase;
  meId: string;
  meRole: StaffRole;
  addToast: (toast: Omit<ToastData, 'id'>) => void;
  onClose: () => void;
}) => {
  const store = useModeration({
    users: found.users,
    reports: found.reports,
    log: found.log,
    pendingCases: 0,
    suspicious: [],
    staff: [],
    meId,
    meRole,
  });
  const notify = useModerationNotify(addToast);
  const [sheet, setSheet] = useState<
    'act' | 'warn' | 'suspend' | 'ban' | 'grant' | null
  >('act');
  const user = store.usersById.get(found.userId);

  useEffect(() => {
    if (sheet !== null) return;
    const timer = setTimeout(onClose, CLOSE_DELAY);
    return () => clearTimeout(timer);
  }, [sheet, onClose]);

  if (!user) return null;

  const reportIds = store
    .userReports(user.id)
    .filter((report) => report.status === 'pending')
    .map((report) => report.id);

  return (
    <ActionSheets
      store={store}
      user={user}
      reportIds={reportIds}
      onDone={(action, days) =>
        notify(user, action, {
          days,
          reports: reportIds.length,
          resolved: reportIds.length > 0,
        })
      }
      sheet={sheet}
      setSheet={setSheet}
    />
  );
};

export const MobileTakeAction = ({
  profileId,
  displayName,
  meId,
  meRole,
  addToast,
  onClose,
}: {
  profileId: string;
  displayName: string;
  meId: string;
  meRole: StaffRole;
  addToast: (toast: Omit<ToastData, 'id'>) => void;
  onClose: () => void;
}) => {
  const { found, failed, load } = useProfileCase(profileId);

  if (found) {
    return (
      <MobileCase
        found={found}
        meId={meId}
        meRole={meRole}
        addToast={addToast}
        onClose={onClose}
      />
    );
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => (open ? null : onClose())}
      title={displayName}
    >
      {failed ? (
        <ActionError mobile onRetry={load} />
      ) : (
        <div className="flex justify-center p-6 text-muted">
          <Spinner className="h-5 w-5" />
        </div>
      )}
    </Sheet>
  );
};
