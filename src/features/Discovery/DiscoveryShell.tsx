'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from '@/features/Navigation/AppShell';
import { RouteProgressProvider } from '@/features/Navigation/RouteProgress';
import { LanguageDisplayProvider } from '@/features/Settings/LanguageDisplay';
import { TimeFormatProvider } from '@/features/Settings/TimeFormat';
import { DiscoveryLoadPanel } from './DiscoveryLoadPanel';
import { DiscoveryPage } from './DiscoveryPage';
import type { DiscoveryViewer } from './discoveryViewer';
import { traceDiscoveryRequest } from './loadTrace';

export const DiscoveryShell = ({ locale }: { locale: string }) => {
  const t = useTranslations('Discovery');
  const [viewer, setViewer] = useState<DiscoveryViewer | null>(null);
  const [failed, setFailed] = useState(false);
  const request = useRef<AbortController | null>(null);
  const loadViewer = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setFailed(false);
    try {
      const data = await traceDiscoveryRequest<DiscoveryViewer>(
        'viewer',
        `/api/discovery/viewer?locale=${locale}`,
        controller.signal,
      );
      if (!controller.signal.aborted) setViewer(data);
    } catch {
      if (!controller.signal.aborted) setFailed(true);
    }
  }, [locale]);

  useEffect(() => {
    void loadViewer();
    return () => request.current?.abort();
  }, [loadViewer]);

  return (
    <LanguageDisplayProvider value={viewer?.languageDisplay ?? 'long'}>
      <TimeFormatProvider value={viewer?.timeFormat ?? '24hr'}>
        <RouteProgressProvider theme={viewer?.cardTheme}>
          <AppShell
            locale={locale}
            isLoggedIn={viewer?.isLoggedIn ?? false}
            viewerLoading={viewer === null}
            userAvatarUrl={viewer?.userAvatarUrl}
            pendingCases={viewer?.pendingCases}
          >
            {failed ? (
              <div role="alert" className="mx-4 mt-4 text-danger text-sm">
                {t('viewerError')}{' '}
                <button
                  type="button"
                  onClick={loadViewer}
                  className="underline"
                >
                  {t('retryFeed')}
                </button>
              </div>
            ) : null}
            <DiscoveryPage
              {...viewer}
              locale={locale}
              isLoggedIn={viewer?.isLoggedIn ?? false}
              fetchOnMount
              isLoading={viewer === null}
            />
            {!viewer || viewer.staff?.role === 'owner' ? (
              <DiscoveryLoadPanel />
            ) : null}
          </AppShell>
        </RouteProgressProvider>
      </TimeFormatProvider>
    </LanguageDisplayProvider>
  );
};
