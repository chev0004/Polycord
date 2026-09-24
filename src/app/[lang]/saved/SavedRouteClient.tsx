'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { MdBookmarkBorder, MdErrorOutline } from 'react-icons/md';
import { Button } from '@/components/Button';
import { buildDiscoveryFilterHref } from '@/features/Discovery/discoveryUrlState';
import type { DiscoveryProfile } from '@/features/Discovery/ProfileCard';
import { ProfileGrid } from '@/features/Discovery/ProfileGrid';
import { saveProfileRequest } from '@/features/Discovery/saveProfileRequest';
import { notifyUsernameCopied } from '@/features/Inbox/notificationRequests';
import { useRouteProgressRouter } from '@/features/Navigation/RouteProgress';
import { useProfileActions } from '@/features/Profile/useProfileActions';

type SavedRouteClientProps = {
  locale: string;
  profiles: DiscoveryProfile[];
  currentProfileId?: string;
  loadError?: boolean;
  viewerTimezone?: string;
};

export const SavedRouteClient = ({
  locale,
  profiles: initialProfiles,
  currentProfileId,
  loadError = false,
  viewerTimezone,
}: SavedRouteClientProps) => {
  const router = useRouteProgressRouter();
  const t = useTranslations('Saved');
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const actions = useProfileActions(locale, true, (id) => {
    setRemovedIds((previous) => [...previous, id]);
    router.refresh();
  });
  const savedProfileIds = useMemo(
    () => initialProfiles.map((profile) => profile.id),
    [initialProfiles],
  );

  const { refresh } = router;

  useEffect(() => {
    const refreshRestored = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    refresh();
    window.addEventListener('pageshow', refreshRestored);
    return () => window.removeEventListener('pageshow', refreshRestored);
  }, [refresh]);

  const profiles = initialProfiles.filter(
    (profile) => !removedIds.includes(profile.id),
  );

  const handleProfileUnsaved = (profileId: string) => {
    setRemovedIds((previous) => [...previous, profileId]);
  };

  return (
    <>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8">
        <header className="mb-[26px] flex flex-col gap-1.5">
          <span className="font-semibold text-primary text-xs uppercase tracking-wide">
            {t('eyebrow')}
          </span>
          <h1 className="font-figtree font-semibold text-2xl text-foreground">
            {t('title')}
          </h1>
          <p className="text-muted text-sm">{t('subtitle')}</p>
        </header>

        {loadError ? (
          <div
            role="alert"
            className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-3 rounded-2xl border border-red-800 bg-danger-surface px-6 py-12 text-center"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-danger">
              <MdErrorOutline size={24} />
            </span>
            <h2 className="font-figtree font-semibold text-2xl text-foreground">
              {t('errorTitle')}
            </h2>
            <p className="max-w-[440px] text-muted text-sm">
              {t('errorDescription')}
            </p>
            <Button variant="primary" onClick={() => router.refresh()}>
              {t('errorRetry')}
            </Button>
          </div>
        ) : profiles.length > 0 ? (
          <ProfileGrid
            profiles={profiles}
            isLoggedIn
            savedProfileIds={savedProfileIds}
            currentProfileId={currentProfileId}
            onSaveProfile={saveProfileRequest}
            onProfileUnsaved={handleProfileUnsaved}
            viewerTimezone={viewerTimezone}
            onCopyUsername={(_username, id) => {
              void notifyUsernameCopied(id).catch(() => {});
            }}
            onViewProfile={(id) =>
              router.push(
                `/${locale}/u/${id}?from=${encodeURIComponent(`/${locale}/saved`)}`,
              )
            }
            onShare={actions.share}
            onReport={(id) => {
              const profile = profiles.find((item) => item.id === id);
              if (profile) actions.report(profile);
            }}
            onBlock={actions.block}
            onTagClick={(tag) =>
              router.push(buildDiscoveryFilterHref(locale, 'tag', tag))
            }
            onLanguageClick={(language, _level, primary) =>
              router.push(
                buildDiscoveryFilterHref(
                  locale,
                  primary ? 'primaryLanguage' : 'targetLanguage',
                  language,
                ),
              )
            }
            onCountryClick={(country) =>
              router.push(buildDiscoveryFilterHref(locale, 'country', country))
            }
            addToast={actions.addToast}
          />
        ) : (
          <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-3 rounded-2xl border border-primary-dark border-dashed bg-background-darker px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-darker text-primary">
              <MdBookmarkBorder size={24} />
            </span>
            <h2 className="font-figtree font-semibold text-2xl text-foreground">
              {t('emptyTitle')}
            </h2>
            <p className="max-w-[440px] text-muted text-sm">
              {t('emptyDescription')}
            </p>
            <Button variant="primary" onClick={() => router.push(`/${locale}`)}>
              {t('emptyAction')}
            </Button>
          </div>
        )}
      </main>
      {actions.feedback}
    </>
  );
};
