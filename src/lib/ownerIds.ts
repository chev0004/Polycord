export const ownerDiscordIds = () =>
  (process.env.POLYCORD_ADMIN_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

export const isOwnerDiscordId = (discordId: string) =>
  ownerDiscordIds().includes(discordId);
