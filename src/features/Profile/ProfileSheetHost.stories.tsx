import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import { RouteProgressProvider } from '@/features/Navigation/RouteProgress';
import { ProfileSheetHost } from './ProfileSheetHost';
import { profileSheetStore } from './profileSheetStore';

const meta: Meta<typeof ProfileSheetHost> = {
  title: 'Features/Profile/ProfileSheetHost',
  component: ProfileSheetHost,
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/en/saved' } },
    viewport: { defaultViewport: 'mobile1' },
  },
  decorators: [
    (Story) => (
      <RouteProgressProvider>
        <Story />
      </RouteProgressProvider>
    ),
  ],
  beforeEach: () => {
    const original = globalThis.fetch;
    globalThis.fetch = Object.assign(
      (...args: Parameters<typeof fetch>) =>
        String(args[0]).startsWith('/api/profile/public/')
          ? new Promise<Response>(() => {})
          : original(...args),
      { preconnect: original.preconnect },
    );
    profileSheetStore.invalidate();
    profileSheetStore.open('loading-story');
    return () => {
      profileSheetStore.close();
      profileSheetStore.invalidate();
      globalThis.fetch = original;
    };
  },
};

export default meta;
type Story = StoryObj<typeof ProfileSheetHost>;

export const Loading: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await body.findByRole('dialog', {
      name: 'Loading profile...',
    });
    await expect(dialog).toHaveClass('SheetContent');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Close' }),
    );
    await expect(profileSheetStore.get()).toBeNull();
  },
};
