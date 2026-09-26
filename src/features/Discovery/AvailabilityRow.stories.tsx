import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { AvailabilityRow } from './AvailabilityRow';
import 'src/app/globals.css';

const meta: Meta<typeof AvailabilityRow> = {
  title: 'Discovery/AvailabilityRow',
  component: AvailabilityRow,
  decorators: [
    (Story) => (
      <div className="w-72 rounded-2xl bg-background-dark p-5">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AvailabilityRow>;

export const SameZone: Story = {
  args: {
    availability: { days: 'weekdays', from: '20:00', to: '23:00' },
    ownerTimezone: 'Asia/Tokyo',
    viewerTimezone: 'Asia/Tokyo',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByText(/Weekdays · 20:00 to 23:00/),
    ).toBeInTheDocument();
    await expect(canvas.queryByText(/your time/)).not.toBeInTheDocument();
  },
};

export const CrossZone: Story = {
  args: {
    availability: { days: 'weekends', from: '14:00', to: '20:00' },
    ownerTimezone: 'Asia/Tokyo',
    viewerTimezone: 'America/Los_Angeles',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByText(/Weekends · 14:00 to 20:00/),
    ).toBeInTheDocument();
    await expect(canvas.getByText(/your time/)).toBeInTheDocument();
  },
};

export const AnyTimeRow: Story = {
  args: {
    availability: { days: 'any', from: '18:00', to: '22:00', anyTime: true },
    ownerTimezone: 'Asia/Tokyo',
    viewerTimezone: 'America/Los_Angeles',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Any day · any time')).toBeInTheDocument();
    await expect(canvas.queryByText(/your time/)).not.toBeInTheDocument();
  },
};
