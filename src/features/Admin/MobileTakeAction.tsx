'use client';

import { useEffect, useState } from 'react';
import { Sheet } from '@/components/Sheet';
import type { ToastData } from '@/hooks/useToast';
import { type CasePreview, CaseSkeleton } from './CaseShell';
import { ModerationChips } from './ModerationChips';
import { ActionSheets, type SheetKind } from './ModerationMobile';
import { ActionError } from './ModerationParts';
import type { ModState, StaffRole } from './types';
import { toModState, useModeration } from './useModeration';
import { useModerationNotify } from './useModerationToasts';
import {
  type ProfileCase,
  useCaseSync,
  useProfileCase,
} from './useProfileCase';

const CLOSE_DELAY = 350;

const MobileCase = ({
  profileId,
  found,
  refreshed,
  meId,
  meRole,
  addToast,
  onClose,
  onStateChange,
}: {
  profileId: string;
  found: ProfileCase;
  refreshed: ProfileCase | null;
  meId: string;
  meRole: StaffRole;
  addToast: (toast: Omit<ToastData, 'id'>) => void;
  onClose: () => void;
  onStateChange?: (state: ModState) => void;
}) => {
  const store = useModeration({
    users: found.users,
    reports: found.reports,
    log: found.log,
    pendingCases: 0,
    staff: [],
    meId,
    meRole,
  });
  useCaseSync(profileId, found, refreshed, store);
  const notify = useModerationNotify(addToast);
  const [sheet, setSheet] = useState<SheetKind | null>('act');
  const user = store.usersById.get(found.userId);

  useEffect(() => {
    if (sheet !== null) return;
    const timer = setTimeout(onClose, CLOSE_DELAY);
    return () => clearTimeout(timer);
  }, [sheet, onClose]);

  const reportIds = user
    ? store
        .userReports(user.id)
        .filter((report) => report.status === 'pending')
        .map((report) => report.id)
    : [];
  const pendingCount = reportIds.length;

  useEffect(() => {
    if (user) onStateChange?.(toModState(user, pendingCount));
  }, [user, pendingCount, onStateChange]);

  if (!user) return null;

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
  onStateChange,
  preview,
}: {
  profileId: string;
  displayName: string;
  meId: string;
  meRole: StaffRole;
  addToast: (toast: Omit<ToastData, 'id'>) => void;
  onClose: () => void;
  onStateChange?: (state: ModState) => void;
  preview?: CasePreview;
}) => {
  const { found, refreshed, failed, load } = useProfileCase(profileId);

  if (found) {
    return (
      <MobileCase
        profileId={profileId}
        found={found}
        refreshed={refreshed}
        meId={meId}
        meRole={meRole}
        addToast={addToast}
        onClose={onClose}
        onStateChange={onStateChange}
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
        <>
          {preview?.state ? (
            <div className="flex flex-wrap gap-1.5 px-5">
              <ModerationChips state={preview.state} />
            </div>
          ) : null}
          <CaseSkeleton actions={false} />
        </>
      )}
    </Sheet>
  );
};
