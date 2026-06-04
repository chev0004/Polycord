import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { ProfileRouteClient } from './ProfileRouteClient';

export default async function ProfileRoute({
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
      <ProfileRouteClient />
    </main>
  );
}
