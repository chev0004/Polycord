'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import {
  type Control,
  Controller,
  useFieldArray,
  useFormState,
  useWatch,
} from 'react-hook-form';
import { MdAdd, MdClose } from 'react-icons/md';
import {
  Combobox,
  FieldError,
  FormGroup,
  Label,
  Select,
} from '@/components/Form';
import { languageOptions, Proficiency, proficiencyOptions } from '@/constants';
import type { ProfileFormValues } from './schema';

export const FREE_LANGUAGE_CAP = 2;
export const PREMIUM_LANGUAGE_CAP = 10;

export const createEmptyLanguageRow = () => ({
  language: '',
  level: Proficiency.BEGINNER as string,
});

type TargetLanguagesEditorProps = {
  control: Control<ProfileFormValues>;
  premium?: boolean;
};

type RowError = {
  language?: { message?: string };
  level?: { message?: string };
};

export const TargetLanguagesEditor = ({
  control,
  premium = false,
}: TargetLanguagesEditorProps) => {
  const t = useTranslations('Profile');
  const locale = useLocale();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'targetLanguages',
  });
  const primaryLanguage = useWatch({ control, name: 'primaryLanguage' });
  const rows = useWatch({ control, name: 'targetLanguages' }) ?? [];
  const { errors } = useFormState({ control, name: 'targetLanguages' });

  const cap = premium ? PREMIUM_LANGUAGE_CAP : FREE_LANGUAGE_CAP;

  const allLanguageOptions = useMemo(() => languageOptions(locale), [locale]);
  const levelOptions = useMemo(
    () =>
      proficiencyOptions(locale).filter(
        (option) => option.value !== Proficiency.NATIVE_LEVEL,
      ),
    [locale],
  );

  const usedLanguages = useMemo(() => {
    const used = new Set<string>();
    if (primaryLanguage) {
      used.add(primaryLanguage);
    }
    for (const row of rows) {
      if (row?.language) {
        used.add(row.language);
      }
    }
    return used;
  }, [primaryLanguage, rows]);

  const error = errors.targetLanguages;
  let errorMessage: string | undefined;
  if (Array.isArray(error)) {
    for (const rowError of error as (RowError | undefined)[]) {
      const message = rowError?.language?.message ?? rowError?.level?.message;
      if (message) {
        errorMessage = message;
        break;
      }
    }
  } else if (error) {
    const rootError = error as {
      message?: string;
      root?: { message?: string };
    };
    errorMessage = rootError.message ?? rootError.root?.message;
  }

  return (
    <FormGroup>
      <Label required>{t('targetLanguagesLabel')}</Label>
      <div className="flex flex-col gap-2.5">
        {fields.map((rowField, index) => {
          const currentLanguage = rows[index]?.language ?? '';
          const options = allLanguageOptions.filter(
            (option) =>
              option.value === currentLanguage ||
              !usedLanguages.has(option.value),
          );

          return (
            <div
              key={rowField.id}
              className="grid grid-cols-[minmax(0,1fr)_170px_40px] items-center gap-2"
            >
              <Controller
                control={control}
                name={`targetLanguages.${index}.language`}
                render={({ field }) => (
                  <Combobox
                    {...field}
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    options={options}
                    placeholder={t('languageSelectPlaceholder')}
                    error={Boolean(errorMessage) && !currentLanguage}
                  />
                )}
              />
              <Controller
                control={control}
                name={`targetLanguages.${index}.level`}
                render={({ field }) => (
                  <Select
                    {...field}
                    value={field.value}
                    onValueChange={field.onChange}
                    options={levelOptions}
                    placeholder={t('levelPlaceholder')}
                    ariaLabel={t('levelSelectLabel')}
                  />
                )}
              />
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={fields.length <= 1}
                aria-label={t('removeLanguage')}
                className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-background-darker hover:text-red-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-35"
              >
                <MdClose size={18} />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => append(createEmptyLanguageRow())}
        disabled={fields.length >= cap}
        className="inline-flex items-center gap-2 self-start rounded-full border border-white/[0.14] border-dashed px-4 py-2.5 text-[14px] text-gray-400 transition-colors hover:border-primary-dark hover:bg-primary-darker hover:text-primary-light focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
      >
        <MdAdd size={18} />
        {t('addLanguage')}
      </button>

      <p className="text-[12px] text-gray-500">
        {t('languageCounterHint', { count: fields.length, cap })}
      </p>

      {errorMessage ? <FieldError>{t(errorMessage)}</FieldError> : null}

      {!premium && fields.length >= FREE_LANGUAGE_CAP ? (
        <p className="text-[13px] text-gray-400 leading-relaxed">
          {t.rich('languageCapUpsell', {
            freeCap: FREE_LANGUAGE_CAP,
            premiumCap: PREMIUM_LANGUAGE_CAP,
            premiumLink: (chunks) => (
              <Link
                href={`/${locale}/settings#premium`}
                className="font-semibold text-primary-light focus:outline-none"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      ) : null}
    </FormGroup>
  );
};
