import type { Meta, StoryObj } from '@storybook/react';
import { expect, fireEvent, userEvent, waitFor, within } from '@storybook/test';
import { useState } from 'react';
import {
  type AvailabilityPattern,
  DEFAULT_AVAILABILITY_PATTERN,
} from '@/constants/availability';
import type { TimeFormat } from '@/constants/languages';
import { TimeFormatProvider } from '@/features/Settings/TimeFormat';
import { AvailabilityEditor } from './AvailabilityEditor';

const EditorHarness = ({
  initialValue,
  disabled,
  format = '24hr',
}: {
  initialValue: AvailabilityPattern | null;
  disabled?: boolean;
  format?: TimeFormat;
}) => {
  const [value, setValue] = useState<AvailabilityPattern | null>(initialValue);
  const [lastPattern, setLastPattern] = useState(DEFAULT_AVAILABILITY_PATTERN);
  return (
    <TimeFormatProvider value={format}>
      <div className="w-[480px] rounded-3xl bg-background-dark p-6">
        <AvailabilityEditor
          value={value}
          onChange={setValue}
          lastPattern={lastPattern}
          onLastPatternChange={setLastPattern}
          disabled={disabled}
        />
      </div>
    </TimeFormatProvider>
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
    const weekdays = canvas.getByRole('button', { name: 'Weekdays' });
    await expect(toggle).not.toBeChecked();
    await expect(weekdays).toBeDisabled();
    await expect(
      canvas.getByRole('textbox', { name: 'From hour' }),
    ).toBeDisabled();
    await expect(
      canvas.getByRole('checkbox', { name: 'Any time' }),
    ).toBeDisabled();
    await expect(
      canvas.getByText(
        'Shown in your local time. Visitors see it converted to their timezone.',
      ),
    ).toBeInTheDocument();
    await expect(getComputedStyle(weekdays).cursor).toBe('not-allowed');
    await expect(
      getComputedStyle(weekdays.closest('fieldset') as HTMLElement).opacity,
    ).toBe('0.5');

    await userEvent.click(weekdays);
    await expect(weekdays).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(toggle);

    await waitFor(() => expect(toggle).toBeChecked());
    await expect(weekdays).toBeEnabled();
    await expect(
      getComputedStyle(weekdays.closest('fieldset') as HTMLElement).opacity,
    ).toBe('1');
  },
};

export const RequiresTimezone: Story = {
  args: { initialValue: null, disabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const toggle = canvas.getByRole('switch', { name: 'Free Time' });
    await expect(toggle).toBeDisabled();
    await expect(
      canvas.getByText('Add a timezone to set your free time.'),
    ).toBeInTheDocument();

    await userEvent.click(toggle);

    await expect(toggle).not.toBeChecked();
    await expect(
      canvas.getByRole('button', { name: 'Any day' }),
    ).toBeDisabled();
  },
};

export const KeepsValuesWhileOff: Story = {
  args: { initialValue: { days: 'weekends', from: '07:30', to: '10:00' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const toggle = canvas.getByRole('switch', { name: 'Free Time' });
    const weekends = canvas.getByRole('button', { name: 'Weekends' });
    const from = canvas.getByRole('textbox', { name: 'From hour' });
    const fromMinute = canvas.getByRole('textbox', { name: 'From minute' });

    await userEvent.click(toggle);

    await waitFor(() => expect(toggle).not.toBeChecked());
    await expect(weekends).toBeDisabled();
    await expect(weekends).toHaveAttribute('aria-pressed', 'true');
    await expect(from).toHaveValue('07');
    await expect(fromMinute).toHaveValue('30');

    await userEvent.click(toggle);

    await waitFor(() => expect(toggle).toBeChecked());
    await expect(weekends).toBeEnabled();
    await expect(weekends).toHaveAttribute('aria-pressed', 'true');
    await expect(from).toHaveValue('07');
    await expect(fromMinute).toHaveValue('30');
    await expect(canvas.getByRole('textbox', { name: 'To hour' })).toHaveValue(
      '10',
    );
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

    const from = canvas.getByRole('textbox', { name: 'From hour' });
    await expect(from).toHaveValue('18');
    await expect(canvas.getByRole('textbox', { name: 'To hour' })).toHaveValue(
      '22',
    );
    await expect(from).toBeEnabled();
    await expect(
      canvas.queryByRole('button', { name: 'From AM or PM' }),
    ).not.toBeInTheDocument();

    fireEvent.change(from, { target: { value: '9' } });
    fireEvent.focusOut(from);

    await waitFor(() => expect(from).toHaveValue('09'));
  },
};

export const TwelveHourLayout: Story = {
  args: {
    initialValue: { days: 'weekdays', from: '18:00', to: '22:30' },
    format: '12hr',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const hour = canvas.getByRole('textbox', { name: 'From hour' });
    const period = canvas.getByRole('button', { name: 'From AM or PM' });
    await expect(hour).toHaveValue('6');
    await expect(period).toHaveTextContent('PM');

    await userEvent.click(period);
    await waitFor(() => expect(period).toHaveTextContent('AM'));
    await expect(hour).toHaveValue('6');

    fireEvent.keyDown(hour, { key: 'p' });
    await waitFor(() => expect(period).toHaveTextContent('PM'));

    fireEvent.keyDown(hour, { key: 'ArrowUp' });
    await waitFor(() => expect(hour).toHaveValue('7'));
  },
};

export const MidnightAndNoon: Story = {
  args: {
    initialValue: { days: 'any', from: '00:00', to: '12:00' },
    format: '12hr',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole('textbox', { name: 'From hour' }),
    ).toHaveValue('12');
    await expect(
      canvas.getByRole('button', { name: 'From AM or PM' }),
    ).toHaveTextContent('AM');
    await expect(canvas.getByRole('textbox', { name: 'To hour' })).toHaveValue(
      '12',
    );
    await expect(
      canvas.getByRole('button', { name: 'To AM or PM' }),
    ).toHaveTextContent('PM');
  },
};

