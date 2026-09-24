import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        foreground: 'var(--color-foreground)',
        soft: 'var(--color-soft)',
        muted: 'var(--color-muted)',
        subtle: 'var(--color-subtle)',
        'on-primary': 'var(--color-on-primary)',
        line: 'var(--color-line)',
        'line-strong': 'var(--color-line-strong)',
        overlay: 'var(--color-overlay)',
        danger: 'var(--color-danger)',
        'danger-surface': 'var(--color-danger-surface)',
        success: 'var(--color-success)',
        gray: { 500: '#929aa7' },
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
      keyframes: {
        slideIn: {
          from: {
            opacity: '0',
            transform: 'translateX(calc(100% + 1.5rem))',
          },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        hide: {
          from: { opacity: '1', transform: 'translateX(0)' },
          to: {
            opacity: '0',
            transform: 'translateX(calc(100% + 1.5rem))',
          },
        },
        shrink: {
          from: { width: '100%' },
          to: { width: '0%' },
        },
        voiceBar: {
          from: { transform: 'scaleY(0.5)' },
          to: { transform: 'scaleY(1.15)' },
        },
      },
      animation: {
        slideIn: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        hide: 'hide 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        shrink: 'shrink var(--toast-duration, 5000ms) linear forwards',
        voiceBar:
          'voiceBar 0.9s cubic-bezier(0.16, 1, 0.3, 1) infinite alternate',
      },
    },
  },
  plugins: [],
} satisfies Config;
