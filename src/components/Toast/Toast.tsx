import * as ToastPrimitive from '@radix-ui/react-toast';
import type {
  CSSProperties,
  ComponentProps,
  ReactNode,
  RefObject,
} from 'react';
import { useState } from 'react';
import { MdClose } from 'react-icons/md';
import './style.css';

export const ToastProvider = (
  props: ComponentProps<typeof ToastPrimitive.Provider>,
) => {
  return <ToastPrimitive.Provider {...props} />;
};
export const ToastViewport = () => (
  <ToastPrimitive.Viewport className="ToastViewport fixed right-0 bottom-0 z-50 flex w-[390px] max-w-[100vw] list-none flex-col-reverse gap-3 p-6 outline-none" />
);

type ToastProps = {
  title: string;
  description: ReactNode;
  timerRef?: RefObject<HTMLDivElement | null>;
} & ComponentProps<typeof ToastPrimitive.Root>;

export const Toast = ({
  title,
  description,
  duration = 5000,
  timerRef,
  ...props
}: ToastProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <ToastPrimitive.Root
      {...props}
      duration={Number.POSITIVE_INFINITY}
      className="ToastRoot relative grid grid-cols-[auto_max-content] items-center gap-x-4 overflow-hidden rounded-md bg-background-darker p-4 shadow-lg data-[state=closed]:animate-hide data-[state=open]:animate-slideIn"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div>
        <ToastPrimitive.Title className="mb-1 font-figtree font-medium text-white">
          {title}
        </ToastPrimitive.Title>
        <ToastPrimitive.Description className="font-figtree text-gray-400 text-sm">
          {description}
        </ToastPrimitive.Description>
      </div>
      <ToastPrimitive.Close className="text-gray-400 hover:text-white">
        <MdClose />
      </ToastPrimitive.Close>

      <div
        ref={timerRef}
        className={`absolute bottom-0 left-0 h-0.5 origin-left animate-shrink bg-white ${
          isHovered ? 'ToastTimer--paused' : 'ToastTimer--running'
        }`}
        style={{ '--toast-duration': `${duration}ms` } as CSSProperties}
      />
    </ToastPrimitive.Root>
  );
};
