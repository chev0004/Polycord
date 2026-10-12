import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, waitFor, within } from '@storybook/test';
import { useState } from 'react';
import { DatePicker, type DayActivity } from './DatePicker';

const today = new Date(2026, 9, 11);

const counts = (month: Date) =>
  Object.fromEntries(
    Array.from({ length: 31 }, (_, index) => index + 1)
      .filter((day) => new Date(2026, month.getMonth(), day) <= today)
      .map((day) => [
        `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        day % 4 === 0 ? 0 : day * 3,
      ]),
  );

const activity: DayActivity = {
  load: async (month) => counts(month),
  tone: 'primary',
  unit: (count) => `${count} actions`,
  monthLabel: 'actions this month',
  legend: (cap) => `Full ring: ${cap}+ in a day`,
};

const Controlled = ({
  activity: dayActivity,
  onChange,
}: {
  activity?: DayActivity;
  onChange?: (day: Date) => void;
}) => {
  const [day, setDay] = useState(new Date(2026, 9, 8));

  return (
    <DatePicker
      value={day}
      onChange={(next) => {
        setDay(next);
        onChange?.(next);
      }}
      today={today}
      label="Select a date"
      activity={dayActivity}
    />
  );
};

const meta: Meta<typeof Controlled> = {
  title: 'Components/DatePicker',
  component: Controlled,
  decorators: [
    (Story) => (
      <div className="min-h-[640px] p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Controlled>;

export const Default: Story = {
  args: { onChange: fn() },
  play: async ({ args, canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(body.getByRole('button', { name: 'Select a date' }));
    await userEvent.click(await body.findByRole('button', { name: '3' }));

    await expect(args.onChange).toHaveBeenCalledWith(new Date(2026, 9, 3));
    await waitFor(() =>
      expect(
        body.getByRole('button', { name: 'Select a date' }),
      ).toHaveTextContent('10/03/2026'),
    );
  },
};

export const DisablesFutureDays: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(body.getByRole('button', { name: 'Select a date' }));
    await expect(
      await body.findByRole('button', { name: '12' }),
    ).toBeDisabled();
    await expect(body.getByRole('button', { name: '11' })).toBeEnabled();
    await expect(
      body.getByRole('button', { name: 'Next month' }),
    ).toBeDisabled();

    await userEvent.click(body.getByRole('button', { name: 'Previous month' }));
    await expect(await body.findByText('September 2026')).toBeInTheDocument();
    await expect(body.getByRole('button', { name: '30' })).toBeEnabled();
    await expect(
      body.getByRole('button', { name: 'Next month' }),
    ).toBeEnabled();
  },
};

export const TodayShortcut: Story = {
  args: { onChange: fn() },
  play: async ({ args, canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(body.getByRole('button', { name: 'Select a date' }));
    await userEvent.click(await body.findByRole('button', { name: 'Today' }));

    await expect(args.onChange).toHaveBeenCalledWith(today);
  },
};

export const ActivityRings: Story = {
  args: { activity },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(body.getByRole('button', { name: 'Select a date' }));
    await expect(
      await body.findByRole('button', { name: /Fri, Oct 9, 27 actions/ }),
    ).toBeInTheDocument();
    await expect(
      body.getByRole('button', { name: /Sun, Oct 4, 0 actions/ }),
    ).toBeInTheDocument();
    await expect(body.getByText('actions this month')).toBeInTheDocument();
    await expect(
      body.getByText(/Full ring: 33\+ in a day/),
    ).toBeInTheDocument();
  },
};

export const DangerRings: Story = {
  args: { activity: { ...activity, tone: 'danger' } },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(body.getByRole('button', { name: 'Select a date' }));
    const day = await body.findByRole('button', { name: /Fri, Oct 9/ });
    await expect(day.style.getPropertyValue('--ring-color')).toBe(
      'var(--color-danger)',
    );
  },
};

export const MobileSheet: Story = {
  args: { activity, onChange: fn() },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ args, canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(body.getByRole('button', { name: 'Select a date' }));
    const sheet = within(await body.findByRole('dialog'));
    await userEvent.click(await sheet.findByRole('button', { name: /Oct 6/ }));
    await expect(args.onChange).not.toHaveBeenCalled();

    await userEvent.click(sheet.getByRole('button', { name: 'Apply' }));
    await expect(args.onChange).toHaveBeenCalledWith(new Date(2026, 9, 6));
  },
};
