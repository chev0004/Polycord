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
  const [stored, setStored] = useState(false);
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
    const draft = schema.safeParse(
      Object.fromEntries(
        Object.entries(dirtyFields)
          .filter(([, dirty]) => dirty)
          .map(([field]) => [field, values[field]]),
      ),
    );
    if (!draft.success) return;
    const hasDraft = Object.keys(draft.data as object).length > 0;
    try {
      if (hasDraft) {
        sessionStorage.setItem(key, JSON.stringify(draft.data));
      } else {
        sessionStorage.removeItem(key);
      }
      setStored(hasDraft);
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
    setStored(false);
    if (!key) return;
    try {
      sessionStorage.removeItem(key);
    } catch {
      setUnavailable(true);
    }
  }, [key]);

  return { restored, stored, unavailable, clear, ready: !key || ready };
};
