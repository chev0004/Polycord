'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import {
  type DefaultValues,
  type FieldValues,
  type UseFormReturn,
  useWatch,
} from 'react-hook-form';
import type { z } from 'zod';

export const useFormDraft = <T extends FieldValues>(
  key: string | undefined,
  form: UseFormReturn<T>,
  schema: z.ZodType,
) => {
  const t = useTranslations('Draft');
  const { control, reset, getValues } = form;
  const { dirtyFields } = form.formState;
  const values = useWatch({ control });
  const [ready, setReady] = useState(false);
  const [restored, setRestored] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!key) return;
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const draft = schema.safeParse(JSON.parse(raw));
        if (draft.success) {
          reset(
            { ...getValues(), ...(draft.data as DefaultValues<T>) },
            { keepDefaultValues: true },
          );
          setRestored(true);
        } else {
          sessionStorage.removeItem(key);
        }
      }
    } catch {
      setUnavailable(true);
    }
    setReady(true);
  }, [key, schema, getValues, reset]);

  useEffect(() => {
    if (!key || !ready) return;
    const draft = schema.parse(
      Object.fromEntries(
        Object.entries(dirtyFields)
          .filter(([, dirty]) => dirty)
          .map(([field]) => [field, values[field]]),
      ),
    ) as Partial<T>;
    try {
      if (Object.keys(draft).length) {
        sessionStorage.setItem(key, JSON.stringify(draft));
      } else {
        sessionStorage.removeItem(key);
      }
      setUnavailable(false);
    } catch {
      setUnavailable(true);
    }
  }, [key, ready, schema, values, dirtyFields]);

  useEffect(() => {
    if (!unavailable || !form.formState.isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const confirmNavigation = (event: Event) => {
      if (!window.confirm(t('leaveWarning'))) event.preventDefault();
    };
    const confirmLink = (event: MouseEvent) => {
      const link = (event.target as Element).closest('a[href]');
      if (
        link &&
        !event.ctrlKey &&
        !event.metaKey &&
        link.getAttribute('target') !== '_blank'
      ) {
        if (!window.confirm(t('leaveWarning'))) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
    };
    window.addEventListener('beforeunload', warn);
    window.addEventListener('polycord:navigate', confirmNavigation);
    document.addEventListener('click', confirmLink, true);
    return () => {
      window.removeEventListener('beforeunload', warn);
      window.removeEventListener('polycord:navigate', confirmNavigation);
      document.removeEventListener('click', confirmLink, true);
    };
  }, [unavailable, form.formState.isDirty, t]);

  const clear = useCallback(() => {
    setRestored(false);
    if (!key) return;
    try {
      sessionStorage.removeItem(key);
    } catch {
      setUnavailable(true);
    }
  }, [key]);

  return { restored, unavailable, clear, ready: !key || ready };
};
