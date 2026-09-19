'use client';

import { RecoveryPage } from '@/features/Navigation/RecoveryPage';

export default function ErrorPage() {
  return <RecoveryPage kind="error" reset={() => window.location.reload()} />;
}
