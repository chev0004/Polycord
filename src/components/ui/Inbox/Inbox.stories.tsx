import type { Notification } from '@/types';
import type { Meta, StoryObj } from '@storybook/react';
import { useTranslations } from 'next-intl';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '../Button';
import { Toast, ToastProvider, ToastViewport } from '../Toast';
import { Inbox } from './Inbox';

const meta: Meta<typeof Inbox> = {
  title: 'Components/Inbox',
  component: Inbox,
  decorators: [
    (Story) => (
      <div className="p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Inbox>;

export const WithNotifications: Story = {
  render: () => {
    const t = useTranslations('Inbox');
    return (
      <Inbox
        notifications={[
          {
            id: '1',
            message: t('anonymousUserCopied'),
            timestamp: t('minutesAgo', { count: 2 }),
          },
          {
            id: '2',
            message: t('userCopied', { user: 'xhev' }),
            timestamp: t('hoursAgo', { count: 1 }),
            iconUrl:
              'https://cdn.discordapp.com/avatars/559278744330698752/05acb5001d40db956558f9cfdbe6414d.webp?size=1024',
          },
          {
            id: '3',
            message: t('anonymousUserCopied'),
            timestamp: t('hoursAgo', { count: 2 }),
          },
        ]}
      />
    );
  },
};

export const Empty: Story = {
  args: {
    notifications: [],
  },
};

type ToastData = {
  id: number;
  title: string;
  description: string;
};

const BAR_DISPLAY_DURATION = 5000;
const ANIMATION_DURATION = 300;

const ToastItem = React.memo(function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastData;
  onDismiss: (id: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const timerRef = useRef<HTMLDivElement>(null);

  const handleBarAnimationEnd = useCallback((event: AnimationEvent) => {
    if (event.animationName === 'shrink') {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    const barElement = timerRef.current;

    if (open && barElement) {
      barElement.addEventListener('animationend', handleBarAnimationEnd);

      return () => {
        barElement.removeEventListener('animationend', handleBarAnimationEnd);
      };
    }
  }, [open, handleBarAnimationEnd]);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        setOpen(false);
        setTimeout(() => {
          onDismiss(toast.id);
        }, ANIMATION_DURATION);
      }
    },
    [onDismiss, toast.id],
  );

  return (
    <Toast
      open={open}
      onOpenChange={handleOpenChange}
      title={toast.title}
      description={toast.description}
      duration={BAR_DISPLAY_DURATION}
      timerRef={timerRef}
    />
  );
});

const LiveUpdateStory = () => {
  const t = useTranslations('Inbox');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const simulateNotification = () => {
    const newId = new Date().getTime();

    const newNotification: Notification = {
      id: newId.toString(),
      message: t('anonymousUserCopied'),
      timestamp: t('minutesAgo', { count: 0 }),
    };

    const newToast: ToastData = {
      id: newId,
      title: t('newNotification'),
      description: newNotification.message,
    };

    setNotifications((prev) => [newNotification, ...prev]);
    setToasts((prev) => [...prev, newToast]);
  };

  const handleDismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <p className="text-white">{t('simulateInfo')}</p>
          <Button onClick={simulateNotification}>{t('simulateButton')}</Button>
        </div>
        <div className="relative flex h-24 w-full items-center justify-end rounded-md bg-background-darker p-4">
          <Inbox notifications={notifications} />
        </div>
      </div>

      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={handleDismiss} />
      ))}
    </>
  );
};

export const LiveUpdate: Story = {
  render: () => (
    <ToastProvider>
      <LiveUpdateStory />
      <ToastViewport />
    </ToastProvider>
  ),
};
