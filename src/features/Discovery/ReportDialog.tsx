'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { MdClose } from 'react-icons/md';
import { Button } from '@/components/Button';
import { Checkbox, CheckGroup, Radio, RadioGroup } from '@/components/Form';
import { Sheet } from '@/components/Sheet';
import { useIsMobile } from '@/hooks/useMediaQuery';
import type { ReportReason } from './safetyRequests';

const REPORT_REASONS: ReportReason[] = [
  'spam',
  'harassment',
  'inappropriate',
  'impersonation',
  'disruptive_profile',
  'other',
];

const reasonLabelKeys: Record<ReportReason, string> = {
  spam: 'reportReasonSpam',
  harassment: 'reportReasonHarassment',
  inappropriate: 'reportReasonInappropriate',
  impersonation: 'reportReasonImpersonation',
  disruptive_profile: 'reportReasonDisruptive',
  other: 'reportReasonOther',
};

const MAX_DETAILS_LENGTH = 1000;

type ReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileName?: string;
  onSubmit: (
    reason: ReportReason,
    details: string,
    alsoBlock: boolean,
  ) => Promise<void> | void;
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
  const [alsoBlock, setAlsoBlock] = useState(false);
  const mobile = useIsMobile();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setReason(null);
      setDetails('');
      setAlsoBlock(false);
      setIsSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!reason || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(reason, details.trim(), alsoBlock);
      onOpenChange(false);
    } catch {
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
  };

  const description = profileName
    ? t('reportDialogDescriptionNamed', { name: profileName })
    : t('reportDialogDescription');

  const fields = (
    <>
      <div className="flex flex-col gap-2">
        <span
          id="report-reason-legend"
          className="font-semibold text-[11px] text-subtle uppercase tracking-wide"
        >
          {t('reportReasonLegend')}
        </span>
        <RadioGroup
          value={reason ?? ''}
          onValueChange={(value) => setReason(value as ReportReason)}
          aria-labelledby="report-reason-legend"
        >
          {REPORT_REASONS.map((value) => (
            <Radio
              key={value}
              value={value}
              label={t(reasonLabelKeys[value])}
              description={
                value === 'disruptive_profile'
                  ? t('reportReasonDisruptiveDescription')
                  : undefined
              }
            />
          ))}
        </RadioGroup>
      </div>

      <label className="flex flex-col gap-2">
        <span className="font-semibold text-[11px] text-subtle uppercase tracking-wide">
          {t('reportDetailsLabel')}
        </span>
        <textarea
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          maxLength={MAX_DETAILS_LENGTH}
          rows={3}
          placeholder={t('reportDetailsPlaceholder')}
          className="resize-none rounded-field border border-gray-500/30 bg-background-darker px-3 py-2 text-foreground text-sm placeholder:text-subtle focus:border-primary focus:outline-none"
        />
      </label>

      <div className="flex flex-col gap-2">
        <div className="h-px bg-line max-md:hidden" />
        <CheckGroup>
          <Checkbox
            checked={alsoBlock}
            onCheckedChange={(checked) => setAlsoBlock(checked === true)}
            label={t('reportAlsoBlock')}
            description={t('reportAlsoBlockDescription')}
          />
        </CheckGroup>
      </div>
    </>
  );

  const actions = (
    <>
      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
        className="max-md:h-12 max-md:flex-1"
      >
        {t('reportCancel')}
      </Button>
      <Button
        variant="primary"
        onClick={handleSubmit}
        disabled={!reason || isSubmitting}
        className="max-md:h-12 max-md:flex-1"
      >
        {t('reportSubmit')}
      </Button>
    </>
  );

  if (mobile) {
    return (
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title={t('reportDialogTitle')}
        footer={actions}
      >
        <div className="flex flex-col gap-5">
          <p className="text-muted text-sm">{description}</p>
          {fields}
        </div>
      </Sheet>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content
            className="DialogContent pointer-events-auto flex max-h-[calc(100dvh-2rem)] w-[min(440px,calc(100vw-2rem))] flex-col gap-5 overflow-y-auto rounded-panel bg-background-dark p-6 shadow-xl"
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <Dialog.Title className="font-figtree font-semibold text-foreground text-lg">
                  {t('reportDialogTitle')}
                </Dialog.Title>
                <Dialog.Description className="text-muted text-sm">
                  {description}
                </Dialog.Description>
              </div>
              <Dialog.Close
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-background-main hover:text-foreground focus-visible:bg-background-main focus-visible:text-foreground"
                aria-label={t('reportCancel')}
              >
                <MdClose size={18} />
              </Dialog.Close>
            </div>
            {fields}
            <div className="flex justify-end gap-3">{actions}</div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
