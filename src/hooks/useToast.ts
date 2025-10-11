import type { Root as ToastPrimitiveRoot } from '@radix-ui/react-toast';
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

const ANIMATION_DURATION = 300;

export type ToastData = {
  id: number;
  title: string;
  description: string;
  duration?: number;
  iconUrl?: string;
};

export type UseToastProps = {
  toast: ToastData;
  onDismiss: (id: number) => void;
};
export type UseToastReturn = {
  open: boolean;
  onOpenChange: React.ComponentProps<typeof ToastPrimitiveRoot>['onOpenChange'];
  timerRef: RefObject<HTMLDivElement | null>;
};

/**
 * Hook to manage the lifecycle and animations of a single Toast notification.
 * It handles:
 * 1. Listening for the "shrink" progress bar animation to complete.
 * 2. Closing the Radix Toast primitive.
 * 3. Calling the main dismissal
 * function after the Radix "hide" animation completes.
 * @param {UseToastProps} props - The toast data and dismissal handler.
 * @returns {UseToastReturn} - Props for the Toast component.
 */
export const useToast = ({
  toast,
  onDismiss,
}: UseToastProps): UseToastReturn => {
  const [open, setOpen] = useState(true);
  const timerRef = useRef<HTMLDivElement | null>(null);

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

  return { open, onOpenChange: handleOpenChange, timerRef };
};

export type ToastMessage = Omit<ToastData, 'id'> & { id: number };

export const useToastStack = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const newId = new Date().getTime();
    const newToast = { ...toast, id: newId };
    setToasts((prev) => [...prev, newToast]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
};
