import { isIP } from 'node:net';

const TRUSTED_IP_HEADER = 'x-nf-client-connection-ip';

export const normalizeIp = (value: string | null | undefined) => {
  const raw = value
    ?.trim()
    .replace(/^\[|\]$/g, '')
    .split('%')[0];
  if (!raw || !isIP(raw)) return null;
  if (isIP(raw) === 4) return raw;
  const address = new URL(`http://[${raw}]`).hostname.slice(1, -1);
  const mapped = address.match(
    /^::ffff:(?:(\d+\.\d+\.\d+\.\d+)|([0-9a-f]{1,4}):([0-9a-f]{1,4}))$/,
  );
  if (!mapped) return address;
  if (mapped[1]) return mapped[1];
  const high = Number.parseInt(mapped[2], 16);
  const low = Number.parseInt(mapped[3], 16);
  return [high >> 8, high & 255, low >> 8, low & 255].join('.');
};

export const clientIp = (headers: Headers) =>
  normalizeIp(
    headers.get(process.env.POLYCORD_CLIENT_IP_HEADER ?? TRUSTED_IP_HEADER),
  );
