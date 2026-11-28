import type { Meta, StoryObj } from '@storybook/react';
import { useTranslations } from 'next-intl';
import type { ComponentProps } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { DraftNotice } from '@/components/Form/DraftNotice';
import { AnalyticsDashboard } from '@/features/Analytics/AnalyticsDashboard';
import analytics from '@/features/Analytics/AnalyticsDashboard.stories';
import { DiscoveryLoadPanelView } from '@/features/Discovery/DiscoveryLoadPanel';
import { stubPlayback } from '@/features/Discovery/voicePlaybackStub';
import { Inbox } from '@/features/Inbox/Inbox';
import { NotificationEntry } from '@/features/Inbox/NotificationEntry';
import { WarningNotice } from '@/features/Inbox/WarningNotice';
import { LegalDocument } from '@/features/Legal/LegalDocument';
import { LanguageSwitcher } from '@/features/Navbar/LanguageSwitcher';
import { UserMenu } from '@/features/Navbar/UserMenu';
import { RouteProgressProvider } from '@/features/Navigation/RouteProgress';
import { VoiceIntroPlayer } from '@/features/Profile/VoiceIntroPlayer';
import { useFormDraft } from '@/hooks/useFormDraft';
import { mockFetch } from './mockFetch';

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

export const SavedVoiceIntro: Story = {
  beforeEach: stubPlayback(),
  render: () => (
    <VoiceIntroPlayer
      src="/fixtures/voice-short.webm"
      seconds={4}
      filename="voice-intro"
    />
  ),
};

export const InboxLoadFailure: Story = {
  beforeEach: () => mockFetch(() => Response.json({}, { status: 500 })),
  render: () => <Inbox notifications={[]} />,
};

export const InboxWriteFailure: Story = {
  beforeEach: () =>
    mockFetch((_url, init) =>
      init?.method
        ? Response.json({}, { status: 500 })
        : {
            premium: true,
            notifications: [
              {
                id: 'review-inbox',
                kind: 'copy',
                actorName: 'Mina Park',
                createdAt: new Date().toISOString(),
                read: false,
              },
            ],
          },
    ),
  render: () => <Inbox notifications={[]} />,
};

export const Drafts: Story = {
  render: () => (
    <div className="max-w-xl p-6">
      <DraftNotice restored={false} stored unavailable={false} sessionExpired />
      <DraftNotice restored stored unavailable={false} />
      <DraftNotice restored={false} stored={false} unavailable />
    </div>
  ),
};

function PageMetadata() {
  const metadata = useTranslations('Metadata');
  return <meta name="description" content={metadata('description')} />;
}

export const Metadata: Story = { render: () => <PageMetadata /> };

const draftKey = 'polycord:review-draft';
const draftSchema = z.object({ value: z.string().optional() });

function DraftConfirmationFixture() {
  const form = useForm({ defaultValues: { value: '' } });
  const draft = useFormDraft(draftKey, form, draftSchema);
  return (
    <form
      className="max-w-xl p-6"
      data-draft-unavailable={draft.unavailable || undefined}
    >
      <input aria-label="Draft value" {...form.register('value')} />
      <a href="/review-draft">Leave page</a>
    </form>
  );
}

export const DraftConfirmation: Story = {
  beforeEach: () => {
    const getItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) {
      if (key === draftKey) throw new Error('Draft storage unavailable');
      return getItem.call(this, key);
    };
    return () => {
      Storage.prototype.getItem = getItem;
    };
  },
  render: () => <DraftConfirmationFixture />,
};

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
