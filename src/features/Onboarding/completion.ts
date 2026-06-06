export type OnboardingDraft = {
  availability?: string;
  bio?: string;
  country?: string;
  primaryLanguage?: string;
  proficiencyLevel?: string;
  tags?: string[];
  targetLanguage?: string;
  timezone?: string;
};

export const ONBOARDING_DRAFT_STORAGE_KEY = 'polycord_onboarding_draft';

export const requiredOnboardingFields: Array<keyof OnboardingDraft> = [
  'primaryLanguage',
  'targetLanguage',
  'proficiencyLevel',
  'timezone',
  'availability',
  'bio',
];

export const getMissingRequiredFields = (draft: OnboardingDraft) =>
  requiredOnboardingFields.filter((field) => {
    const value = draft[field];
    return Array.isArray(value) ? value.length === 0 : !value;
  });

export const getOnboardingCompletion = (draft: OnboardingDraft) => {
  const missingCount = getMissingRequiredFields(draft).length;
  const completedRequired = requiredOnboardingFields.length - missingCount;
  const optionalBoost = [draft.country, ...(draft.tags ?? [])].filter(
    Boolean,
  ).length;

  return Math.min(
    100,
    Math.round(
      ((completedRequired + Math.min(optionalBoost, 2)) /
        (requiredOnboardingFields.length + 2)) *
        100,
    ),
  );
};
