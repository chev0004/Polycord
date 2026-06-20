export type ShareProfileResult = 'shared' | 'copied' | 'cancelled' | 'error';

export const buildPublicProfileUrl = (locale: string, profileId: string) =>
  `${window.location.origin}/${locale}/u/${profileId}`;

export const shareProfileUrl = async (
  url: string,
  shareData?: { title?: string; text?: string },
): Promise<ShareProfileResult> => {
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function'
  ) {
    try {
      await navigator.share({ ...shareData, url });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'error';
  }
};