export const PopoverSelectsTime: Story = {
  args: {
    initialValue: { days: 'any', from: '18:00', to: '22:00' },
    format: '12hr',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(canvas.getByRole('button', { name: 'From' }));
    const hours = await body.findByRole('listbox', { name: 'Hour' });
    await userEvent.click(within(hours).getByRole('option', { name: '9' }));
    await userEvent.click(
      within(body.getByRole('listbox', { name: 'Min' })).getByRole('option', {
        name: '45',
      }),
    );

    const hour = canvas.getByRole('textbox', { name: 'From hour' });
    await waitFor(() => expect(hour).toHaveValue('9'));
    await expect(
      canvas.getByRole('textbox', { name: 'From minute' }),
    ).toHaveValue('45');
    await expect(
      canvas.getByRole('button', { name: 'From AM or PM' }),
    ).toHaveTextContent('PM');

    await userEvent.click(
      within(body.getByRole('listbox', { name: 'AM/PM' })).getByRole('option', {
        name: 'AM',
      }),
    );
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: 'From AM or PM' }),
      ).toHaveTextContent('AM'),
    );
  },
};

export const TypingMovesToMinutes: Story = {
  args: { initialValue: { days: 'any', from: '18:00', to: '22:00' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const hour = canvas.getByRole('textbox', { name: 'From hour' });
    const minute = canvas.getByRole('textbox', { name: 'From minute' });
    await userEvent.clear(hour);
    await userEvent.type(hour, '07');
    await expect(minute).toHaveFocus();
    await userEvent.clear(minute);
    await userEvent.type(minute, '75');
    await userEvent.tab();

    await waitFor(() => expect(minute).toHaveValue('59'));
    await expect(hour).toHaveValue('07');
  },
};

export const MobileWheel: Story = {
  args: {
    initialValue: { days: 'any', from: '18:00', to: '22:00' },
    format: '12hr',
  },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    const field = canvas.getByRole('button', { name: 'From' });
    await expect(field).toHaveTextContent('6:00 PM');
    await userEvent.click(field);

    const sheet = within(await body.findByRole('dialog'));
    await userEvent.click(sheet.getByRole('button', { name: '9' }));
    await userEvent.click(sheet.getByRole('button', { name: 'AM' }));
    await new Promise((resolve) => setTimeout(resolve, 700));
    await userEvent.click(sheet.getByRole('button', { name: 'Done' }));

    await waitFor(() => expect(field).toHaveTextContent('9:00 AM'));
  },
};

export const AnyTime: Story = {
  args: {
    initialValue: { days: 'any', from: '18:00', to: '22:00', anyTime: true },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const from = canvas.getByRole('textbox', { name: 'From hour' });
    const anyTime = canvas.getByRole('checkbox', { name: 'Any time' });
    await expect(from).toBeDisabled();
    await expect(anyTime).toBeChecked();

    await userEvent.click(anyTime);

    await waitFor(() => expect(from).toBeEnabled());
    await expect(anyTime).not.toBeChecked();
  },
};
