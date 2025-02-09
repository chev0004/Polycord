import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          light: 'var(--color-primary-light)',
          lighter: 'var(--color-primary-lighter)',
          dark: 'var(--color-primary-dark)',
          darker: 'var(--color-primary-darker)',
        },
        background: {
          dark: 'var(--color-background-dark)',
          light: 'var(--color-background-light)',
          darker: 'var(--color-background-darker)',
          main: 'var(--color-background-main)',
          lighter: 'var(--color-background-lighter)',
          darkest: 'var(--color-background-darkest)',
        },
        discord: {
          blue: {
            DEFAULT: 'var(--color-discord-blue)',
            light: 'var(--color-discord-blue-light)',
            dark: 'var(--color-discord-blue-dark)',
          },
          yellow: {
            DEFAULT: 'var(--color-discord-yellow)',
            light: 'var(--color-discord-yellow-light)',
            dark: 'var(--color-discord-yellow-dark)',
          },
        },
      },
      fontFamily: {
        zen: ['var(--font-Zen)'],
        figtree: ['var(--font-Figtree)'],
        dm: ['var(--font-DM)'],
      },
      fontWeight: {
        light: 'var(--font-light)',
        regular: 'var(--font-regular)',
        medium: 'var(--font-medium)',
        semibold: 'var(--font-semibold)',
        bold: 'var(--font-bold)',
        black: 'var(--font-black)',
      },
    },
  },
  plugins: [],
} satisfies Config;
