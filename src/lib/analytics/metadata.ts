const ALLOWED_METADATA_KEYS = new Set([
  'source',
  'result',
  'isNewUser',
  'premium',
  'isPublic',
  'primaryLanguage',
  'targetLanguage',
  'targetLanguageCount',
  'proficiencyLevel',
  'tagCount',
  'availability',
  'country',
]);

export type AnalyticsMetadata = Record<string, unknown>;

export type SanitizedMetadata = Record<string, string | number | boolean>;

export const sanitizeMetadata = (
  metadata?: AnalyticsMetadata | null,
): SanitizedMetadata | null => {
  if (!metadata) {
    return null;
  }

  const clean: SanitizedMetadata = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (!ALLOWED_METADATA_KEYS.has(key)) {
      continue;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      clean[key] = value;
    } else if (typeof value === 'boolean') {
      clean[key] = value;
    } else if (typeof value === 'string' && value.length > 0) {
      clean[key] = value.slice(0, 64);
    }
  }

  return Object.keys(clean).length > 0 ? clean : null;
};
