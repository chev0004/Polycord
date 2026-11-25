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
      <Label htmlFor="display-name">Display Name</Label>
      <TextInput id="display-name" placeholder="Enter a display name" />
    </FormGroup>
  ),
};

export const WithError: Story = {
  render: () => (
    <FormGroup>
      <Label htmlFor="display-name-error">Display Name</Label>
      <TextInput id="display-name-error" defaultValue="x" error />
      <FieldError>Tags need at least 2 characters.</FieldError>
    </FormGroup>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByText('Tags need at least 2 characters.'),
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
