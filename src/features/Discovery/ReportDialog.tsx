'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { MdClose } from 'react-icons/md';
import { Button } from '@/components/Button';
import type { ReportReason } from './safetyRequests';

const REPORT_REASONS: ReportReason[] = [
  'spam',
  'harassment',
  'inappropriate',
  'impersonation',
  'other',
];

const reasonLabelKeys: Record<ReportReason, string> = {
  spam: 'reportReasonSpam',
  harassment: 'reportReasonHarassment',
  inappropriate: 'reportReasonInappropriate',
  impersonation: 'reportReasonImpersonation',
  other: 'reportReasonOther',
};

const MAX_DETAILS_LENGTH = 1000;

type ReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileName?: string;
  onSubmit: (reason: ReportReason, details: string) => Promise<void> | void;
};

export const ReportDialog = ({
  open,
  onOpenChange,
  profileName,
  onSubmit,
}: ReportDialogProps) => {
  const t = useTranslations('Discovery');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setReason(null);
      setDetails('');
      setIsSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!reason || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(reason, details.trim());
      onOpenChange(false);
    } catch {
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-[fadeIn_150ms_ease-out]" />
        <Dialog.Content
          className="-translate-x-1/2 -translate-y-1/2 fixed top-1/2 left-1/2 z-50 flex w-[min(440px,calc(100vw-2rem))] flex-col gap-5 rounded-2xl bg-background-dark p-6 shadow-xl"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="font-figtree font-semibold text-lg text-white">
                {t('reportDialogTitle')}
              </Dialog.Title>
              <Dialog.Description className="text-gray-400 text-sm">
                {profileName
                  ? t('reportDialogDescriptionNamed', { name: profileName })
                  : t('reportDialogDescription')}
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-background-main hover:text-white"
              aria-label={t('reportCancel')}
            >
              <MdClose size={18} />
            </Dialog.Close>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-semibold text-[11px] text-gray-500 uppercase tracking-wide">
              {t('reportReasonLegend')}
            </legend>
            {REPORT_REASONS.map((value) => {
              const isSelected = reason === value;

              return (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-white'
                      : 'border-gray-500/30 text-gray-300 hover:border-gray-500/60 hover:bg-background-darker'
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={value}
                    checked={isSelected}
                    onChange={() => setReason(value)}
                    className="h-4 w-4 accent-primary"
                  />
                  {t(reasonLabelKeys[value])}
                </label>
              );
            })}
          </fieldset>

          <label className="flex flex-col gap-2">
            <span className="font-semibold text-[11px] text-gray-500 uppercase tracking-wide">
              {t('reportDetailsLabel')}
            </span>
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={MAX_DETAILS_LENGTH}
              rows={3}
              placeholder={t('reportDetailsPlaceholder')}
              className="resize-none rounded-lg border border-gray-500/30 bg-background-darker px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-primary focus:outline-none"
            />
          </label>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('reportCancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!reason || isSubmitting}
            >
              {t('reportSubmit')}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
