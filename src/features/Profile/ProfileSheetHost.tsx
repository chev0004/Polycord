'use client';

import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  MdBlock,
  MdBookmark,
  MdBookmarkBorder,
  MdFlag,
  MdShare,
} from 'react-icons/md';
import type { ActionSheetItem } from '@/components/Sheet';
import { ToastStack } from '@/components/Toast';
import { BlockDialog } from '@/features/Discovery/BlockDialog';
import { MobileProfileSheet } from '@/features/Discovery/MobileProfileSheet';
import { recordProfileView } from '@/features/Discovery/profileViewRequest';
import { saveProfileRequest } from '@/features/Discovery/saveProfileRequest';
import { notifyUsernameCopied } from '@/features/Inbox/notificationRequests';
import { useToastStack } from '@/hooks/useToast';
import { type ProfileSheetData, profileSheetStore } from './profileSheetStore';
import { useProfileActions } from './useProfileActions';

const CLOSE_ANIMATION_MS = 300;

const ProfileSheet = ({ data }: { data: ProfileSheetData }) => {
  const { profile, isLoggedIn, isOwn, viewerTimezone } = data;
  const t = useTranslations('Discovery');
  const locale = useLocale();
  const [open, setOpen] = useState(true);
  const [isSaved, setIsSaved] = useState(data.isSaved);
  const [blockOpen, setBlockOpen] = useState(false);
  const returnFocus = useRef<HTMLElement>(null);
  const actions = useProfileActions(locale, isLoggedIn, () => setOpen(false));

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setTimeout(profileSheetStore.close, CLOSE_ANIMATION_MS);
  };

  const toggleSave = async () => {
    if (!isLoggedIn) {
      actions.addToast({
        title: t('saveLoginTitle'),
        description: t('saveLoginDescription'),
        duration: 4000,
      });
      return;
    }
    try {
      await saveProfileRequest(profile.id, !isSaved);
      setIsSaved(!isSaved);
    } catch {
      actions.addToast({
        title: t('saveError'),
        variant: 'error',
        description: t('saveErrorDescription'),
        duration: 4000,
      });
    }
  };

  const menuItems: ActionSheetItem[] = [
    ...(isOwn
      ? []
      : [
          {
            key: 'save',
            icon: isSaved ? MdBookmark : MdBookmarkBorder,
            label: isSaved ? t('unsaveProfile') : t('saveProfile'),
            onSelect: toggleSave,
          },
        ]),
    {
      key: 'share',
      icon: MdShare,
      label: t('shareProfile'),
      onSelect: () => actions.share(profile),
    },
    ...(isOwn
      ? []
      : [
          {
            key: 'report',
            icon: MdFlag,
            label: t('reportProfile'),
            danger: true,
            onSelect: () => actions.report(profile),
          },
          {
            key: 'block',
            icon: MdBlock,
            label: t('blockProfile'),
            danger: true,
            onSelect: () => setBlockOpen(true),
          },
        ]),
  ];

  return (
    <>
      <MobileProfileSheet
        profile={profile}
        open={open}
        onOpenChange={handleOpenChange}
        isLoggedIn={isLoggedIn}
        viewerTimezone={viewerTimezone}
        onCopyUsername={(_username, _id, _avatarUrl, copiedToClipboard) => {
          if (copiedToClipboard && !isOwn)
            notifyUsernameCopied(profile.id).catch(() => {});
        }}
        menuItems={menuItems}
        pointerReturnFocus={false}
      />
      <BlockDialog
        open={blockOpen}
        onOpenChange={setBlockOpen}
        profileName={profile.displayName}
        returnFocus={returnFocus}
        onConfirm={async () => {
          handleOpenChange(false);
          await actions.block(profile.id);
        }}
      />
      {actions.feedback}
    </>
  );
};

export const ProfileSheetHost = () => {
  const t = useTranslations('Inbox');
  const onPublicProfileRoute = usePathname().split('/')[2] === 'u';
  const target = useSyncExternalStore(
    profileSheetStore.subscribe,
    profileSheetStore.get,
    () => null,
  );
  const [loaded, setLoaded] = useState<{
    id: string;
    data: ProfileSheetData;
  } | null>(null);
  const { toasts, addToast, dismissToast } = useToastStack();
  const unavailableTitle = t('profileUnavailableTitle');
  const unavailableDescription = t('profileUnavailable');

  useEffect(() => {
    if (typeof target !== 'string') return;
    const controller = new AbortController();
    fetch(`/api/profile/public/${target}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error('Profile unavailable');
        return response.json() as Promise<ProfileSheetData>;
      })
      .then((data) => {
        if (!data.isOwn) recordProfileView(target);
        setLoaded({ id: target, data });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        addToast({
          title: unavailableTitle,
          description: unavailableDescription,
          variant: 'error',
          duration: 4000,
        });
        profileSheetStore.close();
      });
    return () => {
      controller.abort();
      setLoaded(null);
    };
  }, [target, addToast, unavailableTitle, unavailableDescription]);

  const data =
    typeof target === 'string'
      ? loaded?.id === target
        ? loaded.data
        : null
      : target;

  return (
    <>
      {data && !onPublicProfileRoute ? (
        <ProfileSheet key={data.profile.id} data={data} />
      ) : null}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};
