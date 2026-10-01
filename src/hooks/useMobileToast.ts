import {
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ToastData } from './useToast';

const STATUS_DURATION = 2600;
const ACTIVITY_DURATION = 5000;
const EXIT_DURATION = 250;
const SWIPE_DISMISS_DISTANCE = 24;
const TAP_TOLERANCE = 6;

export const useMobileToast = ({
  toast,
  onDismiss,
}: {
  toast: ToastData;
  onDismiss: (id: number) => void;
}) => {
  const [closing, setClosing] = useState(false);
  const [offset, setOffset] = useState(0);
  const remaining = useRef(
    toast.activity ? ACTIVITY_DURATION : STATUS_DURATION,
  );
  const startedAt = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const held = useRef(false);
  const startY = useRef<number | null>(null);
  const dragged = useRef(0);
  const moved = useRef(false);

  const close = useCallback(() => {
    window.clearTimeout(timer.current);
    setClosing(true);
    window.setTimeout(() => onDismiss(toast.id), EXIT_DURATION);
  }, [onDismiss, toast.id]);

  const resume = useCallback(() => {
    held.current = false;
    startedAt.current = Date.now();
    timer.current = window.setTimeout(close, remaining.current);
  }, [close]);

  const hold = useCallback(() => {
    if (held.current) return;
    held.current = true;
    window.clearTimeout(timer.current);
    remaining.current -= Date.now() - startedAt.current;
  }, []);

  useEffect(() => {
    resume();
    return () => window.clearTimeout(timer.current);
  }, [resume]);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    startY.current = event.clientY;
    dragged.current = 0;
    moved.current = false;
    hold();
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (startY.current === null) return;
    const distance = event.clientY - startY.current;
    if (Math.abs(distance) > TAP_TOLERANCE) moved.current = true;
    dragged.current = Math.min(0, distance);
    setOffset(dragged.current);
  };

  const onPointerEnd = () => {
    if (startY.current === null) return;
    startY.current = null;
    if (dragged.current < -SWIPE_DISMISS_DISTANCE) {
      close();
      return;
    }
    setOffset(0);
    resume();
  };

  const open = () => {
    if (moved.current) return;
    toast.activity?.onOpen();
    close();
  };

  return {
    closing,
    offset,
    open,
    gestures: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
  };
};
