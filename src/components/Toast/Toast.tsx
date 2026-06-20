import type {
  ComponentProps,
  CSSProperties,
  MouseEventHandler,
  ReactNode,
  RefObject,
} from 'react';
import { useState } from 'react';
import { MdClose } from 'react-icons/md';
import './style.css';
import { Avatar } from '../Avatar';

export const ToastProvider = ({ children }: { children?: ReactNode }) => {
  return <>{children}</>;
};

export const ToastViewport = ({ children }: { children?: ReactNode }) => (
  <ol className="ToastViewport fixed right-0 bottom-0 z-50 flex w-[390px] max-w-[100vw] list-none flex-col-reverse gap-3 p-6 outline-none">
    {children}
  </ol>
);

type ToastRootProps = Omit<ComponentProps<'li'>, 'title'> & {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type ToastProps = {
  title: string;
  description: ReactNode;
  timerRef?: RefObject<HTMLDivElement | null>;
  duration?: number;
  iconUrl?: string;
} & ToastRootProps;

export const Toast = ({
  title,
  description,
  duration = 5000,
  timerRef,
  iconUrl,
  open = true,
  onOpenChange,
  onMouseEnter,
  onMouseLeave,
  ...props
}: ToastProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const state = open ? 'open' : 'closed';
  const handleMouseEnter: MouseEventHandler<HTMLLIElement> = (event) => {
    setIsHovered(true);
    onMouseEnter?.(event);
  };
  const handleMouseLeave: MouseEventHandler<HTMLLIElement> = (event) => {
    setIsHovered(false);
    onMouseLeave?.(event);
  };

  return (
    <li
      {...props}
      aria-live="polite"
      className="ToastRoot relative grid grid-cols-[auto_1fr_max-content] items-center gap-x-4 overflow-hidden rounded-md bg-background-darker shadow-lg data-[state=closed]:animate-hide data-[state=open]:animate-slideIn"
      data-state={state}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="col-span-3 grid grid-cols-[auto_1fr_max-content] items-center gap-x-4 p-4">
        {iconUrl ? (
          <Avatar avatarUrl={iconUrl} size={'md'} />
        ) : (
          <Avatar size={'md'} />
        )}

        <div>
          <div className="mb-0.5 font-figtree font-medium text-sm text-white">
            {title}
          </div>
          <div className="font-figtree text-[13px] text-gray-400">
            {description}
          </div>
        </div>
        <button
          type="button"
          className="flex text-gray-400 transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-white"
          onClick={() => onOpenChange?.(false)}
        >
          <MdClose />
        </button>
      </div>

      <div
        ref={timerRef}
        className={`absolute bottom-0 left-0 h-0.5 w-full origin-left animate-shrink bg-white ${isHovered ? 'ToastTimer--paused' : 'ToastTimer--running'}`}
        style={{ '--toast-duration': `${duration}ms` } as CSSProperties}
      />
    </li>
  );
};
