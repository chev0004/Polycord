'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { type ReactNode, type RefObject, useEffect, useRef } from 'react';
import { Button } from '@/components/Button';

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  cancelLabel: ReactNode;
  confirmLabel: ReactNode;
  tone?: 'danger' | 'primary';
  returnFocus: RefObject<HTMLElement | null>;
  onConfirm: () => Promise<void> | void;
};

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel,
  confirmLabel,
  tone = 'danger',
  returnFocus,
  onConfirm,
}: ConfirmDialogProps) => {
  const confirmed = useRef(false);

  const handleConfirm = () => {
    if (confirmed.current) return;
    confirmed.current = true;
    onOpenChange(false);
    void onConfirm();
  };

  useEffect(() => {
    if (open) confirmed.current = false;
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content
            className="DialogContent pointer-events-auto flex w-[min(440px,calc(100vw-2rem))] flex-col gap-5 rounded-panel bg-background-dark p-6 shadow-xl"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              returnFocus.current?.focus();
            }}
          >
            <div className="flex flex-col gap-1">
              <Dialog.Title className="font-figtree font-semibold text-foreground text-lg">
                {title}
              </Dialog.Title>
              <Dialog.Description className="text-muted text-sm">
                {description}
              </Dialog.Description>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {cancelLabel}
              </Button>
              {tone === 'danger' ? (
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex select-none items-center justify-center rounded-control bg-red-700 px-4 py-2 font-figtree text-sm text-white transition-colors hover:bg-red-600 focus:outline-none focus-visible:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {confirmLabel}
                </button>
              ) : (
                <Button onClick={handleConfirm}>{confirmLabel}</Button>
              )}
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
