import { isIP } from 'node:net';

const TRUSTED_IP_HEADER = 'x-nf-client-connection-ip';
const FORWARDED_FOR_HEADER = 'x-forwarded-for';

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

const netlifyContextIp = () =>
  (globalThis as { Netlify?: { context?: { ip?: string } | null } }).Netlify
    ?.context?.ip;

export const clientIp = (headers: Headers) => {
  const configured = process.env.POLYCORD_CLIENT_IP_HEADER;

  return normalizeIp(
    configured
      ? headers.get(configured)
      : (netlifyContextIp() ??
          headers.get(TRUSTED_IP_HEADER) ??
          headers.get(FORWARDED_FOR_HEADER)?.split(',').at(-1)),
  );
};
