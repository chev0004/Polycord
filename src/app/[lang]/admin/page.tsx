import { redirect } from 'next/navigation';
import { ModerationPage } from '@/features/Admin/ModerationPage';
import { isAdmin } from '@/lib/admin';
import { getCurrentUser } from '@/lib/auth';
import { loadModerationSnapshot } from '@/lib/moderation';

export default async function AdminRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const user = await getCurrentUser();

  if (!user || !isAdmin(user)) {
    redirect(`/${lang}`);
  }

  return (
    <ModerationPage initial={await loadModerationSnapshot(user.accountId)} />
  );
}
