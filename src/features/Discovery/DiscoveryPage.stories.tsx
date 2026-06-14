import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from '@storybook/test';
import { useTranslations } from 'next-intl';
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

    // Tags combine with the filter row: Gaming and Japanese primary leave Yuki.
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
    // ProfileGrid renders each card once per responsive breakpoint, so the
    // surviving name resolves to several nodes.
    expect(canvas.getAllByText('Yuki').length).toBeGreaterThan(0);

    // Clearing tags from the cloud head leaves the language filter applied.
    await userEvent.click(canvas.getByRole('button', { name: /1 selected/ }));
    await waitFor(() =>
      expect(canvas.getByText('2 partners')).toBeInTheDocument(),
    );
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
