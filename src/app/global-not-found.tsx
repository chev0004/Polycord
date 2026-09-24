import { RecoveryPage } from '@/features/Navigation/RecoveryPage';
import './globals.css';

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body>
        <RecoveryPage kind="missing" />
      </body>
    </html>
  );
}
