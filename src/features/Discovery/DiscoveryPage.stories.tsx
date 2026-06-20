import type { Meta, StoryObj } from '@storybook/react';
import {
  expect,
  fn,
  screen,
  userEvent,
  waitFor,
  within,
} from '@storybook/test';
import { useTranslations } from 'next-intl';
import { MOCK_USER_AVATAR_URL } from '@/constants/mock-data';
import { DiscoveryPage } from './DiscoveryPage';
import { createSampleProfiles } from './profileFixtures';
import 'src/app/globals.css';

const meta: Meta<typeof DiscoveryPage> = {
  title: 'Discovery/DiscoveryPage',
  component: DiscoveryPage,
  args: {
    isLoggedIn: true,
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

// Selecting Japanese as the primary language narrows the nine sample profiles
// to the two Japanese speakers, then clearing restores the full feed.
const filterAndClearPlay = async ({
  canvasElement,
}: {
  canvasElement: HTMLElement;
}) => {
  const canvas = within(canvasElement);
  const doc = canvasElement.ownerDocument;

  await expect(canvas.getByText('9 partners')).toBeInTheDocument();

  await userEvent.click(
    canvas.getByRole('button', { name: 'Primary Language' }),
  );

  // The filter popover renders in a portal outside the story canvas, so scope
  // option lookups to it to avoid matching language pills inside the cards.
  const popover = within(
    await waitFor(() => {
      const content = doc.querySelector<HTMLElement>('.PopoverContent');
      if (!content) throw new Error('Filter popover did not open');
      return content;
    }),
  );

  await userEvent.click(
    await popover.findByRole('button', { name: 'Japanese' }),
  );
  await userEvent.click(popover.getByRole('button', { name: 'Apply' }));

  await waitFor(() =>
    expect(canvas.getByText('2 partners')).toBeInTheDocument(),
  );
  expect(canvas.queryAllByText('Carlos')).toHaveLength(0);

  await userEvent.click(canvas.getByRole('button', { name: 'Clear filters' }));

  await waitFor(() =>
    expect(canvas.getByText('9 partners')).toBeInTheDocument(),
  );
};

export const Default: Story = {
  render: (args) => {
    const t = useTranslations('DiscoveryStories');

    return <DiscoveryPage {...args} profiles={createSampleProfiles(t)} />;
  },
  play: async (context) => {
    const canvas = within(context.canvasElement);

    // The design removed the eyebrow-title-description header entirely.
    expect(
      canvas.queryByText('Find a language partner on Discord'),
    ).not.toBeInTheDocument();

    await filterAndClearPlay(context);
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  render: (args) => {
    const t = useTranslations('DiscoveryStories');

    return <DiscoveryPage {...args} profiles={createSampleProfiles(t)} />;
  },
  play: filterAndClearPlay,
};

export const Search: Story = {
  render: (args) => {
    const t = useTranslations('DiscoveryStories');

    return <DiscoveryPage {...args} profiles={createSampleProfiles(t)} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('9 partners')).toBeInTheDocument();

    await userEvent.type(
      canvas.getByRole('textbox', { name: 'Search profiles' }),
      'IELTS',
    );

    await waitFor(() =>
      expect(canvas.getByText('1 partner')).toBeInTheDocument(),
    );
    await expect(canvas.getByText('Yuki')).toBeInTheDocument();
    expect(canvas.queryByText('Carlos')).not.toBeInTheDocument();
  },
};

export const SearchEmpty: Story = {
  render: (args) => {
    const t = useTranslations('DiscoveryStories');

    return <DiscoveryPage {...args} profiles={createSampleProfiles(t)} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(
      canvas.getByRole('textbox', { name: 'Search profiles' }),
      'zzqxnomatch',
    );

    await waitFor(() =>
      expect(canvas.getByText('0 partners')).toBeInTheDocument(),
    );
    await expect(canvas.getByText(/find any matches/)).toBeInTheDocument();
  },
};

export const Tags: Story = {
  render: (args) => {
    const t = useTranslations('DiscoveryStories');

    return <DiscoveryPage {...args} profiles={createSampleProfiles(t)} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const doc = canvasElement.ownerDocument;

    await expect(canvas.getByText('9 partners')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: 'Gaming (4)' }));
    await waitFor(() =>
      expect(canvas.getByText('4 partners')).toBeInTheDocument(),
    );

    await userEvent.click(
      canvas.getByRole('button', { name: 'Primary Language' }),
    );

    const popover = within(
      await waitFor(() => {
        const content = doc.querySelector<HTMLElement>('.PopoverContent');
        if (!content) throw new Error('Filter popover did not open');
        return content;
      }),
    );

    await userEvent.click(
      await popover.findByRole('button', { name: 'Japanese' }),
    );
    await userEvent.click(popover.getByRole('button', { name: 'Apply' }));

    await waitFor(() =>
      expect(canvas.getByText('1 partner')).toBeInTheDocument(),
    );
    expect(canvas.getAllByText('Yuki').length).toBeGreaterThan(0);

    await userEvent.click(canvas.getByRole('button', { name: /1 selected/ }));
    await waitFor(() =>
      expect(canvas.getByText('2 partners')).toBeInTheDocument(),
    );
  },
};

