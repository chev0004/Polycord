import { getTranslations } from 'next-intl/server';
import { listPublicProfiles } from '@/db';
import { ProfileGrid } from '@/features/Discovery/ProfileGrid';

type DiscoveryFeedProps = {
  isLoggedIn: boolean;
  locale: string;
};

export const DiscoveryFeed = async ({
  isLoggedIn,
  locale,
}: DiscoveryFeedProps) => {
  const t = await getTranslations({ locale, namespace: 'Discovery' });

  try {
    const profiles = await listPublicProfiles();

    return (
      <ProfileGrid
        profiles={profiles}
        isLoggedIn={isLoggedIn}
        emptyState={t('emptyFeedDescription')}
      />
    );
  } catch (error) {
    console.error('Failed to load public profiles:', error);

    return (
      <div
        className="rounded-md border border-red-400/40 bg-red-950/30 px-4 py-3 font-figtree text-red-100 text-sm"
        role="alert"
      >
        <p className="font-semibold">{t('feedErrorTitle')}</p>
        <p className="mt-1 text-red-100/80">{t('feedErrorDescription')}</p>
      </div>
    );
  }
};
