export const lookingForModes = [
  'casual_chat',
  'study_buddy',
  'voice_practice',
  'grammar_help',
  'gaming',
  'exam_prep',
  'culture_exchange',
] as const;

export type LookingForMode = (typeof lookingForModes)[number];

type LookingForModeDefinition = {
  value: LookingForMode;
  name_en: string;
  name_ja: string;
};

const lookingForModeDefinitions: LookingForModeDefinition[] = [
  { value: 'casual_chat', name_en: 'Casual chat', name_ja: '雑談' },
  { value: 'study_buddy', name_en: 'Study buddy', name_ja: '勉強仲間' },
  { value: 'voice_practice', name_en: 'Voice practice', name_ja: '通話練習' },
  { value: 'grammar_help', name_en: 'Grammar help', name_ja: '文法サポート' },
  { value: 'gaming', name_en: 'Gaming', name_ja: 'ゲーム' },
  { value: 'exam_prep', name_en: 'Exam prep', name_ja: '試験対策' },
  {
    value: 'culture_exchange',
    name_en: 'Culture exchange',
    name_ja: '文化交流',
  },
];

type LookingForOption = { label: string; value: string };

const getLocalizedName = (
  definition: LookingForModeDefinition,
  locale: string,
): string => {
  const nameKey = `name_${locale}` as 'name_en' | 'name_ja';
  return definition[nameKey] ?? definition.name_en;
};

export const lookingForOptions = (locale: string): LookingForOption[] =>
  lookingForModeDefinitions.map((definition) => ({
    label: getLocalizedName(definition, locale),
    value: definition.value,
  }));

export const getLookingForModeName = (mode: string, locale: string): string => {
  const definition = lookingForModeDefinitions.find(
    (item) => item.value === mode,
  );
  return definition ? getLocalizedName(definition, locale) : mode;
};

export const isValidLookingForMode = (value: string): value is LookingForMode =>
  (lookingForModes as readonly string[]).includes(value);
