import { useAlign } from '@/hooks/useAlign';
import type { Notifications } from '@/types';
import * as Popover from '@radix-ui/react-popover';
import { useState } from 'react';
import { MdOutlineInbox } from 'react-icons/md';
import { NotificationEntry } from './NotificationEntry';

export const Inbox = ({
  notifications: initialNotifications,
}: { notifications: Notifications }) => {
  const { triggerRef, align } = useAlign();
  const [notifications, setNotifications] = useState(
    initialNotifications.map((n) => ({ ...n, read: false })),
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: !n.read } : n)),
    );
  };

  const handleDelete = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  return (
    <Popover.Root>
      <Popover.Trigger ref={triggerRef} className="relative">
        <MdOutlineInbox
          className="cursor-pointer text-white text-xl transition-all transition-color duration-200 hover:text-gray-300"
          size={24}
        />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-2 w-2 items-center justify-center rounded-full bg-primary" />
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="PopoverContent min-w-[300px] rounded-lg border-[1px] border-gray-500 bg-background-dark p-4 shadow-lg"
          side="bottom"
          align={align}
          asChild={true}
          avoidCollisions={true}
          collisionPadding={16}
          sideOffset={5}
        >
          <div className="flex flex-col gap-2">
            <h3 className="font-bold font-figtree text-lg text-white">
              Notifications
            </h3>
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <NotificationEntry
                  notification={notification}
                  key={notification.id}
                  onMarkAsRead={() => handleMarkAsRead(notification.id)}
                  onDelete={() => handleDelete(notification.id)}
                />
              ))
            ) : (
              <div className="flex flex-col items-center gap-2 py-8">
                <MdOutlineInbox size={48} className="text-gray-500" />
                <p className="text-gray-400">No notifications yet</p>
              </div>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
