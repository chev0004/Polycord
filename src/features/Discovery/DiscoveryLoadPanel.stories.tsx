import type { Meta, StoryObj } from '@storybook/react';
import { expect, fireEvent, within } from '@storybook/test';
import { DiscoveryLoadPanelView } from './DiscoveryLoadPanel';

const meta: Meta<typeof DiscoveryLoadPanelView> = {
  title: 'Discovery/DiscoveryLoadPanel',
  component: DiscoveryLoadPanelView,
  args: {
    now: 12000,
    trace: {
      transport: 'https',
      navigation: {
        redirect: 3100,
        connection: 120,
        firstByte: 11000,
        download: 80,
      },
      phases: {
        document: {
          status: 'done',
          start: 0,
          end: 11080,
          spans: { ban: 5200 },
        },
        controls: { status: 'done', start: 0, end: 11600 },
        viewer: { status: 'loading', start: 11620 },
        discovery: { status: 'loading', start: 11630 },
        grid: { status: 'pending' },
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('complementary', { name: 'Page load trace' }),
    ).toBeInTheDocument();
    await expect(canvas.getByText('12.00 s')).toBeInTheDocument();
    await expect(canvas.getByText('Not started')).toBeInTheDocument();
    fireEvent.click(canvas.getByText('Page load trace'));
    await expect(
      canvas.getByRole('complementary').querySelector('details'),
    ).not.toHaveAttribute('open');
  },
};

export const Complete: Story = {
  args: {
    now: 45000,
    trace: {
      transport: 'direct',
      finished: 29000,
      navigation: {
        redirect: 3100,
        connection: 120,
        firstByte: 11000,
        download: 80,
      },
      phases: {
        document: {
          status: 'done',
          start: 0,
          end: 11080,
          spans: { ban: 5200 },
        },
        controls: { status: 'done', start: 0, end: 11600 },
        viewer: {
          status: 'done',
          start: 11620,
          end: 27000,
          spans: { handler: 6000, account: 1500, profile: 2300 },
        },
        discovery: {
          status: 'done',
          start: 11630,
          end: 28100,
          spans: { handler: 4700, query: 2100 },
        },
        grid: { status: 'done', start: 28100, end: 29000 },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('29.00 s')).toBeInTheDocument();
    await expect(
      canvas.getByText(/Page ready: timers stopped/),
    ).toBeInTheDocument();
    await expect(canvas.queryByText('45.00 s')).not.toBeInTheDocument();
  },
};

export const Failed: Story = {
  args: {
    trace: {
      transport: 'https',
      navigation: {
        redirect: 0,
        connection: 100,
        firstByte: 3000,
        download: 30,
      },
      phases: {
        document: { status: 'done', start: 0, end: 3030 },
        controls: { status: 'done', start: 0, end: 3800 },
        viewer: { status: 'failed', start: 3800, end: 10000 },
        discovery: { status: 'done', start: 3800, end: 6000 },
        grid: { status: 'pending' },
      },
    },
  },
};

export const SettingsNavigation: Story = {
  args: {
    now: 52000,
    trace: {
      transport: 'https',
      kind: 'client',
      route: '/en/settings',
      routes: ['/en/user/[member]', '/en/u/[member]', '/en/settings'],
      startedAt: 50000,
      finished: 1700,
      navigation: { redirect: 0, connection: 0, firstByte: 0, download: 0 },
      phases: {
        document: { status: 'done', start: 0, end: 1600 },
        controls: { status: 'done', start: 0, end: 1700 },
        viewer: { status: 'pending' },
        discovery: { status: 'pending' },
        grid: { status: 'pending' },
        page: { status: 'done', start: 0, end: 1700, spans: { page: 900 } },
      },
      resources: [
        {
          name: '/en/settings',
          start: 30,
          end: 1500,
          redirect: 250,
          firstByte: 1400,
          spans: { gate: 400 },
        },
      ],
      history: [
        {
          transport: 'https',
          route: '/en',
          finished: 8500,
          navigation: {
            redirect: 1000,
            connection: 0,
            firstByte: 2700,
            download: 0,
          },
          phases: {
            document: { status: 'done', start: 0, end: 2700 },
            controls: { status: 'done', start: 0, end: 3200 },
            viewer: { status: 'done', start: 3100, end: 7300 },
            discovery: { status: 'done', start: 3100, end: 8100 },
            grid: { status: 'done', start: 8100, end: 8500 },
          },
        },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText('1.70 s').length).toBeGreaterThan(0);
    await expect(
      canvas.getByText('Navigation to destination'),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByText('Discovery results'),
    ).not.toBeInTheDocument();
    fireEvent.click(canvas.getByText('Previous navigations (1)'));
    await expect(canvas.getByText('8.50 s')).toBeVisible();
    fireEvent.click(canvas.getByText('Network requests (1)'));
    await expect(canvas.getByText('0.25 s')).toBeVisible();
  },
};
