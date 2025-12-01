import { useMemo } from 'react';
import type { DiscoveryProfile } from '@/features/Discovery/ProfileCard';

export type MatchCriteria = {
  myNative: string; // The language I speak (e.g., 'en')
  myTarget: string; // The language I want to learn (e.g., 'ja')
};

/**
 * Filters a list of profiles to find matches where:
 * 1. The profile's primary language matches the user's target language.
 * 2. The profile is learning the user's native language.
 *
 * @param profiles - The full list of profiles to filter
 * @param criteria - The matching criteria (myNative and myTarget)
 * @returns A filtered array of profiles that match the criteria
 */
export const useProfileMatching = (
  profiles: DiscoveryProfile[],
  criteria: MatchCriteria | null,
) => {
  return useMemo(() => {
    if (!criteria || !criteria.myNative || !criteria.myTarget) {
      return profiles;
    }

    return profiles.filter((profile) => {
      // 1. Does the partner speak my target language natively?
      const partnerSpeaksMyTarget =
        profile.primaryLanguage === criteria.myTarget;

      // 2. Is the partner learning my native language?
      const partnerLearningMyNative = profile.targetLanguages.some(
        (t) => t.language === criteria.myNative,
      );

      // Strict Match: Perfect exchange partner
      return partnerSpeaksMyTarget && partnerLearningMyNative;
    });
  }, [profiles, criteria]);
};

/**
 * Helper to calculate a "Match Score" for sorting profiles.
 * Higher scores indicate a better match for language exchange.
 *
 * @param profile - The profile to evaluate
 * @param criteria - The matching criteria
 * @returns A number representing the match score
 */
export const calculateMatchScore = (
  profile: DiscoveryProfile,
  criteria: MatchCriteria,
) => {
  let score = 0;

  // Huge points for perfect language swap (Primary == Target)
  if (profile.primaryLanguage === criteria.myTarget) {
    score += 50;
  }

  // Points if they are learning your language
  if (profile.targetLanguages.some((t) => t.language === criteria.myNative)) {
    score += 30;
  }

  // Small points if they are in a "Native Level" proficiency for your target language
  // (Assuming you pass proficiency data later, this is a placeholder for logic expansion)
  // if (profile.primaryLanguageLevel === 'native-level') score += 10;

  return score;
};
