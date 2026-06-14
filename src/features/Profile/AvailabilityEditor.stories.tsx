import type { Meta, StoryObj } from '@storybook/react';
import { expect, fireEvent, userEvent, waitFor, within } from '@storybook/test';
import { useState } from 'react';
import type { AvailabilityPattern } from '@/constants/availability';
import { AvailabilityEditor } from './AvailabilityEditor';

const EditorHarness = ({
  initialValue,
}: {
  initialValue: AvailabilityPattern | null;
}) => {
  const [value, setValue] = useState<AvailabilityPattern | null>(initialValue);
  return (
    <div className="w-[420px] rounded-3xl bg-background-dark p-6">
      <AvailabilityEditor value={value} onChange={setValue} />
    </div>
  );
};

const meta: Meta<typeof EditorHarness> = {
  title: 'Features/Profile/AvailabilityEditor',
  component: EditorHarness,
};

export default meta;
type Story = StoryObj<typeof EditorHarness>;

export const Disabled: Story = {
  args: { initialValue: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const toggle = canvas.getByRole('switch', { name: 'Free Time' });
    await expect(toggle).not.toBeChecked();
    await expect(
      canvas.queryByRole('button', { name: 'Weekdays' }),
    ).not.toBeInTheDocument();

    await userEvent.click(toggle);

    await waitFor(() => expect(toggle).toBeChecked());
    await expect(
      canvas.getByRole('button', { name: 'Any day' }),
    ).toBeInTheDocument();
  },
};

export const DayPresets: Story = {
  args: { initialValue: { days: 'any', from: '18:00', to: '22:00' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const anyDay = canvas.getByRole('button', { name: 'Any day' });
    const weekdays = canvas.getByRole('button', { name: 'Weekdays' });
    await expect(anyDay).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(weekdays);

    await waitFor(() =>
      expect(weekdays).toHaveAttribute('aria-pressed', 'true'),
    );
    await expect(anyDay).toHaveAttribute('aria-pressed', 'false');
  },
};

export const TimeRange: Story = {
  args: { initialValue: { days: 'weekdays', from: '18:00', to: '22:00' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const from = canvas.getByLabelText('From') as HTMLInputElement;
    const to = canvas.getByLabelText('To') as HTMLInputElement;
    await expect(from).toHaveValue('18:00');
    await expect(to).toHaveValue('22:00');
    await expect(from).toBeEnabled();

    fireEvent.change(from, { target: { value: '09:00' } });

    await waitFor(() => expect(from).toHaveValue('09:00'));
  },
};

export const AnyTime: Story = {
  args: {
    initialValue: { days: 'any', from: '18:00', to: '22:00', anyTime: true },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const from = canvas.getByLabelText('From') as HTMLInputElement;
    const anyTime = canvas.getByRole('button', { name: 'Any time' });
    await expect(from).toBeDisabled();
    await expect(anyTime).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(anyTime);

    await waitFor(() => expect(from).toBeEnabled());
    await expect(anyTime).toHaveAttribute('aria-pressed', 'false');
  },
};
