import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import { useState } from 'react';
import { NumberStepper, type NumberStepperProps } from './NumberStepper';

const Controlled = (props: Partial<NumberStepperProps>) => {
  const [value, setValue] = useState('14');

  return (
    <NumberStepper
      value={value}
      onChange={setValue}
      min={1}
      max={90}
      label="Days"
      decrementLabel="Fewer days"
      incrementLabel="More days"
      className="w-40"
      {...props}
    />
  );
};

const meta: Meta<typeof NumberStepper> = {
  title: 'Components/Form/NumberStepper',
  component: NumberStepper,
  decorators: [
    (Story) => (
      <div className="p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NumberStepper>;

export const Default: Story = {
  render: () => <Controlled />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('spinbutton', { name: 'Days' });

    await userEvent.click(canvas.getByRole('button', { name: 'More days' }));
    await expect(input).toHaveValue('15');

    await userEvent.click(canvas.getByRole('button', { name: 'Fewer days' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Fewer days' }));
    await expect(input).toHaveValue('13');

    await userEvent.type(input, '{ArrowUp}{ArrowUp}');
    await expect(input).toHaveValue('15');

    await userEvent.clear(input);
    await userEvent.type(input, '4a2b');
    await expect(input).toHaveValue('42');
  },
};

export const StopsAtLimits: Story = {
  render: () => <Controlled />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('spinbutton', { name: 'Days' });

    await userEvent.clear(input);
    await userEvent.type(input, '90');
    await expect(
      canvas.getByRole('button', { name: 'More days' }),
    ).toBeDisabled();

    await userEvent.type(input, '{ArrowUp}');
    await expect(input).toHaveValue('90');

    await userEvent.clear(input);
    await userEvent.type(input, '1');
    await expect(
      canvas.getByRole('button', { name: 'Fewer days' }),
    ).toBeDisabled();

    await userEvent.type(input, '{ArrowDown}');
    await expect(input).toHaveValue('1');
  },
};

export const OutOfRange: Story = {
  render: () => <Controlled />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('spinbutton', { name: 'Days' });

    await userEvent.clear(input);
    await userEvent.type(input, '400');
    await expect(input).toHaveValue('400');
  },
};

export const ErrorState: Story = {
  render: () => <Controlled error />,
};

export const Large: Story = {
  render: () => <Controlled size="lg" className="w-56" />,
};

export const Small: Story = {
  render: () => <Controlled size="sm" className="w-36" />,
};

export const Disabled: Story = {
  render: () => <Controlled disabled />,
};
