'use client';

import { RecoveryPage } from '@/features/Navigation/RecoveryPage';
import './globals.css';

export default function GlobalError() {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-background-main">
        <RecoveryPage kind="error" reset={() => window.location.reload()} />
      </body>
    </html>
  );
}
