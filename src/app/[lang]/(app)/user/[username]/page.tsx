import { notFound, redirect } from 'next/navigation';
import { getPublicProfileIdByUsername } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { tracePage } from '@/lib/pageLoadTrace';

async function UsernameRoute({
  params,
}: {
  params: Promise<{ lang: string; username: string }>;
}) {
  const { lang, username } = await params;
  const user = await getCurrentUser();
  const profileId = await getPublicProfileIdByUsername(
    decodeURIComponent(username),
    user?.accountId,
  );

  if (!profileId) {
    notFound();
  }

  return redirect(`/${lang}/u/${profileId}`);
}

export default tracePage('user/[member]', UsernameRoute);
