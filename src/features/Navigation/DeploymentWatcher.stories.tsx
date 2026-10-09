import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, screen, userEvent, waitFor } from '@storybook/test';
import { setUnsavedChanges } from '@/lib/unsavedChanges';
import { DeploymentWatcher } from './DeploymentWatcher';

const mockServerBuild = (serverBuildId: string) => () => {
  const original = globalThis.fetch;
  sessionStorage.removeItem('polycord:build-reload');
  sessionStorage.removeItem('polycord:chunk-reload');
  globalThis.fetch = Object.assign(
    async (...args: Parameters<typeof fetch>) =>
      String(args[0]) === '/api/build'
        ? Response.json({ buildId: serverBuildId })
        : original(...args),
    { preconnect: original.preconnect },
  );
  return () => {
    globalThis.fetch = original;
    setUnsavedChanges('story', false);
  };
};

const meta: Meta<typeof DeploymentWatcher> = {
  title: 'Navigation/DeploymentWatcher',
  component: DeploymentWatcher,
  args: { buildId: 'build-1', onReload: fn() },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const NewBuildReloads: Story = {
  beforeEach: mockServerBuild('build-2'),
  play: async ({ args }) => {
    await waitFor(() => expect(args.onReload).toHaveBeenCalledTimes(1));
  },
};

export const SameBuildStaysPut: Story = {
  beforeEach: mockServerBuild('build-1'),
  play: async ({ args }) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    await expect(args.onReload).not.toHaveBeenCalled();
    await expect(screen.queryByText('A new version is available')).toBeNull();
  },
};

export const UnsavedChangesAskFirst: Story = {
  beforeEach: () => {
    setUnsavedChanges('story', true);
    return mockServerBuild('build-2')();
  },
  play: async ({ args }) => {
    await expect(
      await screen.findByText('A new version is available'),
    ).toBeInTheDocument();
    await expect(args.onReload).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }));
    await waitFor(() => expect(args.onReload).toHaveBeenCalledTimes(1));
  },
};

export const ReloadsOnceChangesAreSaved: Story = {
  beforeEach: () => {
    setUnsavedChanges('story', true);
    return mockServerBuild('build-2')();
  },
  play: async ({ args }) => {
    await screen.findByText('A new version is available');
    await expect(args.onReload).not.toHaveBeenCalled();
    setUnsavedChanges('story', false);
    await waitFor(() => expect(args.onReload).toHaveBeenCalledTimes(1));
  },
};

export const Japanese: Story = {
  globals: { locale: 'ja' },
  beforeEach: () => {
    setUnsavedChanges('story', true);
    return mockServerBuild('build-2')();
  },
  play: async () => {
    await expect(
      await screen.findByText('新しいバージョンがあります'),
    ).toBeInTheDocument();
    await expect(
      screen.getByRole('button', { name: '再読み込み' }),
    ).toBeInTheDocument();
  },
};
