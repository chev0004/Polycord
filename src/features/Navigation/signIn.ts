export const signInHref = (locale: string) => {
  const next =
    new URLSearchParams(window.location.search).get('next') ??
    `${window.location.pathname}${window.location.search}`;

  return `/api/auth/discord?locale=${locale}&next=${encodeURIComponent(next)}`;
};
