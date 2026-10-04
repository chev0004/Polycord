'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { MdClose, MdOutlineShield } from 'react-icons/md';
import { ToastStack } from '@/components/Toast';
import { UserDetail } from './ModerationDesktop';
import { ActionError, Spinner } from './ModerationParts';
import type { StaffRole } from './types';
import { useModeration } from './useModeration';
import { useModerationToasts } from './useModerationToasts';
import { type ProfileCase, useProfileCase } from './useProfileCase';

const CaseBody = ({
  found,
  meId,
  meRole,
}: {
  found: ProfileCase;
  meId: string;
  meRole: StaffRole;
}) => {
  const t = useTranslations('Admin');
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
  const { notify, toasts, dismissToast } = useModerationToasts();
  const user = store.usersById.get(found.userId);

  if (!user) return null;

  const reports = store.userReports(user.id);
  const pendingIds = reports
    .filter((report) => report.status === 'pending')
    .map((report) => report.id);

  return (
    <>
      <UserDetail
        store={store}
        user={user}
        reports={reports}
        reportsTitle={t('sectionReports')}
        reportIds={pendingIds}
        canDismiss={pendingIds.length > 0}
        shortcuts={false}
        otherReports={0}
        resolvedOnAct
        notify={notify}
        profileFirst={false}
      />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};

export const TakeActionPanel = ({
  profileId,
  displayName,
  meId,
  meRole,
  onClose,
  returnFocus,
}: {
  profileId: string;
  displayName: string;
  meId: string;
  meRole: StaffRole;
  onClose: () => void;
  returnFocus?: HTMLElement | null;
}) => {
  const t = useTranslations('Admin');
  const { found, failed, load } = useProfileCase(profileId);

  useEffect(() => {
    document.body.classList.add('mdr-open');
    return () => document.body.classList.remove('mdr-open');
  }, []);

  return (
    <Dialog.Root open onOpenChange={(open) => (open ? null : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay fixed inset-0 z-[70] bg-black/50" />
        <Dialog.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus?.focus();
          }}
          className="fixed top-0 right-0 bottom-0 z-[71] flex w-[min(460px,100vw)] animate-[pushIn_0.38s_cubic-bezier(0.16,1,0.3,1)] flex-col border-line border-l bg-background-dark font-figtree text-foreground shadow-xl max-[860px]:inset-x-0 max-[860px]:top-auto max-[860px]:max-h-[88dvh] max-[860px]:w-auto max-[860px]:animate-[sheetIn_0.38s_cubic-bezier(0.16,1,0.3,1)] max-[860px]:rounded-t-3xl max-[860px]:border-t max-[860px]:border-l-0"
        >
          <Dialog.Title className="sr-only">
            {t('moderatePanelLabel', { name: displayName })}
          </Dialog.Title>
          <div className="hidden justify-center pt-2 max-[860px]:flex">
            <span className="h-1 w-9 rounded-full bg-primary-dark" />
          </div>
          <header className="flex h-14 shrink-0 items-center justify-between border-line border-b pr-3 pl-5 max-[860px]:h-12">
            <span className="inline-flex items-center gap-2 font-bold text-[11px] text-primary-light uppercase tracking-[0.06em]">
              <MdOutlineShield size={18} aria-hidden className="text-primary" />
              {t('moderateUser')}
            </span>
            <Dialog.Close
              aria-label={t('closePanel')}
              className="grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-background-main hover:text-foreground focus-visible:bg-background-main"
            >
              <MdClose size={20} />
            </Dialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {found ? (
              <CaseBody found={found} meId={meId} meRole={meRole} />
            ) : failed ? (
              <div className="p-5">
                <ActionError onRetry={load} />
              </div>
            ) : (
              <div className="flex justify-center p-10 text-muted">
                <Spinner className="h-5 w-5" />
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
