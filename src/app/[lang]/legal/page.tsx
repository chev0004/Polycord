import { LegalHub } from '@/features/Legal';
import { getCurrentUser } from '@/lib/auth';

export default async function LegalIndexRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const user = await getCurrentUser();

  return (
    <LegalHub
      locale={lang}
      isLoggedIn={Boolean(user)}
      userAvatarUrl={user?.avatarUrl}
    />
  );
}
