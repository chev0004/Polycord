'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { MdArrowBack } from 'react-icons/md';
import type { AvailabilityPattern } from '@/constants/availability';
import { buildDiscoveryFilterHref } from '@/features/Discovery/discoveryUrlState';
import type { DiscoveryProfile } from '@/features/Discovery/ProfileCard';
import { saveProfileRequest } from '@/features/Discovery/saveProfileRequest';
import { useRouteProgressRouter } from '@/features/Navigation/RouteProgress';
import { signInHref } from '@/features/Navigation/signIn';
import { useHistoryRefresh } from '@/features/Navigation/useHistoryRefresh';
import { MemberEmptyState } from '@/features/Profile/MemberEmptyState';
import { ProfileDetail } from '@/features/Profile/ProfileDetail';
import { profileReturn } from '@/features/Profile/profileReturn';
import { useProfileActions } from '@/features/Profile/useProfileActions';

type PublicProfileClientProps = {
  locale: string;
  profile: DiscoveryProfile;
  isLoggedIn: boolean;
  isSaved: boolean;
  currentProfileId?: string;
  viewerTimezone?: string;
  viewerAvailability?: AvailabilityPattern;
};

export const PublicProfileClient = ({
  locale,
  profile,
  isLoggedIn,
  isSaved: initialSaved,
  currentProfileId,
  viewerTimezone,
  viewerAvailability,
}: PublicProfileClientProps) => {
  const router = useRouteProgressRouter();
  const t = useTranslations('Discovery');
  const tPublic = useTranslations('PublicProfile');
  const searchParams = useSearchParams();
  const back = profileReturn(locale, searchParams.get('from'));
  const [blocked, setBlocked] = useState(false);
  const actions = useProfileActions(locale, isLoggedIn, () => setBlocked(true));
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isSaving, setIsSaving] = useState(false);
  const isOwnProfile = profile.id === currentProfileId;
  const { refresh } = router;
  const signIn = () => window.location.assign(signInHref(locale));

  useEffect(() => setIsSaved(initialSaved), [initialSaved]);

  useHistoryRefresh(refresh);

  const toggleSave = async () => {
    if (!isLoggedIn) {
      actions.addToast({
        title: t('saveLoginTitle'),
        description: t('saveLoginDescription'),
        duration: 4000,
      });
      return;
    }

    setIsSaving(true);
    try {
      await saveProfileRequest(profile.id, !isSaved);
      setIsSaved(!isSaved);
    } catch {
      actions.addToast({
        title: t('saveError'),
        description: t('saveErrorDescription'),
        duration: 4000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <main className="mx-auto w-full max-w-[1080px] px-4 py-8 sm:px-6">
        <button
          type="button"
          onClick={() => router.push(back.href)}
          className="mb-4 inline-flex h-9 items-center gap-1.5 rounded-full pr-3.5 pl-2.5 text-muted text-sm transition-colors hover:bg-background-dark hover:text-foreground focus:outline-none focus-visible:bg-background-dark focus-visible:text-foreground"
        >
          <MdArrowBack size={18} />
          {tPublic(back.label)}
        </button>
        {blocked ? (
          <MemberEmptyState kind="blocked" />
        ) : (
          <ProfileDetail
            profile={profile}
            isLoggedIn={isLoggedIn}
            isSaved={isSaved}
            isSaving={isSaving}
            viewerTimezone={viewerTimezone}
            viewerAvailability={viewerAvailability}
            onToggleSave={isOwnProfile ? undefined : toggleSave}
            onCopyUsername={() => actions.copyUsername(profile, isOwnProfile)}
            onShare={() => actions.share(profile.id)}
            onReport={isOwnProfile ? undefined : () => actions.report(profile)}
            onBlock={isOwnProfile ? undefined : () => actions.block(profile.id)}
            onEdit={
              isOwnProfile ? () => router.push(`/${locale}/profile`) : undefined
            }
            onSignIn={signIn}
            onTagClick={(tag) =>
              router.push(buildDiscoveryFilterHref(locale, 'tag', tag))
            }
            onLanguageClick={(language, isPrimary) =>
              router.push(
                buildDiscoveryFilterHref(
                  locale,
                  isPrimary ? 'primaryLanguage' : 'targetLanguage',
                  language,
                ),
              )
            }
            onCountryClick={(country) =>
              router.push(buildDiscoveryFilterHref(locale, 'country', country))
            }
          />
        )}
      </main>
      {actions.feedback}
    </>
  );
};
