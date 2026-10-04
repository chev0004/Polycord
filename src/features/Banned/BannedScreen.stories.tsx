import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { BannedScreen } from './BannedScreen';

const meta = {
  title: 'Banned/BannedScreen',
  component: BannedScreen,
  parameters: {
    layout: 'fullscreen',
    viewport: { defaultViewport: 'mobile1' },
  },
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
      canvas.getByRole('heading', { name: 'You Have Been Banned' }),
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
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      window.innerWidth,
    );
    const appeal = canvas.getByRole('link', { name: 'Email Support' });
    const rect = appeal.getBoundingClientRect();
    if (window.innerWidth < 768) {
      await expect(rect.width).toBeGreaterThan(window.innerWidth - 48);
      await expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight);
    } else {
      await expect(rect.width).toBeLessThan(240);
    }
  },
};

export const Japanese: Story = {
  args: { locale: 'ja' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('heading', { name: '利用停止になりました' }),
    ).toBeInTheDocument();
    await expect(canvas.getByText('2026年10月4日')).toBeInTheDocument();
  },
};
