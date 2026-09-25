export const buildPublicProfileUrl = (locale: string, profileId: string) =>
  `${window.location.origin}/${locale}/u/${profileId}`;

export const copyProfileUrl = (url: string) =>
  navigator.clipboard.writeText(url).then(
    () => true,
    () => false,
  );
