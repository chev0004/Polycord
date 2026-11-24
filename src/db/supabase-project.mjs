export function matchesSupabaseProject(value = '', project = '') {
  const url = URL.parse(value);
  if (!url) return false;
  const [role, ref, extra] = url.username.split('.');
  return Boolean(
    ['postgresql:', 'postgres:'].includes(url.protocol) &&
      url.pathname === '/postgres' &&
      [...url.searchParams.keys()].every((key) => key === 'sslmode') &&
      ((url.hostname === `db.${project}.supabase.co` && url.username) ||
        (url.hostname.endsWith('.pooler.supabase.com') &&
          /^[a-zA-Z0-9_-]+$/.test(role) &&
          ref === project &&
          extra === undefined)),
  );
}
