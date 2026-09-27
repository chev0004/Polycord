import type { CurrentUser } from './auth';

export const isAdminDiscordId = (discordId: string) =>
  (process.env.POLYCORD_ADMIN_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(discordId);

export const isAdmin = (user: CurrentUser) => isAdminDiscordId(user.id);

export const isSameOrigin = (request: Request) => {
  const origin = request.headers.get('origin');
  return (
    origin !== null &&
    URL.canParse(origin) &&
    new URL(origin).host === request.headers.get('host')
  );
};
