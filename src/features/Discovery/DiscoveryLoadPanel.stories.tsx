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
      canvas.getByRole('complementary', { name: 'Discovery load trace' }),
    ).toBeInTheDocument();
    await expect(canvas.getByText('12.00 s')).toBeInTheDocument();
    await expect(canvas.getByText('Not started')).toBeInTheDocument();
    fireEvent.click(canvas.getByText('Discovery load trace'));
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
      canvas.getByText(/Initial grid ready: timers stopped/),
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
