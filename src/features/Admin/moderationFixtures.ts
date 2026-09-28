import type { ModSnapshot, ModUser } from './types';

const ago = (minutes: number) =>
  new Date(Date.now() - minutes * 60000).toISOString();

const user = (
  id: string,
  displayName: string,
  username: string,
  extra: Partial<ModUser> = {},
): ModUser => ({
  id,
  displayName,
  username,
  discordId: `10${id.padStart(16, '0')}`,
  joinedAt: ago(200 * 1440),
  hidden: false,
  warnings: 0,
  premium: { configured: false },
  profile: {
    bio: `${displayName} is here to practise languages.`,
    isPublic: true,
    primaryLanguage: 'en',
    targetLanguages: [{ language: 'ja', level: 'beginner' }],
  },
  ...extra,
});

export const moderationSnapshot: ModSnapshot = {
  meId: 'kenji',
  meRole: 'owner',
  staff: ['kenji', 'tomas'],
  users: [
    user('kenji', 'Kenji Ito', 'kenji.ito', { role: 'owner' }),
    user('tomas', 'Tomás Ruiz', 'tomas.r', { role: 'moderator' }),
    user('ryan', 'Ryan Mercer', 'ryanmercer.fx'),
    user('dmitri', 'Dmitri Volkov', 'dvolkov', {
      hidden: true,
      suspendedUntil: ago(-4 * 1440),
      warnings: 1,
    }),
    user('haruka', 'Haruka Sato', 'haruka'),
    user('liam', 'Liam Walker', 'liamw'),
    user('mina', 'Mina Park', 'minapark'),
  ],
  reports: [
    {
      id: 'r1',
      userId: 'ryan',
      reporterId: 'haruka',
      reason: 'spam',
      status: 'pending',
      createdAt: ago(38),
      details: 'He messaged me three times about a crypto trading group.',
    },
    {
      id: 'r2',
      userId: 'ryan',
      reporterId: 'liam',
      reason: 'spam',
      status: 'pending',
      createdAt: ago(19 * 60),
    },
    {
      id: 'r3',
      userId: 'tomas',
      reporterId: 'ryan',
      reason: 'harassment',
      status: 'pending',
      createdAt: ago(62),
      details: 'This mod keeps deleting my posts.',
    },
    {
      id: 'r4',
      userId: 'dmitri',
      reporterId: 'mina',
      reason: 'harassment',
      status: 'reviewed',
      createdAt: ago(9 * 1440),
      details: 'Kept messaging me after I said no.',
    },
  ],
  log: [
    {
      id: 'l1',
      action: 'suspend',
      userId: 'dmitri',
      staffId: 'kenji',
      days: 7,
      note: 'Continued DMs to reporter after the warning.',
      createdAt: ago(2 * 1440),
    },
    {
      id: 'l2',
      action: 'warn',
      userId: 'dmitri',
      staffId: 'tomas',
      createdAt: ago(9 * 1440),
    },
  ],
  suspicious: [
    {
      id: 's1',
      action: 'copy',
      userId: 'ryan',
      ip: '185.220.101.42',
      createdAt: ago(26 * 60),
    },
  ],
};

export const emptyModerationSnapshot: ModSnapshot = {
  ...moderationSnapshot,
  reports: moderationSnapshot.reports.filter(
    (report) => report.status !== 'pending',
  ),
};

export const moderatorSnapshot: ModSnapshot = {
  ...moderationSnapshot,
  meId: 'tomas',
  meRole: 'moderator',
};
