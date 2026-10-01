'use client';

import React, { useEffect } from 'react';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { type ToastData, useToast } from '@/hooks/useToast';
import { MobileToast, MobileToastViewport } from './MobileToast';
import { Toast, ToastProvider, ToastViewport } from './Toast';

const ToastItem = React.memo(
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
ToastItem.displayName = 'ToastItem';

type ToastStackProps = {
  toasts: ToastData[];
  onDismiss: (id: number) => void;
};

export const ToastStack = ({ toasts, onDismiss }: ToastStackProps) => {
  const mobile = useIsMobile();
  const latest = toasts.at(-1);

  useEffect(() => {
    if (!mobile) return;
    for (const toast of toasts.slice(0, -1)) onDismiss(toast.id);
  }, [mobile, toasts, onDismiss]);

  if (!latest) {
    return null;
  }

  if (mobile) {
    return (
      <MobileToastViewport>
        <MobileToast key={latest.id} toast={latest} onDismiss={onDismiss} />
      </MobileToastViewport>
    );
  }

  return (
    <ToastProvider>
      <ToastViewport>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </ToastViewport>
    </ToastProvider>
  );
};
