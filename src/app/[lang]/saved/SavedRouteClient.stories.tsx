import { getRouter } from '@storybook/nextjs/navigation.mock';
import type { Meta, StoryObj } from '@storybook/react';
import {
  expect,
  fireEvent,
  screen,
  userEvent,
  waitFor,
  within,
} from '@storybook/test';
import { useTranslations } from 'next-intl';
import { useLayoutEffect, useState } from 'react';
import { createSampleProfiles } from '@/features/Discovery/profileFixtures';
import { RouteProgressProvider } from '@/features/Navigation/RouteProgress';
import { SavedRouteClient } from './SavedRouteClient';

const RetryExample = () => {
  const [failed, setFailed] = useState(true);
  const t = useTranslations('DiscoveryStories');

  useLayoutEffect(() => {
    getRouter()
      .refresh.mockImplementationOnce(() => {})
      .mockImplementation(() => setFailed(false));
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

const SavedExample = () => {
  const t = useTranslations('DiscoveryStories');

  return (
    <RouteProgressProvider>
      <SavedRouteClient locale="en" profiles={createSampleProfiles(t)} />
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
    expect(getRouter().refresh).toHaveBeenCalledTimes(2);
  },
};

export const SearchFilterAndSort: Story = {
  render: () => <SavedExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const doc = canvasElement.ownerDocument;
    const search = canvas.getByRole('textbox', { name: 'Search profiles' });
    const openPopover = async (name: string) => {
      await userEvent.click(canvas.getByRole('button', { name }));
      return within(
        await waitFor(() => {
          const content = doc.querySelector<HTMLElement>('.PopoverContent');
          if (!content) throw new Error(`${name} popover did not open`);
          return content;
        }),
      );
    };
    const precedes = (before: string, after: string) =>
      Boolean(
        canvas
          .getAllByText(before)[0]
          .compareDocumentPosition(canvas.getAllByText(after)[0]) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );

    await expect(canvas.getByText('9 partners')).toBeInTheDocument();
    expect(canvas.queryByText('Popular tags')).toBeNull();

    await userEvent.type(search, 'IELTS');
    await waitFor(() =>
      expect(canvas.getByText('1 partner')).toBeInTheDocument(),
    );
    expect(canvas.getAllByText('Yuki').length).toBeGreaterThan(0);
    await userEvent.clear(search);

    const language = await openPopover('Primary Language');
    await userEvent.click(
      await language.findByRole('button', { name: 'Japanese' }),
    );
    await userEvent.click(language.getByRole('button', { name: 'Apply' }));
    await waitFor(() =>
      expect(canvas.getByText('2 partners')).toBeInTheDocument(),
    );

    expect(precedes('Yuki', 'Haruto')).toBe(true);
    const sort = await openPopover('Sort');
    await userEvent.click(sort.getByRole('button', { name: 'Name (A-Z)' }));
    await waitFor(() => expect(precedes('Haruto', 'Yuki')).toBe(true));

    await userEvent.type(search, 'no such partner');
    await waitFor(() =>
      expect(
        canvas.getByText(
          'No saved profiles match your search or filters. Clear them to see all of your saved profiles.',
        ),
      ).toBeInTheDocument(),
    );
    await userEvent.clear(search);
    await userEvent.click(canvas.getByRole('button', { name: 'Clear' }));
    await waitFor(() =>
      expect(canvas.getByText('9 partners')).toBeInTheDocument(),
    );
  },
};

export const BackToDiscovery: Story = {
  render: () => <SavedExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Back to discovery' }),
    );
    await waitFor(() => expect(getRouter().push).toHaveBeenCalledWith('/en'));
  },
};

export const MobileFilters: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  render: () => <SavedExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('9 partners')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Filters' }));
    const sheet = within(await screen.findByRole('dialog'));
    expect(sheet.queryByText('Tags')).toBeNull();
    await userEvent.click(
      sheet.getByRole('button', { name: /^Primary Language/ }),
    );
    await userEvent.click(
      await sheet.findByRole('button', { name: 'Japanese' }),
    );
    await userEvent.click(
      await sheet.findByRole('button', { name: 'Show 2 partners' }),
    );
    await waitFor(() =>
      expect(canvas.getByText('2 partners')).toBeInTheDocument(),
    );
  },
};
