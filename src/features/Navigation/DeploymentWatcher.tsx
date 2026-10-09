'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef } from 'react';
import { ToastStack } from '@/components/Toast';
import { useToastStack } from '@/hooks/useToast';
import {
  CLIENT_BUILD_ID,
  claimBuildReload,
  claimChunkReload,
  isChunkLoadFailure,
} from '@/lib/deployment';
import { hasUnsavedChanges, onUnsavedChanges } from '@/lib/unsavedChanges';

const CHECK_INTERVAL_MS = 60000;
const TOAST_DURATION_MS = 30000;

export const DeploymentWatcher = ({
  buildId = CLIENT_BUILD_ID,
  onReload = () => window.location.reload(),
}: {
  buildId?: string;
  onReload?: () => void;
}) => {
  const t = useTranslations('Deployment');
  const pathname = usePathname();
  const { toasts, addToast, dismissToast } = useToastStack();
  const waiting = useRef<string | null>(null);

  const reload = useCallback(
    (serverBuildId: string) => {
      if (claimBuildReload(serverBuildId)) onReload();
    },
    [onReload],
  );

  const check = useCallback(async () => {
    if (!buildId) return;
    try {
      const response = await fetch('/api/build', { cache: 'no-store' });
      if (!response.ok) return;
      const { buildId: serverBuildId } = await response.json();
      if (typeof serverBuildId !== 'string' || serverBuildId === buildId)
        return;
      if (!hasUnsavedChanges()) {
        reload(serverBuildId);
        return;
      }
      if (waiting.current) return;
      waiting.current = serverBuildId;
      addToast({
        title: t('title'),
        description: t('description'),
        action: { label: t('reload'), onClick: () => reload(serverBuildId) },
        duration: TOAST_DURATION_MS,
      });
    } catch {
      return;
    }
  }, [buildId, reload, addToast, t]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a navigation is a reason to check again
  useEffect(() => {
    void check();
  }, [check, pathname]);

  useEffect(() => {
    const visible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    const timer = setInterval(visible, CHECK_INTERVAL_MS);
    window.addEventListener('focus', visible);
    document.addEventListener('visibilitychange', visible);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', visible);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [check]);

  useEffect(
    () =>
      onUnsavedChanges(() => {
        if (waiting.current && !hasUnsavedChanges()) reload(waiting.current);
      }),
    [reload],
  );

  useEffect(() => {
    const recover = (reason: unknown) => {
      if (isChunkLoadFailure(reason) && claimChunkReload()) onReload();
    };
    const onError = (event: ErrorEvent) =>
      recover(event.error ?? event.message);
    const onRejection = (event: PromiseRejectionEvent) => recover(event.reason);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, [onReload]);

  return <ToastStack toasts={toasts} onDismiss={dismissToast} />;
};
