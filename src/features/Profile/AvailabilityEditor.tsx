'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { MdCheckCircle, MdRadioButtonUnchecked } from 'react-icons/md';
import { FormGroup, Label, Toggle } from '@/components/Form';
import {
  type AvailabilityDays,
  type AvailabilityPattern,
  DEFAULT_AVAILABILITY_PATTERN,
} from '@/constants/availability';

const DAY_KEYS: { id: AvailabilityDays; labelKey: string }[] = [
  { id: 'any', labelKey: 'availabilityDayAny' },
  { id: 'weekdays', labelKey: 'availabilityDayWeekdays' },
  { id: 'weekends', labelKey: 'availabilityDayWeekends' },
];

type AvailabilityEditorProps = {
  value: AvailabilityPattern | null | undefined;
  onChange: (value: AvailabilityPattern | null) => void;
};

export const AvailabilityEditor = ({
  value,
  onChange,
}: AvailabilityEditorProps) => {
  const t = useTranslations('Profile');
  const fromId = useId();
  const toId = useId();

  const enabled = Boolean(value);
  const pattern = value ?? DEFAULT_AVAILABILITY_PATTERN;
  const patch = (next: Partial<AvailabilityPattern>) =>
    onChange({ ...pattern, ...next });

  return (
    <FormGroup>
      <div className="flex items-center justify-between">
        <Label>{t('freeTimeLabel')}</Label>
        <Toggle
          checked={enabled}
          onCheckedChange={(checked) =>
            onChange(checked ? { ...DEFAULT_AVAILABILITY_PATTERN } : null)
          }
          aria-label={t('freeTimeLabel')}
        />
      </div>

      {enabled && (
        <div className="mt-2.5 flex flex-col gap-2.5">
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
                      : 'border-line bg-background-darker text-soft hover:bg-background-main hover:text-foreground'
                  }`}
                >
                  {t(day.labelKey)}
                </button>
              );
            })}
          </div>

          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <label
                htmlFor={fromId}
                className="font-semibold text-[11px] text-subtle uppercase tracking-[0.05em]"
              >
                {t('availabilityFromLabel')}
              </label>
              <input
                id={fromId}
                type="time"
                value={pattern.anyTime ? '' : pattern.from}
                disabled={pattern.anyTime}
                onChange={(event) =>
                  patch({ from: event.target.value, anyTime: false })
                }
                className="w-full rounded-lg border border-line bg-background-darker px-3 py-[9px] text-foreground text-sm transition-colors focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-35"
              />
            </div>
            <span className="pb-[10px] text-[13px] text-subtle">
              {t('availabilityTimeSeparator')}
            </span>
            <div className="flex flex-1 flex-col gap-1">
              <label
                htmlFor={toId}
                className="font-semibold text-[11px] text-subtle uppercase tracking-[0.05em]"
              >
                {t('availabilityToLabel')}
              </label>
              <input
                id={toId}
                type="time"
                value={pattern.anyTime ? '' : pattern.to}
                disabled={pattern.anyTime}
                onChange={(event) =>
                  patch({ to: event.target.value, anyTime: false })
                }
                className="w-full rounded-lg border border-line bg-background-darker px-3 py-[9px] text-foreground text-sm transition-colors focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-35"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => patch({ anyTime: !pattern.anyTime })}
            aria-pressed={Boolean(pattern.anyTime)}
            className={`inline-flex w-fit items-center gap-[5px] text-[12px] transition-colors focus:outline-none focus-visible:text-soft ${
              pattern.anyTime
                ? 'text-primary-light'
                : 'text-subtle hover:text-soft'
            }`}
          >
            {pattern.anyTime ? (
              <MdCheckCircle size={14} />
            ) : (
              <MdRadioButtonUnchecked size={14} />
            )}
            {t('availabilityAnyTime')}
          </button>

          <p className="text-[12px] text-subtle">{t('availabilityHint')}</p>
        </div>
      )}
    </FormGroup>
  );
};
