import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { RecoveryPage } from './RecoveryPage';

const meta = {
  title: 'Navigation/RecoveryPage',
  component: RecoveryPage,
  parameters: { layout: 'fullscreen' },
  args: { kind: 'missing', locale: 'en' },
} satisfies Meta<typeof RecoveryPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Missing: Story = {};
export const Japanese: Story = { args: { locale: 'ja' } };
export const Retry: Story = {
  args: { kind: 'error', reset: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Try again' }));
    await expect(args.reset).toHaveBeenCalledOnce();
    await expect(canvas.getByRole('link')).toHaveAttribute('href', '/en');
  },
};
