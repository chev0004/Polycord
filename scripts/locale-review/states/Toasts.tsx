import { useEffect, useRef } from 'react';
import { ToastStack } from '@/components/Toast';
import { type ToastData, useToastStack } from '@/hooks/useToast';

export function Toasts({ messages }: { messages: string[][] }) {
  const { toasts, addToast, dismissToast } = useToastStack();
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    for (const [title, description] of messages)
      addToast({ title, description, duration: 1e9 } satisfies Omit<
        ToastData,
        'id'
      >);
  }, [messages, addToast]);
  return <ToastStack toasts={toasts} onDismiss={dismissToast} />;
}
