export const recordProfileView = (profileId: string) => {
  void fetch('/api/profile/view', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId }),
    keepalive: true,
  }).catch(() => {});
};
