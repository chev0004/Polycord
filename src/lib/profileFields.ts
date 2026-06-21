import { z } from 'zod';
import { isValidCountryCode } from '@/constants/countries';
import { isValidLanguageCode } from '@/constants/languages';

export const BIO_MIN = 10;
export const BIO_MAX = 500;
export const TAG_MIN = 2;
export const TAG_MAX = 20;

export const languageCodeField = (messages: {
  required?: string;
  invalid: string;
}) => {
  const base = messages.required
    ? z.string().min(1, { message: messages.required })
    : z.string();
  return base.refine(isValidLanguageCode, { message: messages.invalid });
};

export const optionalCountryField = (message: string) =>
  z
    .string()
    .refine((value) => !value || isValidCountryCode(value), { message })
    .optional();

export const bioField = (messages: {
  required?: string;
  tooShort: string;
  tooLong: string;
}) => {
  const base = messages.required
    ? z.string().trim().min(1, { message: messages.required })
    : z.string().trim();
  return base
    .min(BIO_MIN, { message: messages.tooShort })
    .max(BIO_MAX, { message: messages.tooLong });
};

export const tagItemField = (messages: { tooShort: string; tooLong: string }) =>
  z
    .string()
    .trim()
    .min(TAG_MIN, { message: messages.tooShort })
    .max(TAG_MAX, { message: messages.tooLong });

export const hasUniqueTags = (items: string[]): boolean =>
  new Set(items.map((item) => item.toLowerCase())).size === items.length;
