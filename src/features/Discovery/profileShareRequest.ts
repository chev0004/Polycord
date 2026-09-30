export const recordProfileShare = (profileId: string) => {
  void fetch('/api/profile/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId }),
    keepalive: true,
  }).catch(() => {});
};
