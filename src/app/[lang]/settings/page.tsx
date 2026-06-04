import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { SettingsRouteClient } from './SettingsRouteClient';

export default async function SettingsRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${lang}`);
  }

  return (
    <main className="min-h-screen bg-background-main">
      <SettingsRouteClient />
    </main>
  );
}
