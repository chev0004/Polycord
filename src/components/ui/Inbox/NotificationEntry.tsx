import type { Notification } from '@/types';
import Image from 'next/image';
import type React from 'react';
import {
  MdDelete,
  MdOutlineMarkEmailRead,
  MdOutlineMarkEmailUnread,
} from 'react-icons/md';

type NotificationEntryProps = {
  notification: Notification & { read: boolean };
  onMarkAsRead: () => void;
  onDelete: () => void;
};

export const NotificationEntry: React.FC<NotificationEntryProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
}) => {
  return (
    <div
      className={`flex items-end justify-between gap-3 rounded-md bg-background-main p-3 text-white transition-all duration-300 ${
        notification.read
          ? 'origin-center scale-y-[0.98] opacity-60'
          : 'scale-y-100 opacity-100'
      }`}
    >
      <div className="flex items-center gap-3 ">
        <span
          className={`-left-1 absolute h-2 w-2 rounded-full bg-white transition-opacity duration-300 ${
            notification.read ? 'opacity-0' : 'opacity-100'
          }`}
        />
        {notification.iconUrl ? (
          <Image
            src={notification.iconUrl}
            alt="User profile"
            className="h-8 w-8 rounded-full object-cover"
            width={32}
            height={32}
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-dark">
            <span className="text-gray-400 text-xs">?</span>
          </div>
        )}
        <div>
          <p className="text-sm">{notification.message}</p>
          <span className="text-gray-400 text-xs">
            {notification.timestamp}
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onMarkAsRead}
          className="text-gray-400 transition-colors hover:text-white"
          title={notification.read ? 'Mark as unread' : 'Mark as read'}
        >
          {notification.read ? (
            <MdOutlineMarkEmailRead size={20} />
          ) : (
            <MdOutlineMarkEmailUnread size={20} />
          )}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-gray-400 transition-colors hover:text-white"
          title="Delete"
        >
          <MdDelete size={20} />
        </button>
      </div>
    </div>
  );
};
