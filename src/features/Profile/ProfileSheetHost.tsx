'use client';

import dynamic from 'next/dynamic';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  MdBlock,
  MdBookmark,
  MdBookmarkBorder,
  MdFlag,
  MdOutlineShield,
  MdShare,
} from 'react-icons/md';
import { type ActionSheetItem, Sheet } from '@/components/Sheet';
import { ToastStack } from '@/components/Toast';
import { BlockDialog } from '@/features/Discovery/BlockDialog';
import { MobileProfileSheet } from '@/features/Discovery/MobileProfileSheet';
import { recordProfileView } from '@/features/Discovery/profileViewRequest';
import { saveProfileRequest } from '@/features/Discovery/saveProfileRequest';
import { notifyUsernameCopied } from '@/features/Inbox/notificationRequests';
import { LanguageDisplayProvider } from '@/features/Settings/LanguageDisplay';
import { TimeFormatProvider } from '@/features/Settings/TimeFormat';
import { useToastStack } from '@/hooks/useToast';
import { type ProfileSheetData, profileSheetStore } from './profileSheetStore';
import { useProfileActions } from './useProfileActions';

const MobileTakeAction = dynamic(() =>
  import('@/features/Admin/MobileTakeAction').then(
    (module) => module.MobileTakeAction,
  ),
);

const CLOSE_ANIMATION_MS = 300;

export const ProfileSheet = ({
  data,
  portal,
}: {
  data: ProfileSheetData;
  portal?: boolean;
}) => {
  const { profile, isLoggedIn, isOwn, viewerTimezone, staff } = data;
  const t = useTranslations('Discovery');
  const locale = useLocale();
  const [open, setOpen] = useState(true);
  const [animateEntry] = useState(!data.waitForDiscovery);
  const [isSaved, setIsSaved] = useState(data.isSaved);
  const [blockOpen, setBlockOpen] = useState(false);
  const [moderateOpen, setModerateOpen] = useState(false);
  const returnFocus = useRef<HTMLElement>(null);
  const actions = useProfileActions(locale, isLoggedIn, () =>
    handleOpenChange(false),
  );
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setIsSaved(data.isSaved), [data.isSaved]);
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (!data.waitForDiscovery) return;
    const preventNavigation = (event: Event) => event.preventDefault();
    window.addEventListener('polycord:navigate', preventNavigation);
    return () =>
      window.removeEventListener('polycord:navigate', preventNavigation);
  }, [data.waitForDiscovery]);

  const handleOpenChange = (next: boolean) => {
    if (!next && data.waitForDiscovery) return;
    setOpen(next);
    if (!next) {
      const closing = profileSheetStore.get();
      const closingId =
        typeof closing === 'string' ? closing : closing?.profile.id;
      if (closingId !== profile.id) return;
      closeTimer.current = setTimeout(() => {
        if (profileSheetStore.get() === closing) profileSheetStore.close();
      }, CLOSE_ANIMATION_MS);
    }
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
      profileSheetStore.remember({ ...data, isSaved: !isSaved });
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
    ...(staff && !isOwn
      ? [
          {
            key: 'moderate',
            icon: MdOutlineShield,
            label: t('moderateProfile'),
            onSelect: () => setModerateOpen(true),
          },
        ]
      : []),
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
        menuItems={data.waitForDiscovery ? [] : menuItems}
        pointerReturnFocus={false}
        portal={portal}
        animateEntry={animateEntry}
        dismissible={!data.waitForDiscovery}
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
      {staff && moderateOpen ? (
        <MobileTakeAction
          profileId={profile.id}
          displayName={profile.displayName}
          meId={staff.meId}
          meRole={staff.role}
          addToast={actions.addToast}
          onClose={() => setModerateOpen(false)}
        />
      ) : null}
      {actions.feedback}
    </>
  );
};

export const ProfileSheetHost = () => {
  const t = useTranslations('Inbox');
  const tPublic = useTranslations('PublicProfile');
  const target = useSyncExternalStore(
    profileSheetStore.subscribe,
    profileSheetStore.get,
    () => null,
  );
  const preferences = useSyncExternalStore(
    profileSheetStore.subscribe,
    profileSheetStore.preferences,
    profileSheetStore.preferences,
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
    let cancelled = false;
    profileSheetStore
      .load(target)
      .then((data) => {
        if (cancelled) return;
        if (!data.isOwn) recordProfileView(target);
        setLoaded({ id: target, data });
      })
      .catch(() => {
        if (cancelled) return;
        addToast({
          title: unavailableTitle,
          description: unavailableDescription,
          variant: 'error',
          duration: 4000,
        });
        profileSheetStore.close();
      });
    return () => {
      cancelled = true;
      setLoaded(null);
    };
  }, [target, addToast, unavailableTitle, unavailableDescription]);

  const data =
    typeof target === 'string'
      ? loaded?.id === target
        ? loaded.data
        : profileSheetStore.peek(target)
      : target;

  return (
    <LanguageDisplayProvider value={preferences.languageDisplay}>
      <TimeFormatProvider value={preferences.timeFormat}>
        {target ? (
          data ? (
            <ProfileSheet key={data.profile.id} data={data} />
          ) : (
            <Sheet
              open
              onOpenChange={(open) => {
                if (!open) profileSheetStore.close();
              }}
              title={tPublic('loading')}
              full
              pointerReturnFocus={false}
            >
              <output className="text-muted text-sm">
                {tPublic('loading')}
              </output>
            </Sheet>
          )
        ) : null}
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </TimeFormatProvider>
    </LanguageDisplayProvider>
  );
};
