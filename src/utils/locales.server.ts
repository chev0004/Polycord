import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const localesDir = resolve(process.cwd(), 'src/locales');

/**
 * Dynamically reads the locale codes from the src/locales directory.
 * This function should ONLY be called in a Node.js environment (like next.config.ts)
 * as it uses Node.js built-in modules ('node:fs' and 'node:path').
 * @returns {string[]} An array of locale codes (e.g., ['en', 'ja']).
 */
export const getLocalesFromDir = (): ReadonlyArray<string> => {
  try {
    const files = readdirSync(localesDir);
    return files
      .filter((file) => file.endsWith('.json'))
      .map((file) => file.replace('.json', ''))
      .sort() as ReadonlyArray<string>;
  } catch (error) {
    console.error('Failed to read locale directory:', error);
    console.warn('Falling back to English locale.');
    return ['en'] as const;
  }
};
