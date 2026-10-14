import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from '@storybook/test';
import { RouteProgressProvider } from '@/features/Navigation/RouteProgress';
import { ProfileSheet, ProfileSheetHost } from './ProfileSheetHost';
import { type ProfileSheetData, profileSheetStore } from './profileSheetStore';

const profile: ProfileSheetData = {
  profile: {
    id: 'shared-profile',
    displayName: 'Shared profile',
    primaryLanguage: 'ja',
    targetLanguages: [{ language: 'en' }],
    tags: ['Anime'],
    about: 'A shared language partner profile.',
  },
  isLoggedIn: false,
  isSaved: false,
  isOwn: false,
  waitForDiscovery: true,
};

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

export const WaitingForDiscovery: Story = {
  beforeEach: () => profileSheetStore.open(profile),
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await body.findByRole('dialog', { name: 'Shared profile' });
    const close = within(dialog).getByRole('button', { name: 'Close' });
    await expect(close).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    await expect(profileSheetStore.get()).toBe(profile);
    profileSheetStore.open({ ...profile, waitForDiscovery: false });
    await waitFor(() => expect(close).toBeEnabled());
    await userEvent.click(close);
    await waitFor(() => expect(profileSheetStore.get()).toBeNull());
  },
};

export const InlineProfile: Story = {
  render: () => <ProfileSheet data={profile} portal={false} />,
};

export const ReportAndBlockClosesProfile: Story = {
  beforeEach: () => {
    const original = globalThis.fetch;
    globalThis.fetch = Object.assign(
      (...args: Parameters<typeof fetch>) =>
        ['/api/report', '/api/block'].includes(String(args[0]))
          ? Promise.resolve(Response.json({}))
          : original(...args),
      { preconnect: original.preconnect },
    );
    profileSheetStore.open({
      ...profile,
      isLoggedIn: true,
      waitForDiscovery: false,
    });
    return () => {
      globalThis.fetch = original;
    };
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      await body.findByRole('button', { name: 'More actions' }),
    );
    await userEvent.click(
      await body.findByRole('button', { name: 'Report profile' }),
    );
    await userEvent.click(
      await body.findByRole('radio', { name: 'Spam or scam' }),
    );
    await userEvent.click(
      body.getByRole('checkbox', { name: /Also block this account/ }),
    );
    await userEvent.click(body.getByRole('button', { name: 'Submit report' }));
    await waitFor(() => expect(profileSheetStore.get()).toBeNull());
  },
};
