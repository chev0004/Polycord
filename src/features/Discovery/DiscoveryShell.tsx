'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/features/Navigation/AppShell';
import { RouteProgressProvider } from '@/features/Navigation/RouteProgress';
import { LanguageDisplayProvider } from '@/features/Settings/LanguageDisplay';
import { TimeFormatProvider } from '@/features/Settings/TimeFormat';
import { DiscoveryPage } from './DiscoveryPage';
import type { DiscoveryViewer } from './discoveryViewer';
import { commitPageNavigation, disableLoadTrace } from './loadTrace';

export const DiscoveryShell = ({ locale }: { locale: string }) => {
  const [viewer, setViewer] = useState<DiscoveryViewer | null>(null);
  const onViewer = useCallback((data: DiscoveryViewer) => {
    if (data.staff?.role !== 'owner') disableLoadTrace();
    setViewer(data);
  }, []);

  useEffect(() => {
    commitPageNavigation(`/${locale}`);
  }, [locale]);

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
            <DiscoveryPage
              {...viewer}
              locale={locale}
              isLoggedIn={viewer?.isLoggedIn ?? false}
              fetchOnMount
              onViewer={onViewer}
              isLoading={viewer === null}
            />
          </AppShell>
        </RouteProgressProvider>
      </TimeFormatProvider>
    </LanguageDisplayProvider>
  );
};
