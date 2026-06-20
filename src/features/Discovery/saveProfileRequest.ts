export const saveProfileRequest = async (
  profileId: string,
  nextSaved: boolean,
) => {
  const response = await fetch('/api/saved', {
    method: nextSaved ? 'POST' : 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId }),
  });

  if (!response.ok) {
    throw new Error('Saved profiles update failed');
  }
};
