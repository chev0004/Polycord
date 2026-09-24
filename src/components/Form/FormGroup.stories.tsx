import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { FieldError } from './FieldError';
import { FormGroup } from './FormGroup';
import { Label } from './Label';
import { TextInput } from './TextInput';
import { Toggle } from './Toggle';

const meta: Meta<typeof FormGroup> = {
  title: 'Components/Form/FormGroup',
  component: FormGroup,
  decorators: [
    (Story) => (
      <div className="w-96 p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FormGroup>;

export const Default: Story = {
  render: () => (
    <FormGroup>
      <Label htmlFor="email">Email Address</Label>
      <TextInput id="email" placeholder="Enter your email address" />
    </FormGroup>
  ),
};

export const WithError: Story = {
  render: () => (
    <FormGroup>
      <Label htmlFor="email-error">Email Address</Label>
      <TextInput id="email-error" defaultValue="not-an-email" error />
      <FieldError>Please enter a valid email address.</FieldError>
    </FormGroup>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByText('Please enter a valid email address.'),
    ).toBeVisible();
  },
};

export const Row: Story = {
  render: () => (
    <FormGroup row>
      <Label htmlFor="toggle-row">Display timezone</Label>
      <Toggle id="toggle-row" />
    </FormGroup>
  ),
};
