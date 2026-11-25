import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { FieldError } from './FieldError';

const meta: Meta<typeof FieldError> = {
  title: 'Components/Form/FieldError',
  component: FieldError,
  args: {
    children: 'Tags need at least 2 characters.',
  },
  decorators: [
    (Story) => (
      <div className="w-80 p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FieldError>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByText('Tags need at least 2 characters.'),
    ).toBeVisible();
  },
};

export const Empty: Story = {
  args: {
    children: undefined,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.queryByText('Tags need at least 2 characters.'),
    ).not.toBeInTheDocument();
  },
};
