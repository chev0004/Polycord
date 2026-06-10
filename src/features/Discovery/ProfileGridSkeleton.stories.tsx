import type { Meta, StoryObj } from '@storybook/react';
import { ProfileGridSkeleton } from './ProfileGridSkeleton';

const meta: Meta<typeof ProfileGridSkeleton> = {
  title: 'Discovery/ProfileGridSkeleton',
  component: ProfileGridSkeleton,
};

export default meta;
type Story = StoryObj<typeof ProfileGridSkeleton>;

export const Default: Story = {};
