import type { AvailabilityPattern } from '@/constants/availability';
import { BIO_MIN } from '@/lib/profileFields';

export type CompletenessFieldKey =
  | 'primaryLanguage'
  | 'targetLanguages'
  | 'bio'
  | 'availability'
  | 'tags'
  | 'country';

export type ProfileCompletenessInput = {
  primaryLanguage?: string;
  targetLanguages?: Array<{ language?: string; level?: string }>;
  bio?: string;
  availability?: AvailabilityPattern | null;
  tags?: string[];
  country?: string;
};

type CompletenessField = {
  key: CompletenessFieldKey;
  weight: number;
  isComplete: (input: ProfileCompletenessInput) => boolean;
};

export const COMPLETENESS_FIELDS: readonly CompletenessField[] = [
  {
    key: 'primaryLanguage',
    weight: 20,
    isComplete: (input) => Boolean(input.primaryLanguage?.trim()),
  },
  {
    key: 'targetLanguages',
    weight: 20,
    isComplete: (input) =>
      (input.targetLanguages ?? []).some(
        (row) => Boolean(row.language?.trim()) && Boolean(row.level?.trim()),
      ),
  },
  {
    key: 'bio',
    weight: 20,
    isComplete: (input) => (input.bio?.trim().length ?? 0) >= BIO_MIN,
  },
  {
    key: 'availability',
    weight: 15,
    isComplete: (input) => Boolean(input.availability),
  },
  {
    key: 'tags',
    weight: 15,
    isComplete: (input) => (input.tags ?? []).length > 0,
  },
  {
    key: 'country',
    weight: 10,
    isComplete: (input) => Boolean(input.country?.trim()),
  },
] as const;

export type ProfileCompleteness = {
  score: number;
  missing: CompletenessFieldKey[];
};

export const computeProfileCompleteness = (
  input: ProfileCompletenessInput,
): ProfileCompleteness => {
  let score = 0;
  const missing: CompletenessFieldKey[] = [];

  for (const field of COMPLETENESS_FIELDS) {
    if (field.isComplete(input)) {
      score += field.weight;
    } else {
      missing.push(field.key);
    }
  }

  return { score, missing };
};
