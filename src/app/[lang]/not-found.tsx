'use client';

import { useLocale } from 'next-intl';
import { RecoveryPage } from '@/features/Navigation/RecoveryPage';

export default function NotFound() {
  return <RecoveryPage kind="missing" locale={useLocale()} />;
}
