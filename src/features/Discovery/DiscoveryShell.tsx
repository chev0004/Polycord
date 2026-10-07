'use client';

import { useState } from 'react';
import { AppShell } from '@/features/Navigation/AppShell';
import { RouteProgressProvider } from '@/features/Navigation/RouteProgress';
import { LanguageDisplayProvider } from '@/features/Settings/LanguageDisplay';
import { TimeFormatProvider } from '@/features/Settings/TimeFormat';
import { DiscoveryLoadPanel } from './DiscoveryLoadPanel';
import { DiscoveryPage } from './DiscoveryPage';
import type { DiscoveryViewer } from './discoveryViewer';

export const DiscoveryShell = ({ locale }: { locale: string }) => {
  const [viewer, setViewer] = useState<DiscoveryViewer | null>(null);

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
              onViewer={setViewer}
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
