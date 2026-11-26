import { createHash } from 'node:crypto';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export const banReference = (seed: string) => {
  const digest = createHash('sha256').update(seed).digest();
  const code = Array.from(digest.subarray(0, 8), (byte) => ALPHABET[byte % 32]);
  return `PC-${code.slice(0, 4).join('')}-${code.slice(4).join('')}`;
};
