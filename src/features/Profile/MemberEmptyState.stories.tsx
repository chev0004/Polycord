import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { MemberEmptyState } from './MemberEmptyState';
import 'src/app/globals.css';

const meta: Meta<typeof MemberEmptyState> = {
  title: 'Features/Profile/MemberEmptyState',
  component: MemberEmptyState,
  decorators: [
    (Story) => (
      <div className="bg-background-main p-8">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MemberEmptyState>;

export const Blocked: Story = {
  args: { kind: 'blocked' },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('heading', {
        name: 'You blocked this user',
      }),
    ).toBeInTheDocument();
  },
};

export const NotFound: Story = {
  args: { kind: 'notFound' },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('link', { name: 'Back to Discover' }),
    ).toHaveAttribute('href', '/en');
  },
};
