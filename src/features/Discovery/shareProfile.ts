export const buildPublicProfileUrl = (locale: string, profileId: string) =>
  `${window.location.origin}/${locale}/u/${profileId}`;
