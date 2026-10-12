import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import { useState } from 'react';
import { Checkbox, CheckGroup } from './Checkbox';

const Controlled = ({ disabled }: { disabled?: boolean }) => {
  const [checked, setChecked] = useState(false);

  return (
    <Checkbox
      checked={checked}
      onCheckedChange={(value) => setChecked(value === true)}
      label="Also block this account"
      description="You will no longer see their profile."
      disabled={disabled}
    />
  );
};

const meta: Meta<typeof Checkbox> = {
  title: 'Components/Form/Checkbox',
  component: Checkbox,
  decorators: [
    (Story) => (
      <div className="w-[360px] p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  render: () => <Controlled />,
  play: async ({ canvasElement }) => {
    const checkbox = within(canvasElement).getByRole('checkbox');

    await expect(checkbox).not.toBeChecked();
    await userEvent.click(checkbox);
    await expect(checkbox).toBeChecked();
    await userEvent.keyboard(' ');
    await expect(checkbox).not.toBeChecked();
  },
};

export const Disabled: Story = {
  render: () => <Controlled disabled />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('checkbox')).toBeDisabled();
  },
};

export const Grouped: Story = {
  render: () => (
    <CheckGroup>
      <Controlled />
      <Controlled />
    </CheckGroup>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole('checkbox')).toHaveLength(
      2,
    );
  },
};
