'use client';

import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { MdCheck } from 'react-icons/md';
import { Button } from '@/components/Button';

export const WarningNotice = ({
  open,
  acknowledged,
  busy = false,
  onAcknowledge,
  onClose,
}: {
  open: boolean;
  acknowledged: boolean;
  busy?: boolean;
  onAcknowledge: () => void;
  onClose: () => void;
}) => {
  const t = useTranslations('WarningNotice');
  const locale = useLocale();
  const content = useRef<HTMLDivElement>(null);
  const [checked, setChecked] = useState(false);
  const [nudge, setNudge] = useState(false);

  useEffect(() => {
    if (open) setChecked(false);
  }, [open]);

  const dismiss = () => (acknowledged ? onClose() : setNudge(true));

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/70 max-md:hidden" />
        <Dialog.Content
          ref={content}
          role="alertdialog"
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            content.current?.focus();
          }}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            dismiss();
          }}
          onInteractOutside={(event) => event.preventDefault()}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) dismiss();
          }}
          className="fixed inset-0 z-[91] flex items-center justify-center p-5 outline-none max-md:items-stretch max-md:p-0 max-md:pt-[env(safe-area-inset-top)]"
        >
          <div
            data-nudge={nudge ? '' : undefined}
            onAnimationEnd={() => setNudge(false)}
            className="WarningNotice flex max-h-[calc(100vh-40px)] w-full max-w-[540px] flex-col rounded-panel border border-line bg-background-dark max-md:max-h-none max-md:max-w-none max-md:rounded-none max-md:border-0 max-md:bg-background-main"
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-7 pt-7 pb-3 [scrollbar-width:none] max-md:px-6 max-md:pt-6 max-md:pb-4 [&::-webkit-scrollbar]:hidden">
              <header className="mb-[22px] max-md:mb-5">
                <div className="font-semibold text-muted text-xs uppercase tracking-[0.07em]">
                  {t('eyebrow')}
                </div>
                <Dialog.Title className="mt-1.5 font-bold text-2xl text-foreground leading-[1.15] tracking-[-0.01em] max-md:text-[30px]">
                  {t('harassmentTitle')}
                </Dialog.Title>
              </header>
              <div className="flex flex-col gap-4 text-[#e5e7eb] text-sm leading-[1.6] max-md:text-[15px]">
                <p>
                  {t.rich('harassmentParagraphOne', {
                    guidelines: (chunks) => (
                      <Link
                        href={`/${locale}/legal/guidelines`}
                        className="text-primary-lighter underline decoration-[rgba(229,238,247,0.5)] underline-offset-2 hover:text-foreground hover:decoration-foreground"
                      >
                        {chunks}
                      </Link>
                    ),
                  })}
                </p>
                <p>{t('harassmentParagraphTwo')}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-3.5 px-7 pt-2 pb-7 max-md:border-[rgba(107,114,128,0.25)] max-md:border-t max-md:bg-background-main max-md:px-5 max-md:pt-3 max-md:pb-[calc(env(safe-area-inset-bottom)+12px)]">
              <div className="flex flex-col gap-0.5">
                {acknowledged ? null : (
                  <label className="relative flex min-h-11 cursor-pointer select-none items-center gap-3 text-[15px] text-foreground leading-[1.4]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => setChecked(event.target.checked)}
                      className="peer absolute h-0 w-0 opacity-0"
                    />
                    <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border border-line-strong bg-background-darker text-transparent transition-colors duration-150 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-black peer-focus-visible:outline-2 peer-focus-visible:outline-primary peer-focus-visible:outline-offset-2">
                      <MdCheck size={18} aria-hidden />
                    </span>
                    {t('acknowledge')}
                  </label>
                )}
                <p
                  className={`text-muted text-xs leading-normal ${acknowledged ? '' : 'pl-[34px]'}`}
                >
                  {t('fine')}
                </p>
              </div>
              <Button
                weight="semibold"
                disabled={busy || (!acknowledged && !checked)}
                onClick={acknowledged ? onClose : onAcknowledge}
                className="h-12 w-full text-[15px]"
              >
                {acknowledged ? t('close') : t('continue')}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
