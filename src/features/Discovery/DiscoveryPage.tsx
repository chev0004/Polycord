'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { MdClose } from 'react-icons/md';
import { Navbar } from '@/features/Navbar';
import {
  getMissingRequiredFields,
  getOnboardingCompletion,
  ONBOARDING_DRAFT_STORAGE_KEY,
  type OnboardingDraft,
} from '@/features/Onboarding/completion';

type DiscoveryPageProps = {
  authError?: string;
  feed: ReactNode;
  isLoggedIn: boolean;
  locale: string;
  needsOnboarding?: boolean;
  userAvatarUrl?: string;
};

const onboardingFieldLabelKeys: Record<keyof OnboardingDraft, string> = {
  availability: 'onboardingFieldAvailability',
  bio: 'onboardingFieldBio',
  country: 'onboardingFieldCountry',
  primaryLanguage: 'onboardingFieldPrimaryLanguage',
  proficiencyLevel: 'onboardingFieldProficiencyLevel',
  tags: 'onboardingFieldTags',
  targetLanguage: 'onboardingFieldTargetLanguage',
  timezone: 'onboardingFieldTimezone',
};

export const DiscoveryPage = ({
  authError,
  feed,
  isLoggedIn,
  locale,
  needsOnboarding = false,
  userAvatarUrl,
}: DiscoveryPageProps) => {
  const router = useRouter();
  const t = useTranslations('Discovery');
  const [draft, setDraft] = useState<OnboardingDraft>({});
  const [isPromptDismissed, setIsPromptDismissed] = useState(false);

  useEffect(() => {
    if (!needsOnboarding) {
      return;
    }

    const rawDraft = localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY);

    if (!rawDraft) {
      setDraft({});
      return;
    }

    try {
      setDraft(JSON.parse(rawDraft) as OnboardingDraft);
    } catch {
      localStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY);
      setDraft({});
    }
  }, [needsOnboarding]);

  const missingRequiredFields = useMemo(
    () => getMissingRequiredFields(draft),
    [draft],
  );

  const completion = useMemo(() => getOnboardingCompletion(draft), [draft]);

  return (
    <div className="min-h-screen bg-background-main text-white">
      <Navbar
        iconUrl={userAvatarUrl}
        isLoggedIn={isLoggedIn}
        notifications={[]}
        onHomeClick={() => router.push(`/${locale}`)}
        onLoginClick={() =>
          window.location.assign(`/api/auth/discord?locale=${locale}`)
        }
        onProfileClick={() => router.push(`/${locale}/profile`)}
        onSettingsClick={() => router.push(`/${locale}/settings`)}
        onLogoutClick={() =>
          window.location.assign(`/api/auth/logout?locale=${locale}`)
        }
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-8">
        {authError ? (
          <div
            className="rounded-md border border-red-400/40 bg-red-950/30 px-4 py-3 font-figtree text-red-100 text-sm"
            role="alert"
          >
            <p className="font-semibold">{t('authErrorTitle')}</p>
            <p className="mt-1 text-red-100/80">{t('authErrorDescription')}</p>
          </div>
        ) : null}

        <header className="flex max-w-3xl flex-col gap-3">
          <p className="font-semibold text-primary text-xs uppercase tracking-wide">
            {t('pageEyebrow')}
          </p>
          <h1 className="font-bold font-figtree text-3xl text-white sm:text-4xl">
            {t('pageTitle')}
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed sm:text-base">
            {t('pageDescription')}
          </p>
        </header>

        {feed}
      </main>

      {needsOnboarding && !isPromptDismissed ? (
        <aside className="fixed right-4 bottom-4 z-40 w-[min(420px,calc(100vw-2rem))] rounded-lg bg-background-darker p-4 pr-11 shadow-xl">
          <div className="flex items-start">
            <button
              type="button"
              onClick={() => router.push(`/${locale}/onboarding`)}
              className="min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <p className="font-figtree font-semibold text-white">
                {t('onboardingPromptTitle')}
              </p>
              <p className="mt-1 text-gray-400 text-sm">
                {t('onboardingPromptProgress', { completion })}
                {missingRequiredFields.length > 0
                  ? ` ${t('onboardingPromptStillNeeded', {
                      fields: missingRequiredFields
                        .map((field) => t(onboardingFieldLabelKeys[field]))
                        .join(', '),
                    })}`
                  : ` ${t('onboardingPromptReady')}`}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background-main">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${completion}%` }}
                />
              </div>
            </button>
            <button
              type="button"
              onClick={() => setIsPromptDismissed(true)}
              className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-background-main hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={t('onboardingPromptDismiss')}
            >
              <MdClose size={16} />
            </button>
          </div>
        </aside>
      ) : null}
    </div>
  );
};
