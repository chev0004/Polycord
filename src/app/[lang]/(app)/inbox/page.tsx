import { redirect } from 'next/navigation';
import { InboxPage } from '@/features/Inbox/InboxPage';
import { getCurrentUser } from '@/lib/auth';

export default async function InboxRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${lang}?next=${encodeURIComponent(`/${lang}/inbox`)}`);
  }

  return <InboxPage />;
}
