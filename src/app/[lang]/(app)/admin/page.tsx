import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ModerationPage } from '@/features/Admin/ModerationPage';
import { getStaffRole } from '@/lib/admin';
import { getCurrentUser } from '@/lib/auth';
import { dayRangeIn } from '@/lib/dayRange';
import { loadModerationSnapshot } from '@/lib/moderation';
import { tracePage } from '@/lib/pageLoadTrace';
import { getSeedStatus } from '@/lib/seed/access';

async function AdminRoute({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const user = await getCurrentUser();
  const role = user ? await getStaffRole(user) : null;

  if (!user || !role) {
    redirect(`/${lang}`);
  }

  const timeZone = (await cookies()).get('polycord_tz')?.value;
  const [initial, seed] = await Promise.all([
    loadModerationSnapshot(
      user.accountId,
      role,
      timeZone ? dayRangeIn(timeZone) : null,
    ),
    getSeedStatus(user),
  ]);

  return <ModerationPage initial={initial} seed={seed} />;
}

export default tracePage('admin', AdminRoute);
