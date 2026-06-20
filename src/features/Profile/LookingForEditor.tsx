'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { MdCheck } from 'react-icons/md';
import { FormGroup, Label } from '@/components/Form';
import { lookingForOptions } from '@/constants/lookingFor';

type LookingForEditorProps = {
  value: string[] | null | undefined;
  onChange: (value: string[]) => void;
};

export const LookingForEditor = ({
  value,
  onChange,
}: LookingForEditorProps) => {
  const t = useTranslations('Profile');
  const locale = useLocale();
  const options = useMemo(() => lookingForOptions(locale), [locale]);
  const selected = value ?? [];

  const toggle = (mode: string) => {
    onChange(
      selected.includes(mode)
        ? selected.filter((item) => item !== mode)
        : [...selected, mode],
    );
  };

  return (
    <FormGroup>
      <Label>{t('lookingForLabel')}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggle(option.value)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-[9px] font-medium text-[13px] transition-colors focus:outline-none ${
                active
                  ? 'border-primary-dark bg-primary-darker text-primary-light'
                  : 'border-white/10 bg-background-darker text-gray-300 hover:bg-background-main hover:text-white'
              }`}
            >
              {active && <MdCheck size={15} className="shrink-0" />}
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="text-[12px] text-gray-500">{t('lookingForHint')}</p>
    </FormGroup>
  );
};
