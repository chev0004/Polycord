import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { BannedScreen } from './BannedScreen';

const meta = {
  title: 'Banned/BannedScreen',
  component: BannedScreen,
  parameters: { layout: 'fullscreen' },
  args: {
    locale: 'en',
    date: new Date('2026-10-04T12:00:00Z'),
    reference: 'PC-7K2M-41QX',
  },
} satisfies Meta<typeof BannedScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('heading', { name: 'Your Account Has Been Banned' }),
    ).toBeInTheDocument();
    await expect(canvas.getByText('Oct 4, 2026')).toBeInTheDocument();
    await expect(canvas.getByText('PC-7K2M-41QX')).toBeInTheDocument();
    await expect(
      canvas.getByRole('link', { name: 'Email Support' }),
    ).toHaveAttribute(
      'href',
      'mailto:support@polycord.app?subject=Ban%20appeal%20PC-7K2M-41QX',
    );
    await expect(canvasElement.querySelector('nav')).toBeNull();
  },
};

export const Japanese: Story = {
  args: { locale: 'ja' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('heading', { name: 'アカウントが利用停止されました' }),
    ).toBeInTheDocument();
    await expect(canvas.getByText('2026年10月4日')).toBeInTheDocument();
  },
};