export const Sort: Story = {
  render: (args) => {
    const t = useTranslations('DiscoveryStories');

    return <DiscoveryPage {...args} profiles={createSampleProfiles(t)} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const doc = canvasElement.ownerDocument;

    const firstOccurrence = (name: string) => canvas.getAllByText(name)[0];
    const precedes = (before: string, after: string) =>
      Boolean(
        firstOccurrence(before).compareDocumentPosition(
          firstOccurrence(after),
        ) & Node.DOCUMENT_POSITION_FOLLOWING,
      );

    await expect(precedes('Wei', 'Yuki')).toBe(true);

    const pickSort = async (option: string) => {
      await userEvent.click(canvas.getByRole('button', { name: 'Sort' }));

      const popover = within(
        await waitFor(() => {
          const content = doc.querySelector<HTMLElement>('.PopoverContent');
          if (!content) throw new Error('Sort popover did not open');
          return content;
        }),
      );

      await userEvent.click(popover.getByRole('button', { name: option }));
    };

    await pickSort('Oldest bumped');
    await waitFor(() => expect(precedes('Sofia', 'Wei')).toBe(true));

    await pickSort('Name (A-Z)');
    await waitFor(() => expect(precedes('Alex', 'Yuki')).toBe(true));

    await pickSort('Name (Z-A)');
    await waitFor(() => expect(precedes('Yuki', 'Alex')).toBe(true));
  },
};

export const AvailabilityFilter: Story = {
  args: {
    viewerTimezone: 'America/New_York',
    viewerAvailability: { days: 'weekdays', from: '06:00', to: '09:00' },
  },
  render: (args) => {
    const t = useTranslations('DiscoveryStories');

    return <DiscoveryPage {...args} profiles={createSampleProfiles(t)} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const doc = canvasElement.ownerDocument;

    await expect(canvas.getByText('9 partners')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: 'Availability' }));

    const popover = within(
      await waitFor(() => {
        const content = doc.querySelector<HTMLElement>('.PopoverContent');
        if (!content) throw new Error('Filter popover did not open');
        return content;
      }),
    );

    await userEvent.click(
      await popover.findByRole('button', { name: 'Overlaps with me' }),
    );
    await userEvent.click(popover.getByRole('button', { name: 'Apply' }));

    await waitFor(() =>
      expect(canvas.getByText('2 partners')).toBeInTheDocument(),
    );
    await expect(canvas.getAllByText('Yuki').length).toBeGreaterThan(0);
    expect(canvas.queryByText('Wei')).not.toBeInTheDocument();
  },
};

export const Paginated: Story = {
  render: (args) => {
    const t = useTranslations('DiscoveryStories');
    const base = createSampleProfiles(t);

    return (
      <DiscoveryPage
        {...args}
        profiles={[
          ...base,
          ...base.map((profile) => ({ ...profile, id: `${profile.id}-b` })),
        ]}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const doc = canvasElement.ownerDocument;

    await expect(canvas.getByText('18 partners')).toBeInTheDocument();
    await expect(canvas.getByText('Page 1 of 2')).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'Previous page' }),
    ).toBeDisabled();

    await userEvent.click(canvas.getByRole('button', { name: 'Next page' }));
    await expect(canvas.getByText('Page 2 of 2')).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'Next page' }),
    ).toBeDisabled();

    await userEvent.click(
      canvas.getByRole('button', { name: 'Primary Language' }),
    );

    const popover = within(
      await waitFor(() => {
        const content = doc.querySelector<HTMLElement>('.PopoverContent');
        if (!content) throw new Error('Filter popover did not open');
        return content;
      }),
    );

    await userEvent.click(
      await popover.findByRole('button', { name: 'Japanese' }),
    );
    await userEvent.click(popover.getByRole('button', { name: 'Apply' }));

    await waitFor(() =>
      expect(canvas.getByText('4 partners')).toBeInTheDocument(),
    );
    await expect(
      canvas.queryByRole('button', { name: 'Next page' }),
    ).toBeNull();
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText(/Searching/)).toBeInTheDocument();
    await expect(canvas.getByLabelText('Loading profiles')).toBeInTheDocument();
  },
};

export const Empty: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('0 partners')).toBeInTheDocument();
    await expect(canvas.getByText(/find any matches/)).toBeInTheDocument();
  },
};

export const FeedError: Story = {
  args: {
    feedError: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText(/load profiles/)).toBeInTheDocument();
  },
};

export const BumpProfile: Story = {
  render: (args) => {
    const t = useTranslations('DiscoveryStories');

    return (
      <DiscoveryPage
        {...args}
        currentProfileId="profile-1"
        profiles={createSampleProfiles(t)}
        userAvatarUrl={MOCK_USER_AVATAR_URL}
        onBumpProfile={fn(async () => ({
          lastBumpedAt: new Date().toISOString(),
          nextBumpAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          premium: false,
        }))}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const imageButtons = Array.from(
      canvasElement.querySelectorAll<HTMLButtonElement>('nav button'),
    ).filter((button) => button.querySelector('img'));
    const avatarButton = imageButtons.at(-1);

    if (!avatarButton) throw new Error('User menu trigger not found');

    await userEvent.click(avatarButton);
    await userEvent.click(await screen.findByText('Bump profile'));
    await expect(await canvas.findByText('Profile bumped')).toBeInTheDocument();
  },
};

export const BumpProfileCooldown: Story = {
  render: (args) => {
    const t = useTranslations('DiscoveryStories');

    return (
      <DiscoveryPage
        {...args}
        currentProfileId="profile-1"
        profiles={createSampleProfiles(t)}
        userAvatarUrl={MOCK_USER_AVATAR_URL}
        bumpReadyAt={new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const imageButtons = Array.from(
      canvasElement.querySelectorAll<HTMLButtonElement>('nav button'),
    ).filter((button) => button.querySelector('img'));
    const avatarButton = imageButtons.at(-1);

    if (!avatarButton) throw new Error('User menu trigger not found');

    await userEvent.click(avatarButton);
    const cooldownItem = await screen.findByText(/Bump in/);
    await expect(cooldownItem.closest('button')).toBeDisabled();
  },
};
