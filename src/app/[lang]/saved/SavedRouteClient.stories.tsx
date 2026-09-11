import { getRouter } from '@storybook/nextjs/navigation.mock';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fireEvent, waitFor, within } from '@storybook/test';
import { useTranslations } from 'next-intl';
import { useLayoutEffect, useState } from 'react';
import { createSampleProfiles } from '@/features/Discovery/profileFixtures';
import { RouteProgressProvider } from '@/features/Navigation/RouteProgress';
import { SavedRouteClient } from './SavedRouteClient';

const RetryExample = () => {
  const [failed, setFailed] = useState(true);
  const t = useTranslations('DiscoveryStories');

  useLayoutEffect(() => {
    getRouter().refresh.mockImplementation(() => setFailed(false));
    return () => {
      getRouter().refresh.mockReset();
    };
  }, []);

  return (
    <RouteProgressProvider>
      <SavedRouteClient
        locale="en"
        profiles={failed ? [] : createSampleProfiles(t).slice(0, 1)}
        loadError={failed}
      />
    </RouteProgressProvider>
  );
};

const meta: Meta<typeof SavedRouteClient> = {
  title: 'Routes/Saved',
  component: SavedRouteClient,
  parameters: {
    layout: 'fullscreen',
    nextjs: { appDirectory: true, navigation: { pathname: '/en/saved' } },
  },
};

export default meta;
type Story = StoryObj<typeof SavedRouteClient>;

export const RetrySuccess: Story = {
  render: () => <RetryExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(canvas.getByRole('button', { name: 'Try again' }));
    await waitFor(() =>
      expect(canvas.queryByRole('alert')).not.toBeInTheDocument(),
    );
    expect(canvas.getAllByText('Yuki').length).toBeGreaterThan(0);
    expect(getRouter().refresh).toHaveBeenCalledTimes(1);
  },
};
