import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { RouteProgressProvider } from '@/features/Navigation/RouteProgress';
import { LegalHub } from './LegalHub';
import 'src/app/globals.css';

const meta: Meta<typeof LegalHub> = {
  title: 'Features/Legal/LegalHub',
  component: LegalHub,
  parameters: { layout: 'fullscreen', nextjs: { appDirectory: true } },
  args: { locale: 'en' },
  decorators: [
    (Story) => (
      <RouteProgressProvider>
        <Story />
      </RouteProgressProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LegalHub>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const cards = within(canvasElement).getAllByRole('button');
    await expect(cards).toHaveLength(3);
    for (const card of cards) {
      await expect(getComputedStyle(card).borderRadius).toBe('24px');
    }
  },
};
