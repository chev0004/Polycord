import * as ToastPrimitive from '@radix-ui/react-toast';
import type {
  ComponentProps,
  CSSProperties,
  ReactNode,
  RefObject,
} from 'react';
import { useState } from 'react';
import { MdClose } from 'react-icons/md';
import './style.css';
import { Avatar } from '../Avatar';

export const ToastProvider = (
  props: ComponentProps<typeof ToastPrimitive.Provider>,
) => {
  return <ToastPrimitive.Provider {...props} />;
};
export const ToastViewport = () => (
  <ToastPrimitive.Viewport className="ToastViewport fixed right-0 bottom-0 z-50 flex w-[390px] max-w-[100vw] list-none flex-col-reverse gap-3 p-6 outline-none" />
);

type ToastRootProps = ComponentProps<typeof ToastPrimitive.Root>;

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
  ...props
}: ToastProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <ToastPrimitive.Root
      {...props}
      duration={Number.POSITIVE_INFINITY}
      className="ToastRoot relative grid grid-cols-[auto_1fr_max-content] items-center gap-x-4 overflow-hidden rounded-md bg-background-darker shadow-lg data-[state=closed]:animate-hide data-[state=open]:animate-slideIn"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="col-span-3 grid grid-cols-[auto_1fr_max-content] items-center gap-x-4 p-4">
        {iconUrl ? (
          <Avatar avatarUrl={iconUrl} size={'md'} />
        ) : (
          <Avatar size={'md'} />
        )}

        <div>
          <ToastPrimitive.Title className="mb-0.5 font-figtree font-medium text-sm text-white">
            {title}
          </ToastPrimitive.Title>
          <ToastPrimitive.Description className="font-figtree text-[13px] text-gray-400">
            {description}
          </ToastPrimitive.Description>
        </div>
        <ToastPrimitive.Close className="flex text-gray-400 transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-white">
          <MdClose />
        </ToastPrimitive.Close>
      </div>

      <div
        ref={timerRef}
        className={`absolute bottom-0 left-0 h-0.5 w-full origin-left animate-shrink bg-white ${isHovered ? 'ToastTimer--paused' : 'ToastTimer--running'}`}
        style={{ '--toast-duration': `${duration}ms` } as CSSProperties}
      />
    </ToastPrimitive.Root>
  );
};
