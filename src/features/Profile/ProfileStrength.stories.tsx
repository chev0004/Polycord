import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { ProfileStrength } from './ProfileStrength';
import 'src/app/globals.css';

const meta: Meta<typeof ProfileStrength> = {
  title: 'Features/Profile/ProfileStrength',
  component: ProfileStrength,
  decorators: [
    (Story) => (
      <div className="max-w-[300px] bg-background-main p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ProfileStrength>;

export const Complete: Story = {
  args: {
    score: 100,
    missing: [],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('100%')).toBeInTheDocument();
    await expect(
      canvas.getByText('Looks great. Your profile is complete.'),
    ).toBeInTheDocument();
  },
};

export const Partial: Story = {
  args: {
    score: 60,
    missing: ['availability', 'tags', 'country'],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('60%')).toBeInTheDocument();
    await expect(canvas.getByText('Set your availability')).toBeInTheDocument();
  },
};

export const Empty: Story = {
  args: {
    score: 0,
    missing: [
      'primaryLanguage',
      'targetLanguages',
      'bio',
      'availability',
      'tags',
      'country',
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('0%')).toBeInTheDocument();
    await expect(
      canvas.getByText('Set your primary language'),
    ).toBeInTheDocument();
  },
};
