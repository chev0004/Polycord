'use client';

import { useRouter } from 'next/navigation';
import {
  ActivityStats,
  type ActivityStatsProps,
} from '@/features/Analytics/ActivityStats';

type ActivityRouteClientProps = Pick<
  ActivityStatsProps,
  'locale' | 'rangeDays' | 'analyticsEnabled' | 'premium' | 'stats'
>;

export const ActivityRouteClient = ({
  locale,
  ...rest
}: ActivityRouteClientProps) => {
  const router = useRouter();

  return (
    <ActivityStats
      locale={locale}
      {...rest}
      onEnableAnalytics={() => router.push(`/${locale}/settings#privacy`)}
      onUpgrade={() => router.push(`/${locale}/settings#premium`)}
    />
  );
};
