'use client';

import { useTranslations } from 'next-intl';
import type { RefObject } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';

type BlockDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileName: string;
  returnFocus: RefObject<HTMLElement | null>;
  onConfirm: () => Promise<void> | void;
};

export const BlockDialog = ({ profileName, ...props }: BlockDialogProps) => {
  const t = useTranslations('Discovery');

  return (
    <ConfirmDialog
      {...props}
      title={t('blockDialogTitle', { name: profileName })}
      description={t('blockDialogDescription', { name: profileName })}
      cancelLabel={t('blockCancel')}
      confirmLabel={t('blockConfirm')}
    />
  );
};
