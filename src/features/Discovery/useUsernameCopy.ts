import { useState } from 'react';
import { copyText } from '@/lib/clipboard';
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
    const copiedToClipboard = await copyText(profile.discordUsername);
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
