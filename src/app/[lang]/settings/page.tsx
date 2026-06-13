import { redirect } from 'next/navigation';
import { getProfileByDiscordUserId } from '@/db';
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

  const profile = await getProfileByDiscordUserId(user.id);

  return (
    <main className="min-h-screen bg-background-main">
      <SettingsRouteClient
        defaultEmail={user.email ?? ''}
        initialPrivacySettings={
          profile
            ? {
                allowAnonymousCopy: profile.profile.allowAnonymousCopy,
                displayTimezone: profile.profile.displayTimezone,
                isPublic: profile.profile.isPublic,
              }
            : undefined
        }
        locale={lang}
        userAvatarUrl={user.avatarUrl}
        userDisplayName={user.name}
      />
    </main>
  );
}
