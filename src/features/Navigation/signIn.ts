export const signInHref = (locale: string) => {
  const params = new URLSearchParams(window.location.search);
  params.delete('authError');
  const query = params.toString();
  const next =
    params.get('next') ??
    `${window.location.pathname}${query ? `?${query}` : ''}`;

  return `/api/auth/discord?locale=${locale}&next=${encodeURIComponent(next)}`;
};
