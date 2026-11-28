import type { Meta, StoryObj } from '@storybook/react';
import { useTranslations } from 'next-intl';
import { BlockDialog } from '@/features/Discovery/BlockDialog';
import { DiscoveryPage } from '@/features/Discovery/DiscoveryPage';
import pageMeta, { Default } from '@/features/Discovery/DiscoveryPage.stories';
import { ProfileCard } from '@/features/Discovery/ProfileCard';
import { createSampleProfiles } from '@/features/Discovery/profileFixtures';
import { ReportDialog } from '@/features/Discovery/ReportDialog';
import { TagCloud } from '@/features/Discovery/TagCloud';
import { mockFetch } from './mockFetch';

const meta = {
  title: 'Review/Discovery',
  component: DiscoveryPage,
  parameters: pageMeta.parameters,
  decorators: pageMeta.decorators,
  args: pageMeta.args,
} satisfies Meta<typeof DiscoveryPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SignInFailed: Story = { args: { authError: 'failed' } };
export const SignInSuspended: Story = { args: { authError: 'suspended' } };

const onboarding = (draft: object): Story => ({
  args: { needsOnboarding: true, userId: 'review', isLoggedIn: true },
  beforeEach: () => {
    sessionStorage.setItem('polycord:profile:review', JSON.stringify(draft));
    return () => sessionStorage.removeItem('polycord:profile:review');
  },
});

export const OnboardingStarted = onboarding({});
export const OnboardingReady = onboarding({
  primaryLanguage: 'ja',
  targetLanguages: [{ language: 'en', level: 'beginner' }],
  bio: 'I am looking for a patient partner to practice English with.',
});

function responseAt(path: string, status: number, body = {}) {
  return () =>
    mockFetch((url) =>
      url.pathname === path
        ? Response.json(body, { status })
        : { profiles: [], total: 0, tags: [], notifications: [] },
    );
}

export const Guest: Story = {
  render: Default.render,
  args: { isLoggedIn: false },
};
export const SaveFailure: Story = {
  render: Default.render,
  beforeEach: responseAt('/api/saved', 500),
};
export const ReportSuccess: Story = {
  render: Default.render,
  beforeEach: responseAt('/api/report', 200),
};
export const ReportFailure: Story = {
  render: Default.render,
  beforeEach: responseAt('/api/report', 500),
};
export const ReportLimited: Story = {
  render: Default.render,
  beforeEach: responseAt('/api/report', 429),
};
export const BlockSuccess: Story = {
  render: Default.render,
  beforeEach: responseAt('/api/block', 200),
};
export const BumpLimited: Story = {
  render: Default.render,
  args: { currentProfileId: 'profile-1' },
  beforeEach: responseAt('/api/profile/bump', 429, { remainingMs: 3_723_000 }),
};
export const ShareFailure: Story = {
  render: Default.render,
  beforeEach: () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    return () => {
      Reflect.deleteProperty(navigator, 'clipboard');
    };
  },
};

function Card({ saved }: { saved: boolean }) {
  const t = useTranslations('DiscoveryStories');
  const [profile] = createSampleProfiles(t);
  const noop = () => {};
  return (
    <div className="w-96 p-10">
      <ProfileCard
        profile={profile}
        isSaved={saved}
        onViewProfile={noop}
        onToggleSave={noop}
        onShare={noop}
        onReport={noop}
        onBlock={noop}
        onModerate={noop}
      />
    </div>
  );
}

export const CardMenu: Story = { render: () => <Card saved={false} /> };
export const SavedCardMenu: Story = { render: () => <Card saved /> };

export const BlockUser: Story = {
  render: () => (
    <BlockDialog
      open
      onOpenChange={() => {}}
      profileName="Yuki"
      returnFocus={{ current: null }}
      onConfirm={() => {}}
    />
  ),
};

export const ReportUnnamed: Story = {
  render: () => (
    <ReportDialog open onOpenChange={() => {}} onSubmit={() => {}} />
  ),
};

export const FilteredTags: Story = {
  render: () => (
    <div className="p-6">
      <TagCloud
        tags={Array.from({ length: 60 }, (_, index) => ({
          tag: `Interest ${index + 1}`,
          count: 60 - index,
        }))}
        selected={[]}
        onToggle={() => {}}
        onClear={() => {}}
        collapsible
        applied={[{ key: 'country', label: 'Japan', onRemove: () => {} }]}
      />
    </div>
  ),
};
