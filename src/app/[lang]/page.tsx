import { DiscoveryPage } from '@/features/Discovery/DiscoveryPage';
import { getCurrentUser } from '@/lib/auth';

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ authError?: string }>;
}) {
  const { lang } = await params;
  const { authError } = await searchParams;
  const user = await getCurrentUser();

  return (
    <DiscoveryPage
      authError={authError}
      isLoggedIn={Boolean(user)}
      locale={lang}
      userAvatarUrl={user?.avatarUrl}
    />
  );
}
