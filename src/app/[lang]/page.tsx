import { DiscoveryPage } from '@/features/Discovery/DiscoveryPage';
import { getCurrentUser } from '@/lib/auth';

export default async function Home({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const user = await getCurrentUser();

  return (
    <DiscoveryPage
      isLoggedIn={Boolean(user)}
      locale={lang}
      userAvatarUrl={user?.avatarUrl}
    />
  );
}
