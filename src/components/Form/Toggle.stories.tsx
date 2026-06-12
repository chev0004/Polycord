import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import { useId } from 'react';
import { Label } from './Label';
import { Toggle } from './Toggle';

const meta: Meta<typeof Toggle> = {
  title: 'Components/Form/Toggle',
  component: Toggle,
  decorators: [
    (Story) => (
      <div className="flex items-center space-x-2 p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Toggle>;

const ToggleWithLabel = () => {
  const id = useId();
  return (
    <>
      <Toggle id={id} />
      <Label htmlFor={id}>Toggle</Label>
    </>
  );
};

export const Default: Story = {
  render: () => <ToggleWithLabel />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole('switch');

    await userEvent.click(toggle);

    await expect(toggle).toBeChecked();
  },
};

export const Checked: Story = {
  args: {
    defaultChecked: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('switch')).toBeChecked();
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('switch')).toBeDisabled();
  },
};
