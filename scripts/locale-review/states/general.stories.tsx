import type { Meta, StoryObj } from '@storybook/react';
import { useTranslations } from 'next-intl';
import type { ComponentProps } from 'react';
import { DraftNotice } from '@/components/Form/DraftNotice';
import { AnalyticsDashboard } from '@/features/Analytics/AnalyticsDashboard';
import analytics from '@/features/Analytics/AnalyticsDashboard.stories';
import { DiscoveryLoadPanelView } from '@/features/Discovery/DiscoveryLoadPanel';
import { NotificationEntry } from '@/features/Inbox/NotificationEntry';
import { WarningNotice } from '@/features/Inbox/WarningNotice';
import { LegalDocument } from '@/features/Legal/LegalDocument';
import { LanguageSwitcher } from '@/features/Navbar/LanguageSwitcher';
import { UserMenu } from '@/features/Navbar/UserMenu';
import { RouteProgressProvider } from '@/features/Navigation/RouteProgress';
import { mockFetch } from './mockFetch';
import { Toasts } from './Toasts';

const meta = {
  title: 'Review/General',
  parameters: { layout: 'fullscreen', nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <RouteProgressProvider>
        <Story />
      </RouteProgressProvider>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => {};

export const ViewAlerts: Story = {
  render: () => (
    <div className="max-w-sm bg-background-dark p-4">
      {[true, false].map((isGuest) => (
        <NotificationEntry
          key={String(isGuest)}
          premium
          notification={{
            id: String(isGuest),
            kind: 'view',
            isGuest,
            timestamp: '',
            read: false,
          }}
          onMarkAsRead={noop}
          onDelete={noop}
        />
      ))}
    </div>
  ),
};

function InboxToasts() {
  const t = useTranslations('Inbox');
  return (
    <Toasts
      messages={[
        [t('newNotification'), ''],
        [t('loadError'), ''],
        [t('writeError'), ''],
      ]}
    />
  );
}

export const InboxMessages: Story = { render: () => <InboxToasts /> };

export const Drafts: Story = {
  render: () => (
    <div className="max-w-xl p-6">
      <DraftNotice restored={false} stored unavailable={false} sessionExpired />
      <DraftNotice restored stored unavailable={false} />
      <DraftNotice restored={false} stored={false} unavailable />
    </div>
  ),
};

function OutsidePage() {
  const draft = useTranslations('Draft');
  const metadata = useTranslations('Metadata');
  return (
    <dl className="max-w-xl space-y-4 p-6 text-foreground">
      <dt className="text-subtle">Browser confirmation before leaving</dt>
      <dd>{draft('leaveWarning')}</dd>
      <dt className="text-subtle">Page description in search results</dt>
      <dd>{metadata('description')}</dd>
    </dl>
  );
}

export const OutsideThePage: Story = { render: () => <OutsidePage /> };

export const LegalFallback: Story = {
  render: () => (
    <LegalDocument
      locale="ja"
      documentId="terms"
      isFallback
      content={{ lastUpdated: '2026-10-01', intro: '', sections: [] }}
    />
  ),
};

export const LanguageSaveFailed: Story = {
  beforeEach: () => mockFetch(() => new Response('{}', { status: 500 })),
  render: () => (
    <div className="p-6">
      <LanguageSwitcher />
    </div>
  ),
};

export const MenuCooldown: Story = {
  render: () => (
    <div className="flex justify-end p-10">
      <UserMenu
        bumpReadyAt={new Date(Date.now() + 3600000).toISOString()}
        onProfileClick={noop}
        onBumpProfileClick={noop}
        onSettingsClick={noop}
        onLogoutClick={noop}
      />
    </div>
  ),
};

export const RareEvents: Story = {
  render: () => (
    <AnalyticsDashboard
      {...(analytics.args as ComponentProps<typeof AnalyticsDashboard>)}
      eventCounts={[
        { name: 'connection.intro_request', total: 12 },
        { name: 'safety.report', total: 4 },
        { name: 'premium.upgrade', total: 2 },
      ]}
    />
  ),
};

const trace = (extra: object): Story => ({
  render: () => (
    <DiscoveryLoadPanelView
      now={45000}
      trace={
        {
          transport: 'https',
          navigation: { redirect: 0, connection: 0, firstByte: 0, download: 0 },
          finished: 29000,
          phases: {
            controls: { status: 'pending' },
            viewer: { status: 'pending' },
            discovery: { status: 'pending' },
            grid: { status: 'pending' },
            document: {
              status: 'done',
              start: 0,
              end: 11000,
              spans: {
                'ban-connect': 20,
                'ban-query': 30,
                'ban-close': 10,
                'layout-settings': 40,
                'layout-theme': 50,
                'layout-staff': 60,
                'staff-count': 70,
              },
            },
          },
          ...extra,
        } as ComponentProps<typeof DiscoveryLoadPanelView>['trace']
      }
    />
  ),
});

const warning = (
  category: ComponentProps<typeof WarningNotice>['category'],
): Story => ({
  render: () => (
    <WarningNotice
      open
      category={category}
      acknowledged={false}
      onAcknowledge={noop}
      onClose={noop}
    />
  ),
});

export const SpamWarning = warning('spam');
export const HateWarning = warning('hate');
export const InappropriateWarning = warning('inappropriate');
export const ImpersonationWarning = warning('impersonation');
export const PrivacyWarning = warning('privacy');

export const RefreshTrace: Story = trace({
  trigger: 'refresh',
  history: [
    {
      transport: 'https',
      route: '/en/saved',
      finished: 800,
      phases: { document: { status: 'cancelled', start: 0, end: 800 } },
    },
  ],
});

export const CopyFailedTrace: Story = {
  ...trace({}),
  beforeEach: () => {
    const { writeText } = navigator.clipboard;
    navigator.clipboard.writeText = () => Promise.reject(new Error('denied'));
    return () => {
      navigator.clipboard.writeText = writeText;
    };
  },
};
