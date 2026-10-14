'use client';

import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Suspense, use, useEffect, useMemo, useRef, useState } from 'react';
import type { AvailabilityPattern } from '@/constants/availability';
import type { StaffRole } from '@/features/Admin/types';
import { buildDiscoveryFilterHref } from '@/features/Discovery/discoveryUrlState';
import type { DiscoveryProfile } from '@/features/Discovery/ProfileCard';
import { saveProfileRequest } from '@/features/Discovery/saveProfileRequest';
import { BackButton } from '@/features/Navigation/BackButton';
import { useRouteProgressRouter } from '@/features/Navigation/RouteProgress';
import { signInHref } from '@/features/Navigation/signIn';
import { useHistoryRefresh } from '@/features/Navigation/useHistoryRefresh';
import { MemberEmptyState } from '@/features/Profile/MemberEmptyState';
import { ProfileDetail } from '@/features/Profile/ProfileDetail';
import { ProfileSheet } from '@/features/Profile/ProfileSheetHost';
import { profileReturn } from '@/features/Profile/profileReturn';
import { profileSheetStore } from '@/features/Profile/profileSheetStore';
import { useProfileActions } from '@/features/Profile/useProfileActions';
import { useIsMobile } from '@/hooks/useMediaQuery';

const MobileTakeAction = dynamic(() =>
  import('@/features/Admin/MobileTakeAction').then(
    (module) => module.MobileTakeAction,
  ),
);
const TakeActionPanel = dynamic(() =>
  import('@/features/Admin/TakeActionPanel').then(
    (module) => module.TakeActionPanel,
  ),
);

type PublicProfileContext = {
  isSaved: boolean;
  viewerTimezone?: string;
  viewerAvailability?: AvailabilityPattern;
  staff?: { meId: string; role: StaffRole };
};

type PublicProfileClientProps = {
  locale: string;
  profile: DiscoveryProfile;
  isLoggedIn: boolean;
  isOwnProfile: boolean;
  context: Promise<PublicProfileContext>;
};

const ResolveContext = ({
  value,
  onReady,
}: {
  value: Promise<PublicProfileContext>;
  onReady: (value: PublicProfileContext) => void;
}) => {
  const context = use(value);
  useEffect(() => onReady(context), [context, onReady]);
  return null;
};

export const PublicProfileClient = ({
  locale,
  profile,
  isLoggedIn,
  isOwnProfile,
  context,
}: PublicProfileClientProps) => {
  const router = useRouteProgressRouter();
  const route = useRouter();
  const [resolved, setResolved] = useState<PublicProfileContext | null>(null);
  const initialSaved = resolved?.isSaved ?? false;
  const viewerTimezone = resolved?.viewerTimezone;
  const viewerAvailability = resolved?.viewerAvailability;
  const staff = resolved?.staff;
  const t = useTranslations('Discovery');
  const tPublic = useTranslations('PublicProfile');
  const searchParams = useSearchParams();
  const back = profileReturn(locale, searchParams.get('from'));
  const [blocked, setBlocked] = useState(false);
  const actions = useProfileActions(locale, isLoggedIn, () => setBlocked(true));
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isSaving, setIsSaving] = useState(false);
  const [moderationTrigger, setModerationTrigger] = useState<
    HTMLElement | null | undefined
  >();
  const mobile = useIsMobile();
  const { refresh } = router;
  const signIn = () => window.location.assign(signInHref(locale));

  const redirected = useRef<string | null>(null);
  const sheetData = useMemo(
    () => ({
      profile,
      isLoggedIn,
      isSaved,
      isOwn: isOwnProfile,
      viewerTimezone,
      staff,
      waitForDiscovery: true,
    }),
    [profile, isLoggedIn, isSaved, isOwnProfile, viewerTimezone, staff],
  );

  useEffect(() => setIsSaved(initialSaved), [initialSaved]);

  useEffect(() => {
    if (!mobile || redirected.current === profile.id) return;
    redirected.current = profile.id;
    profileSheetStore.open(sheetData);
    route.replace(`/${locale}`);
  }, [mobile, profile.id, sheetData, route, locale]);

  useEffect(() => {
    if (!resolved) return;
    const target = profileSheetStore.get();
    if (
      target &&
      typeof target !== 'string' &&
      target.profile.id === profile.id &&
      target.waitForDiscovery
    )
      profileSheetStore.open({
        ...target,
        isSaved: resolved.isSaved,
        viewerTimezone: resolved.viewerTimezone,
        staff: resolved.staff,
      });
  }, [resolved, profile.id]);

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
        variant: 'error',
        description: t('saveErrorDescription'),
        duration: 4000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Suspense fallback={null}>
        <ResolveContext value={context} onReady={setResolved} />
      </Suspense>
      {mobile !== false ? (
        <div className="md:hidden">
          <ProfileSheet key={profile.id} data={sheetData} portal={false} />
        </div>
      ) : null}
      <main className="mx-auto w-full max-w-[1080px] px-4 py-8 max-md:hidden sm:px-6">
        <BackButton href={back.href} label={tPublic(back.label)} />
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
            onToggleSave={isOwnProfile || !resolved ? undefined : toggleSave}
            onCopyUsername={() => actions.copyUsername(profile, isOwnProfile)}
            onShare={() => actions.share(profile)}
            onReport={isOwnProfile ? undefined : () => actions.report(profile)}
            onBlock={isOwnProfile ? undefined : () => actions.block(profile.id)}
            onModerate={
              staff && !isOwnProfile ? setModerationTrigger : undefined
            }
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
      {staff && moderationTrigger !== undefined && mobile ? (
        <MobileTakeAction
          profileId={profile.id}
          displayName={profile.displayName}
          meId={staff.meId}
          meRole={staff.role}
          addToast={actions.addToast}
          onClose={() => setModerationTrigger(undefined)}
        />
      ) : null}
      {staff && moderationTrigger !== undefined && !mobile ? (
        <TakeActionPanel
          profileId={profile.id}
          displayName={profile.displayName}
          meId={staff.meId}
          meRole={staff.role}
          returnFocus={moderationTrigger}
          onClose={() => setModerationTrigger(undefined)}
        />
      ) : null}
      {actions.feedback}
    </>
  );
};
