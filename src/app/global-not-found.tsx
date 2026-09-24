import { RecoveryPage } from '@/features/Navigation/RecoveryPage';
import './globals.css';

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-background-main">
        <RecoveryPage kind="missing" />
      </body>
    </html>
  );
}
