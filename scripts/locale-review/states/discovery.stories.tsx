import type { Meta, StoryObj } from '@storybook/react';
import { useTranslations } from 'next-intl';
import { BlockDialog } from '@/features/Discovery/BlockDialog';
import { DiscoveryPage } from '@/features/Discovery/DiscoveryPage';
import pageMeta from '@/features/Discovery/DiscoveryPage.stories';
import { ProfileCard } from '@/features/Discovery/ProfileCard';
import { createSampleProfiles } from '@/features/Discovery/profileFixtures';
import { ReportDialog } from '@/features/Discovery/ReportDialog';
import { TagCloud } from '@/features/Discovery/TagCloud';
import { Toasts } from './Toasts';

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

function DiscoveryToasts() {
  const t = useTranslations('Discovery');
  return (
    <Toasts
      messages={[
        ['saveLogin', ''],
        ['reportLogin', ''],
        ['blockLogin', ''],
        ['reportSuccess', ''],
        ['reportError', ''],
        ['reportCooldown', ''],
        ['blockSuccess', ''],
        ['shareError', ''],
        ['bumpSuccess', ''],
        ['bumpCooldown', ''],
      ]
        .map(([name]) => [
          t(`${name}Title`),
          t(`${name}Description`, { time: '1 h' }),
        ])
        .concat([[t('saveError'), '']])}
    />
  );
}

export const ResultToasts: Story = { render: () => <DiscoveryToasts /> };

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
