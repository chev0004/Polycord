'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { ToastStack } from '@/components/Toast';
import { useSyncPendingCases } from '@/features/Navigation/AppShell';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useToastStack } from '@/hooks/useToast';
import {
  ModerationDesktop,
  type ModTab,
  type Notify,
} from './ModerationDesktop';
import { ModerationMobile } from './ModerationMobile';
import type { ModSnapshot, SeedStatus } from './types';
import { useModeration } from './useModeration';

export const ModerationPage = ({
  initial,
  seed = null,
}: {
  initial: ModSnapshot;
  seed?: SeedStatus | null;
}) => {
  const t = useTranslations('Admin');
  const store = useModeration(initial);
  useSyncPendingCases(store.pendingCases);
  const mobile = useIsMobile();
  const { toasts, addToast, dismissToast } = useToastStack();
  const [tab, setTab] = useState<ModTab>('reports');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<string[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  const { search } = store;

  useEffect(() => {
    const trimmed = query.trim();
    setFailed(false);
    if (!trimmed) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    let current = true;
    const timer = setTimeout(() => {
      search(trimmed)
        .then((ids) => current && setResults(ids))
        .catch(() => current && setFailed(true))
        .finally(() => current && setSearching(false));
    }, 300);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query, search]);

  const notify: Notify = (user, action, { days, reports, resolved, failed }) =>
    addToast({
      variant: failed ? 'error' : undefined,
      title: failed
        ? t('actionFailed')
        : t(`toast_${action}`, {
            name: user.displayName,
            count: action === 'dismiss' ? reports : (days ?? 0),
          }),
      description: failed
        ? ''
        : resolved && reports
          ? action === 'dismiss'
            ? t('toastMovedResolved')
            : t('toastReviewed', { count: reports })
          : t('toastLogged'),
      iconUrl: user.avatarUrl,
      duration: 4000,
    });

  const users = {
    query,
    setQuery,
    selected,
    setSelected,
    results,
    searching,
    failed,
  };

  const openUser = (userId: string) => {
    setQuery(store.usersById.get(userId)?.username ?? '');
    setSelected(userId);
    setTab('users');
  };

  return (
    <>
      {mobile ? (
        <ModerationMobile
          store={store}
          tab={tab}
          setTab={setTab}
          users={users}
          notify={notify}
          seed={seed}
        />
      ) : (
        <div className={mobile === null ? 'max-md:invisible' : ''}>
          <ModerationDesktop
            store={store}
            tab={tab}
            setTab={setTab}
            users={users}
            notify={notify}
            openUser={openUser}
            seed={seed}
          />
        </div>
      )}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};
