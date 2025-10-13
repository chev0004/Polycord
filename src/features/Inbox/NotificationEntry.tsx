import type { HTMLAttributes } from 'react';
import {
  MdClose,
  MdOutlineMarkEmailRead,
  MdOutlineMarkEmailUnread,
} from 'react-icons/md';
import { Avatar } from '@/components/Avatar';
import type { Notification } from '@/types';

type NotificationEntryProps = {
  notification: Notification & { read: boolean; isDeleting?: boolean };
  onMarkAsRead: () => void;
  onDelete: () => void;
} & HTMLAttributes<HTMLDivElement>;

export const NotificationEntry: React.FC<NotificationEntryProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
  className,
  ...props
}) => {
  return (
    <div
      {...props}
      className={`group/entry relative flex items-center gap-3 rounded-md bg-background-main p-3 text-white transition-all duration-300 ease-in-out ${notification.read ? 'opacity-60' : 'opacity-100'}
      ${
        notification.isDeleting ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
      }
      ${className}`}
    >
      {/* Unread Indicator Dot */}
      <span
        className={`-left-1 absolute h-2 w-2 flex-shrink-0 rounded-full bg-primary transition-opacity duration-300 ${
          notification.read ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Icon */}
      <Avatar avatarUrl={notification.iconUrl} size="sm" />

      {/* Text block */}
      <div className="flex-grow overflow-hidden">
        <p className="truncate text-sm">{notification.message}</p>
        <span className="text-gray-400 text-xs">{notification.timestamp}</span>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-shrink-0 items-center opacity-0 transition-opacity group-hover/entry:opacity-100">
        <button
          type="button"
          onClick={onMarkAsRead}
          className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-background-darker hover:text-white"
          title={notification.read ? 'Mark as unread' : 'Mark as read'}
        >
          {notification.read ? (
            <MdOutlineMarkEmailRead size={18} />
          ) : (
            <MdOutlineMarkEmailUnread size={18} />
          )}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-background-darker hover:text-white"
          title="Delete"
        >
          <MdClose size={18} />
        </button>
      </div>
    </div>
  );
};
