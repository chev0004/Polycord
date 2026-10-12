'use client';

import { useTranslations } from 'next-intl';
import {
  Checkbox,
  FormGroup,
  Label,
  TimeField,
  Toggle,
} from '@/components/Form';
import type {
  AvailabilityDays,
  AvailabilityPattern,
} from '@/constants/availability';
import { useTimeFormat } from '@/features/Settings/TimeFormat';

const DAY_KEYS: { id: AvailabilityDays; labelKey: string }[] = [
  { id: 'any', labelKey: 'availabilityDayAny' },
  { id: 'weekdays', labelKey: 'availabilityDayWeekdays' },
  { id: 'weekends', labelKey: 'availabilityDayWeekends' },
];

type AvailabilityEditorProps = {
  value: AvailabilityPattern | null | undefined;
  onChange: (value: AvailabilityPattern | null) => void;
  lastPattern: AvailabilityPattern;
  onLastPatternChange: (value: AvailabilityPattern) => void;
  disabled?: boolean;
};

export const AvailabilityEditor = ({
  value,
  onChange,
  lastPattern,
  onLastPatternChange,
  disabled = false,
}: AvailabilityEditorProps) => {
  const t = useTranslations('Profile');
  const timeFormat = useTimeFormat();

  const enabled = Boolean(value);
  const pattern = value ?? lastPattern;
  const patch = (next: Partial<AvailabilityPattern>) =>
    onChange({ ...pattern, ...next });

  return (
    <FormGroup>
      <div className="flex items-center justify-between">
        <Label>{t('freeTimeLabel')}</Label>
        <Toggle
          checked={enabled}
          disabled={disabled}
          onCheckedChange={(checked) => {
            if (!checked) onLastPatternChange(pattern);
            onChange(checked ? { ...lastPattern } : null);
          }}
          aria-label={t('freeTimeLabel')}
        />
      </div>

      {disabled && (
        <p className="text-[12px] text-subtle">
          {t('freeTimeRequiresTimezone')}
        </p>
      )}

      <fieldset
        disabled={disabled || !enabled}
        className="mt-2.5 flex min-w-0 flex-col gap-2.5 disabled:cursor-not-allowed disabled:opacity-50 [&_:disabled]:cursor-not-allowed"
      >
        <div className="flex gap-1.5">
          {DAY_KEYS.map((day) => {
            const active = pattern.days === day.id;
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => patch({ days: day.id })}
                aria-pressed={active}
                className={`flex-1 whitespace-nowrap rounded-lg border px-1 py-[9px] font-medium text-[13px] transition-colors focus:outline-none ${
                  active
                    ? 'border-primary-dark bg-primary-darker text-primary-light'
                    : 'border-line bg-background-darker text-soft enabled:hover:bg-background-main enabled:hover:text-foreground'
                }`}
              >
                {t(day.labelKey)}
              </button>
            );
          })}
        </div>

        <div className="flex items-end gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="font-semibold text-[11px] text-subtle uppercase tracking-[0.05em]">
              {t('availabilityFromLabel')}
            </span>
            <TimeField
              value={pattern.anyTime ? '' : pattern.from}
              onChange={(from) => patch({ from, anyTime: false })}
              format={timeFormat}
              label={t('availabilityFromLabel')}
              disabled={pattern.anyTime}
            />
          </div>
          <span className="pb-[15px] text-[13px] text-subtle">
            {t('availabilityTimeSeparator')}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="font-semibold text-[11px] text-subtle uppercase tracking-[0.05em]">
              {t('availabilityToLabel')}
            </span>
            <TimeField
              value={pattern.anyTime ? '' : pattern.to}
              onChange={(to) => patch({ to, anyTime: false })}
              format={timeFormat}
              label={t('availabilityToLabel')}
              disabled={pattern.anyTime}
            />
          </div>
        </div>

        <Checkbox
          checked={Boolean(pattern.anyTime)}
          onCheckedChange={(checked) => patch({ anyTime: checked === true })}
          label={t('availabilityAnyTime')}
        />

        <p className="text-[12px] text-subtle">{t('availabilityHint')}</p>
      </fieldset>
    </FormGroup>
  );
};
