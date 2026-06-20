'use client';

import React from 'react';
import { type ToastData, useToast } from '@/hooks/useToast';
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
  if (!toasts.length) {
    return null;
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
