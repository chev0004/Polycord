import { DM_Sans, Figtree, Zen_Kaku_Gothic_New } from 'next/font/google';

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-Figtree',
  display: 'swap',
});
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-DM',
  display: 'swap',
  preload: false,
});
const zen = Zen_Kaku_Gothic_New({
  weight: '700',
  variable: '--font-Zen',
  display: 'swap',
  preload: false,
});

export const fontVariables = `${figtree.variable} ${dmSans.variable} ${zen.variable}`;
