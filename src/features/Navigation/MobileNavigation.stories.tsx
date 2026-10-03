import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, screen, userEvent, waitFor } from '@storybook/test';
import { MobileNavigation } from './MobileNavigation';

const realFetch = window.fetch;

const stubNotifications = (premium: boolean) => {
  let reads = 0;
  window.fetch = (async (input, init) => {
    if (!String(input).includes('/api/notifications') || init?.method) {
      return realFetch(input, init);
    }
    reads += 1;
    return Response.json({
      premium,
      notifications:
        reads === 1
          ? []
          : [
              {
                id: 'n1',
                kind: 'copy',
                actorName: 'xhev',
                actorProfileId: 'p1',
                read: false,
                createdAt: new Date().toISOString(),
              },
            ],
    });
  }) as typeof fetch;
};

const stubBatch = () => {
  let reads = 0;
  const createdAt = new Date().toISOString();
  window.fetch = (async (input, init) => {
    if (!String(input).includes('/api/notifications') || init?.method) {
      return realFetch(input, init);
    }
    reads += 1;
    return Response.json({
      premium: true,
      notifications:
        reads === 1
          ? []
          : [
              { id: 'n3', kind: 'warning', read: false, createdAt },
              {
                id: 'n2',
                kind: 'share',
                actorName: 'Mina Park',
                actorProfileId: 'p2',
                read: false,
                createdAt,
              },
              {
                id: 'n1',
                kind: 'copy',
                actorName: 'xhev',
                actorProfileId: 'p1',
                read: false,
                createdAt,
              },
            ],
    });
  }) as typeof fetch;
};

const refreshInbox = () =>
  window.dispatchEvent(
    new CustomEvent('polycord:inbox-changed', { detail: 'story' }),
  );

const meta: Meta<typeof MobileNavigation> = {
  title: 'Navigation/MobileNavigation',
  component: MobileNavigation,
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/en' } },
    viewport: { defaultViewport: 'mobile1' },
  },
  args: { locale: 'en', onNavigate: fn() },
};

export default meta;
type Story = StoryObj<typeof MobileNavigation>;

export const SupporterBanner: Story = {
  decorators: [
    (Story) => {
      stubNotifications(true);
      return <Story />;
    },
  ],
  play: async ({ args }) => {
    await screen.findByRole('navigation');
    await expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    refreshInbox();

    const banner = await screen.findByRole('alert');
    await expect(banner).toHaveTextContent('xhev copied your username');
    await expect(banner).toHaveTextContent('View profile');

    await userEvent.click(banner.querySelector('button') as HTMLElement);

    await expect(args.onNavigate).toHaveBeenCalledWith('/en/inbox');
    await waitFor(
      () => expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
      { timeout: 2000 },
    );

    refreshInbox();
    await new Promise((resolve) => setTimeout(resolve, 800));
    await expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  },
};

export const BatchedBannersQueue: Story = {
  decorators: [
    (Story) => {
      stubBatch();
      return <Story />;
    },
  ],
  play: async () => {
    await screen.findByRole('navigation');

    refreshInbox();

    for (const message of [
      'xhev copied your username',
      'Mina Park shared your profile',
      'You received a warning from the moderation team. Please review our community guidelines.',
    ]) {
      const banner = await screen.findByRole('alert', undefined, {
        timeout: 4000,
      });
      await expect(banner).toHaveTextContent(message);
      await userEvent.click(banner.querySelector('button') as HTMLElement);
      await waitFor(() => expect(banner).not.toBeInTheDocument(), {
        timeout: 2000,
      });
    }

    refreshInbox();
    await new Promise((resolve) => setTimeout(resolve, 800));
    await expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  },
};

export const FreeBannerHidesNames: Story = {
  decorators: [
    (Story) => {
      stubNotifications(false);
      return <Story />;
    },
  ],
  play: async () => {
    await screen.findByRole('navigation');

    refreshInbox();

    const banner = await screen.findByRole('alert');
    await expect(banner).toHaveTextContent('A user copied your username');
    await expect(banner).toHaveTextContent('See who it was with Supporter');
    await expect(banner).not.toHaveTextContent('xhev');
  },
};
