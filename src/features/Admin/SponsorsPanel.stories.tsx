import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import { type AdminSponsor, SponsorsPanel } from './SponsorsPanel';
import 'src/app/globals.css';

const day = 86_400_000;
const from = (days: number) => new Date(Date.now() + days * day).toISOString();

const sponsors: AdminSponsor[] = [
  {
    id: 'card-live',
    tier: 'card',
    name: 'kumo',
    url: 'https://example.com/kumo',
    startsAt: from(-5),
    endsAt: from(25),
    paused: false,
    views: 18234,
    clicks: 412,
  },
  {
    id: 'card-paused',
    tier: 'card',
    name: 'Tandem Tea',
    url: 'https://example.com/tea',
    startsAt: from(-2),
    endsAt: from(12),
    paused: true,
    views: 3120,
    clicks: 1,
  },
  {
    id: 'banner-scheduled',
    tier: 'banner',
    name: 'kumo',
    url: 'https://example.com/kumo',
    startsAt: from(9),
    endsAt: from(39),
    paused: false,
    views: 0,
    clicks: 0,
  },
  {
    id: 'banner-ended',
    tier: 'banner',
    name: 'Lingo Lane',
    url: 'https://example.com/lane',
    startsAt: from(-40),
    endsAt: from(-10),
    paused: false,
    views: 52880,
    clicks: 1306,
  },
];

const meta: Meta<typeof SponsorsPanel> = {
  title: 'Features/Admin/SponsorsPanel',
  component: SponsorsPanel,
  args: { initial: sponsors },
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof SponsorsPanel>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    for (const status of ['Live', 'Paused', 'Scheduled', 'Ended'])
      await expect(canvas.getByText(status)).toBeInTheDocument();
    await expect(
      canvas.getByText('18,234 views, 412 clicks'),
    ).toBeInTheDocument();
    await expect(canvas.getByText('3,120 views, 1 click')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Resume' })).toBeEnabled();

    await userEvent.click(canvas.getAllByRole('button', { name: 'Remove' })[0]);
    await expect(
      canvas.getByRole('button', { name: 'Remove for good' }),
    ).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }));

    await expect(canvas.getByText('Card image')).toBeInTheDocument();
    await expect(canvas.queryByText('Banner image (phones)')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Banner' }));
    await expect(
      canvas.getByText('Banner image (768px and up)'),
    ).toBeInTheDocument();
    await expect(canvas.getByText('Banner image (phones)')).toBeInTheDocument();
    await expect(
      canvas.getByText('1200 × 300 PNG, JPG or WebP, 1 MB at most'),
    ).toBeInTheDocument();
  },
};

export const Empty: Story = {
  args: { initial: [] },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getAllByText('No bookings yet.'),
    ).toHaveLength(2);
  },
};

export const Mobile: Story = {
  args: { mobile: true },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
};
