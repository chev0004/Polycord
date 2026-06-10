import type { Meta, StoryObj } from '@storybook/react';
import { useTranslations } from 'next-intl';
import { DiscoveryPage } from './DiscoveryPage';
import { ProfileGrid } from './ProfileGrid';
import { ProfileGridSkeleton } from './ProfileGridSkeleton';

const meta: Meta<typeof DiscoveryPage> = {
  title: 'Discovery/DiscoveryPage',
  component: DiscoveryPage,
  args: {
    isLoggedIn: false,
    locale: 'en',
  },
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
};

export default meta;
type Story = StoryObj<typeof DiscoveryPage>;

export const LoggedOutEmpty: Story = {
  render: (args) => {
    const t = useTranslations('Discovery');

    return (
      <DiscoveryPage
        {...args}
        feed={
          <ProfileGrid profiles={[]} emptyState={t('emptyFeedDescription')} />
        }
      />
    );
  },
};

export const Loading: Story = {
  render: (args) => <DiscoveryPage {...args} feed={<ProfileGridSkeleton />} />,
};
