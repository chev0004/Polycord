import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useRef } from 'react';
import { ToastStack } from '@/components/Toast';
import { clearCases } from '@/features/Admin/caseCache';
import { MobileTakeAction } from '@/features/Admin/MobileTakeAction';
import { ModerationPage } from '@/features/Admin/ModerationPage';
import { moderationSnapshot } from '@/features/Admin/moderationFixtures';
import {
  LOG_ACTIONS,
  MODERATION_ACTIONS,
  type ModLogEntry,
  type ModSnapshot,
  type ModUser,
} from '@/features/Admin/types';
import { useModerationNotify } from '@/features/Admin/useModerationToasts';
import { useToastStack } from '@/hooks/useToast';
import { mockFetch } from './mockFetch';

const hour = (hours: number) =>
  new Date(Date.now() - hours * 3600000).toISOString();
const later = hour(-720);

const extras: Record<string, Partial<ModUser>> = {
  liam: { bannedAt: hour(30), hidden: true },
  haruka: { premium: { configured: true, grantedUntil: later } },
  mina: {
    profile: {
      bio: 'Mina Park is here to practise languages.',
      isPublic: false,
      primaryLanguage: 'ko',
      targetLanguages: [{ language: 'en', level: 'beginner' }],
    },
  },
};

const users = moderationSnapshot.users.map((user) => ({
  ...user,
  ...extras[user.id],
}));

const entry = (
  index: number,
  action: ModLogEntry['action'],
  extra: Partial<ModLogEntry> = {},
): ModLogEntry => ({
  id: `entry-${index}`,
  action,
  userId: users[2 + (index % 5)].id,
  staffId: 'kenji',
  createdAt: hour(index),
  ...extra,
});

const records: ModSnapshot = {
  ...moderationSnapshot,
  users,
  reports: [
    ...moderationSnapshot.reports,
    {
      id: 'r6',
      userId: 'ryan',
      reporterId: 'mina',
      reason: 'other',
      status: 'reviewed',
      createdAt: hour(4),
    },
    {
      id: 'r5',
      userId: 'mina',
      reporterId: 'liam',
      reason: 'other',
      status: 'dismissed',
      createdAt: hour(3),
    },
  ],
  log: [
    ...LOG_ACTIONS.map((action, index) => entry(index + 1, action)),
    entry(20, 'suspend', { days: 7 }),
    entry(21, 'premium_grant', { grant: { amount: 3, unit: 'months' } }),
    entry(22, 'premium_grant', { expiresAt: later }),
    entry(23, 'premium_revoke', { expiresAt: later }),
  ],
};

const empty: ModSnapshot = {
  ...moderationSnapshot,
  pendingCases: 0,
  reports: [],
  log: [],
};

const moderationApi =
  (source: ModSnapshot, status = 200) =>
  () => {
    clearCases();
    return mockFetch((url) => {
      const wanted = url.searchParams;
      const data = { users: source.users, reports: [], log: [] };
      const log = source.log.filter(
        (item) => !wanted.get('action') || item.action === wanted.get('action'),
      );
      switch (url.pathname.replace('/api/admin/', '')) {
        case 'reports': {
          const page = source.reports.filter(
            (report) =>
              (wanted.get('status') === 'pending') ===
                (report.status === 'pending') &&
              (!wanted.get('reason') || report.reason === wanted.get('reason')),
          );
          return { ...data, reports: page, page };
        }
        case 'actioned':
          return {
            ...data,
            actioned: log.map((item) => ({ ...item, count: 1 })),
          };
        case 'activity-log':
          return { ...data, log };
        case 'activity-days':
          return { days: { [new Date().toLocaleDateString('en-CA')]: 7 } };
        case 'suspicious-activity': {
          const events = ['report', 'auth-failure'].map((action, index) => ({
            id: action,
            action,
            userId: source.users[index + 2]?.id,
            ip: '203.0.113.7',
            createdAt: hour(index),
            count: 3,
          }));
          const activity = source.log.length ? events : [];
          return { ...data, activity, events: activity, hasMore: false };
        }
        case 'users': {
          const found = source.users.filter((user) =>
            user.username.includes(wanted.get('q') ?? ''),
          );
          return {
            ...data,
            results: found.map(({ id }) => id),
            hasMore: false,
          };
        }
        case 'ip-bans':
          return {
            bans: [],
            observed: [{ ip: '203.0.113.7', lastSeenAt: hour(5) }],
          };
        case 'moderation':
          return new Response('{}', { status });
      }
    });
  };

const meta = {
  title: 'Review/Admin',
  component: ModerationPage,
  parameters: { layout: 'fullscreen' },
  args: { initial: records },
  beforeEach: moderationApi(records),
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-background-main">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ModerationPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Records: Story = {};

export const Empty: Story = {
  args: { initial: empty },
  beforeEach: moderationApi(empty),
};

export const Loading: Story = {
  beforeEach: () => mockFetch(() => new Promise<never>(() => {})),
};

export const SignInAgain: Story = {
  args: { initial: moderationSnapshot },
  beforeEach: moderationApi(moderationSnapshot, 401),
};

function Toasts() {
  const { toasts, addToast, dismissToast } = useToastStack();
  const notify = useModerationNotify((toast) =>
    addToast({ ...toast, duration: 1e9 }),
  );
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const target = users[2];
    for (const action of MODERATION_ACTIONS)
      notify(target, action, { days: 7, reports: 2, resolved: false });
    notify(target, 'dismiss', { reports: 2, resolved: true });
    notify(target, 'warn', { reports: 2, resolved: true });
  }, [notify]);
  return <ToastStack toasts={toasts} onDismiss={dismissToast} />;
}

export const ActionToasts: Story = { render: () => <Toasts /> };

const caseFor = (subject: ModUser) => ({
  beforeEach: () => {
    clearCases();
    return mockFetch(() => ({
      userId: subject.id,
      users,
      reports: records.reports.filter(({ userId }) => userId === subject.id),
      log: [],
    }));
  },
  render: () => (
    <MobileTakeAction
      profileId={`profile-${subject.id}`}
      displayName={subject.displayName}
      meId="kenji"
      meRole="owner"
      addToast={() => {}}
      onClose={() => {}}
    />
  ),
});

const [ryan, dmitri, haruka, liam] = ['ryan', 'dmitri', 'haruka', 'liam'].map(
  (id) => users.find((user) => user.id === id) as ModUser,
);

export const SheetMember: Story = caseFor(ryan);
export const SheetSuspended: Story = caseFor(dmitri);
export const SheetSupporter: Story = caseFor(haruka);
export const SheetBanned: Story = caseFor(liam);
