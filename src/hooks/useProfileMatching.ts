import { useMemo } from 'react';
import type { DiscoveryProfile } from '@/features/Discovery/ProfileCard';

export type MatchCriteria = {
  myNative: string;
  myTarget: string;
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
      const partnerSpeaksMyTarget =
        profile.primaryLanguage === criteria.myTarget;

      const partnerLearningMyNative = profile.targetLanguages.some(
        (t) => t.language === criteria.myNative,
      );

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

  if (profile.primaryLanguage === criteria.myTarget) {
    score += 50;
  }

  if (profile.targetLanguages.some((t) => t.language === criteria.myNative)) {
    score += 30;
  }

  return score;
};
