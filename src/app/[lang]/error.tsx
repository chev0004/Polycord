'use client';

import { useLocale } from 'next-intl';
import { RecoveryPage } from '@/features/Navigation/RecoveryPage';

export default function ErrorPage() {
  return (
    <RecoveryPage
      kind="error"
      locale={useLocale()}
      reset={() => window.location.reload()}
    />
  );
}
