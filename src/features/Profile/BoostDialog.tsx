'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';
import { MdClose } from 'react-icons/md';
import { Button } from '@/components/Button';

export type BoostDialogError =
  | 'boostError'
  | 'boostErrorActive'
  | 'boostErrorNone';

type BoostDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  active: boolean;
  remaining: number;
  boosting: boolean;
  error: BoostDialogError | null;
  onBoost: () => void;
};

export const BoostDialog = ({
  open,
  onOpenChange,
  active,
  remaining,
  boosting,
  error,
  onBoost,
}: BoostDialogProps) => {
  const t = useTranslations('Profile');
  const depleted = !active && remaining <= 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content className="DialogContent pointer-events-auto flex max-h-[calc(100dvh-2rem)] w-[min(440px,calc(100vw-2rem))] flex-col gap-[22px] overflow-y-auto rounded-panel border border-line bg-background-dark p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <Dialog.Title className="min-w-0 flex-1 font-figtree font-semibold text-[19px] text-foreground leading-[1.2]">
                {t('boostProfile')}
              </Dialog.Title>
              <Dialog.Close
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-background-darker text-soft transition-colors hover:bg-primary-darker hover:text-foreground focus-visible:bg-primary-darker focus-visible:text-foreground"
                aria-label={t('boostClose')}
              >
                <MdClose size={20} />
              </Dialog.Close>
            </div>

            {active ? (
              <Dialog.Description className="font-semibold text-[11px] text-subtle uppercase tracking-[0.06em]">
                {t('boostActive')}
              </Dialog.Description>
            ) : (
              <Dialog.Description className="font-light text-[14px] text-muted leading-[1.55]">
                {t('boostLead')}
              </Dialog.Description>
            )}

            {error ? (
              <div
                role="alert"
                className="rounded-md border border-red-800 bg-danger-surface px-3.5 py-3 text-[14px] text-danger"
              >
                {t(error)}
              </div>
            ) : null}

            <div className="flex flex-col gap-2.5">
              <Button
                weight="semibold"
                onClick={onBoost}
                disabled={active || depleted || boosting}
                className="h-12 w-full text-[15px] disabled:bg-background-darker disabled:text-subtle disabled:opacity-100"
              >
                {active
                  ? t('boostRunning')
                  : depleted
                    ? t('boostNoneLeft')
                    : t('boostNow')}
              </Button>
              <p className="text-center text-[12px] text-subtle">
                {active
                  ? t('boostFineRunning')
                  : depleted
                    ? t('boostFineDepleted')
                    : t('boostFineAvailable', { count: remaining })}
              </p>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
