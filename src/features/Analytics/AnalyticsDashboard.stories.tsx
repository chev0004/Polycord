import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { AnalyticsDashboard } from './AnalyticsDashboard';

const daily = Array.from({ length: 14 }, (_, index) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - (13 - index));
  return {
    date: date.toISOString().slice(0, 10),
    total: [18, 24, 31, 27, 40, 52, 48, 61, 55, 70, 66, 81, 74, 92][index],
  };
});

const recent = [
  { name: 'discovery.view', locale: 'en', userId: 'u1' },
  { name: 'profile.view', locale: 'ja', userId: 'u2' },
  { name: 'profile.username_copy', locale: 'en', userId: null },
  { name: 'auth.signup', locale: 'en', userId: 'u3' },
  { name: 'profile.save', locale: 'ja', userId: 'u2' },
  { name: 'onboarding.complete', locale: 'en', userId: 'u3' },
].map((event, index) => ({
  id: `event-${index}`,
  name: event.name,
  userId: event.userId,
  locale: event.locale,
  metadata: null,
  createdAt: new Date(Date.now() - index * 1000 * 60 * 17).toISOString(),
}));

const meta: Meta<typeof AnalyticsDashboard> = {
  title: 'Features/Analytics/AnalyticsDashboard',
  component: AnalyticsDashboard,
  parameters: { layout: 'fullscreen' },
  args: {
    locale: 'en',
    rangeDays: 30,
    dailyDays: 14,
    totals: { totalEvents: 1280, uniqueUsers: 143 },
    eventCounts: [
      { name: 'discovery.view', total: 540 },
      { name: 'profile.view', total: 212 },
      { name: 'auth.login', total: 184 },
      { name: 'auth.signup', total: 88 },
      { name: 'onboarding.start', total: 84 },
      { name: 'onboarding.complete', total: 72 },
      { name: 'profile.username_copy', total: 64 },
      { name: 'profile.save', total: 58 },
      { name: 'profile.bump', total: 41 },
      { name: 'profile.save_favorite', total: 30 },
    ],
    daily,
    recent,
  },
};

export default meta;
type Story = StoryObj<typeof AnalyticsDashboard>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Activation funnel')).toBeInTheDocument();
    await expect(canvas.getByText('1,280')).toBeInTheDocument();
    await expect(canvas.getAllByText('Discovery views').length).toBeGreaterThan(
      0,
    );
  },
};

export const Empty: Story = {
  args: {
    totals: { totalEvents: 0, uniqueUsers: 0 },
    eventCounts: [],
    daily: [],
    recent: [],
  },
};
