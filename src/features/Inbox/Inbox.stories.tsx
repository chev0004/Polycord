import type { Meta, StoryObj } from '@storybook/react';
import { expect, screen, userEvent, within } from '@storybook/test';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import { Button } from '@/components/Button';
import { Toast, ToastProvider, ToastViewport } from '@/components/Toast';
import { MOCK_USER_AVATAR_URL } from '@/constants/mock-data';
import { type ToastData, useToast, useToastStack } from '@/hooks/useToast';
import type { Notification } from '@/types';
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

const NotificationsStory = () => {
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
          iconUrl: MOCK_USER_AVATAR_URL,
        },
        {
          id: '3',
          message: t('anonymousUserCopied'),
          timestamp: t('hoursAgo', { count: 2 }),
        },
      ]}
    />
  );
};

export const WithNotifications: Story = {
  render: () => <NotificationsStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = await canvas.findByRole('button', {
      name: 'Notifications',
    });

    await expect(canvas.getByText('3')).toBeInTheDocument();

    await userEvent.click(trigger);

    await expect(
      await screen.findByRole('heading', { name: 'Notifications' }),
    ).toBeInTheDocument();
  },
};

export const Empty: Story = {
  args: {
    notifications: [],
  },
};

const ToastComponent = React.memo(
  ({
    toast,
    onDismiss,
  }: {
    toast: ToastData;
    onDismiss: (id: number) => void;
  }) => {
    const { open, onOpenChange, timerRef } = useToast({ toast, onDismiss });

    if (!open && !timerRef.current) return null;

    return (
      <Toast
        open={open}
        onOpenChange={onOpenChange}
        title={toast.title}
        description={toast.description}
        duration={toast.duration}
        timerRef={timerRef}
        iconUrl={toast.iconUrl}
      />
    );
  },
);

ToastComponent.displayName = 'ToastComponent';

const LiveUpdateStory = () => {
  const t = useTranslations('Inbox');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { toasts, addToast, dismissToast } = useToastStack();

  const createNotificationAndToast = (
    messageKey: 'anonymousUserCopied' | 'userCopied',
    iconUrl?: string,
  ) => {
    const message =
      messageKey === 'userCopied'
        ? t('userCopied', { user: 'xhev' })
        : t('anonymousUserCopied');

    const newNotification: Notification = {
      id: Date.now().toString(),
      message: message,
      timestamp: t('minutesAgo', { count: 0 }),
      iconUrl: iconUrl,
    };

    const newToast: Omit<ToastData, 'id'> = {
      title: t('newNotification'),
      description: newNotification.message,
      duration: 5000,
      iconUrl: iconUrl,
    };

    setNotifications((prev) => [newNotification, ...prev]);
    addToast(newToast);
  };

  const simulateAnonNotification = () => {
    createNotificationAndToast('anonymousUserCopied');
  };

  const simulateUserNotification = () => {
    createNotificationAndToast('userCopied', MOCK_USER_AVATAR_URL);
  };

  return (
    <>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <p className="text-white">
            {t('simulateTitle')} {t('simulateInfo')}
          </p>
          <div className="flex gap-4">
            <Button onClick={simulateAnonNotification}>
              {t('simulateAnonButton')}
            </Button>
            <Button variant="discord" onClick={simulateUserNotification}>
              {t('simulateUserButton')}
            </Button>
          </div>
        </div>
        <div className="relative flex h-24 w-full items-center justify-end rounded-md bg-background-darker p-4">
          <Inbox notifications={notifications} />
        </div>
      </div>

      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onDismiss={dismissToast} />
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
