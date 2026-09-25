import { useState } from 'react';
import { trackClientEvent } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import type { DiscoveryProfile } from './ProfileCard';

export type CopyUsernameHandler = (
  username: string,
  profileId: string,
  avatarUrl: string | undefined,
  copiedToClipboard: boolean,
) => void;

export const useUsernameCopy = (
  profile: DiscoveryProfile,
  onCopyUsername?: CopyUsernameHandler,
) => {
  const [status, setStatus] = useState<'idle' | 'copying' | 'copied'>('idle');
  const [copyFailed, setCopyFailed] = useState(false);

  const copy = async () => {
    if (status !== 'idle' || !profile.discordUsername) return;

    setStatus('copying');
    setCopyFailed(false);
    const copiedToClipboard = await navigator.clipboard
      .writeText(profile.discordUsername)
      .then(
        () => true,
        () => false,
      );
    trackClientEvent(ANALYTICS_EVENTS.profileUsernameCopy);
    onCopyUsername?.(
      profile.discordUsername,
      profile.id,
      profile.avatarUrl,
      copiedToClipboard,
    );

    if (!copiedToClipboard) {
      setCopyFailed(true);
      setStatus('idle');
      return;
    }

    setStatus('copied');
    setTimeout(() => setStatus('idle'), 2000);
  };

  return { copy, copied: status === 'copied', copyFailed };
};
