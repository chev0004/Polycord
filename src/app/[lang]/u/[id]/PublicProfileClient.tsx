'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { MdArrowBack } from 'react-icons/md';
import { buildDiscoveryFilterHref } from '@/features/Discovery/discoveryUrlState';
import type { DiscoveryProfile } from '@/features/Discovery/ProfileCard';
import { saveProfileRequest } from '@/features/Discovery/saveProfileRequest';
import { Footer } from '@/features/Footer';
import { Navbar } from '@/features/Navbar';
import { useRouteProgressRouter } from '@/features/Navigation/RouteProgress';
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
  userAvatarUrl?: string;
};

export const PublicProfileClient = ({
  locale,
  profile,
  isLoggedIn,
  isSaved: initialSaved,
  currentProfileId,
  viewerTimezone,
  userAvatarUrl,
}: PublicProfileClientProps) => {
  const router = useRouteProgressRouter();
  const t = useTranslations('Discovery');
  const tPublic = useTranslations('PublicProfile');
  const searchParams = useSearchParams();
  const back = profileReturn(locale, searchParams.get('from'));
  const actions = useProfileActions(locale, isLoggedIn, () =>
    router.push(back.href),
  );
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isSaving, setIsSaving] = useState(false);
  const isOwnProfile = profile.id === currentProfileId;
  const signIn = () =>
    window.location.assign(`/api/auth/discord?locale=${locale}`);

  useEffect(() => setIsSaved(initialSaved), [initialSaved]);

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
    <div className="min-h-screen bg-background-main text-foreground">
      <Navbar
        iconUrl={userAvatarUrl}
        isLoggedIn={isLoggedIn}
        notifications={[]}
        onHomeClick={() => router.push(`/${locale}`)}
        onLoginClick={signIn}
        onProfileClick={() => router.push(`/${locale}/profile`)}
        onSavedClick={() => router.push(`/${locale}/saved`)}
        onSettingsClick={() => router.push(`/${locale}/settings`)}
        onLogoutClick={() =>
          window.location.assign(`/api/auth/logout?locale=${locale}`)
        }
      />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
        <button
          type="button"
          onClick={() => router.push(back.href)}
          className="mb-5 inline-flex items-center gap-1.5 py-2 text-muted text-sm hover:text-foreground focus-visible:text-foreground"
        >
          <MdArrowBack size={18} />
          {tPublic(back.label)}
        </button>
        <ProfileDetail
          profile={profile}
          isLoggedIn={isLoggedIn}
          isSaved={isSaved}
          isSaving={isSaving}
          viewerTimezone={viewerTimezone}
          onToggleSave={isOwnProfile ? undefined : toggleSave}
          onCopyUsername={() => actions.copyUsername(profile)}
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
      </main>
      <Footer locale={locale} />
      {actions.feedback}
    </div>
  );
};
