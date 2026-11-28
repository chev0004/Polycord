import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { AdvertisePage } from './AdvertisePage';
import 'src/app/globals.css';

const meta: Meta<typeof AdvertisePage> = {
  title: 'Features/Advertise/AdvertisePage',
  component: AdvertisePage,
  args: {
    minGroup: 25,
    inviteUrl: 'https://discord.gg/polycord',
    audience: {
      profiles: 4720,
      active: 1830,
      speak: [
        { code: 'en', share: 31 },
        { code: 'ja', share: 18 },
        { code: 'es', share: 9 },
        { code: 'pt', share: 6 },
        { code: 'ko', share: 4 },
      ],
      learn: [
        { code: 'ja', share: 42 },
        { code: 'en', share: 27 },
        { code: 'ko', share: 15 },
        { code: 'zh', share: 11 },
        { code: 'fr', share: 7 },
      ],
      countries: [
        { code: 'US', share: 22 },
        { code: 'JP', share: 17 },
        { code: 'BR', share: 8 },
        { code: 'GB', share: 6 },
        { code: 'PH', share: 5 },
      ],
    },
  },
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof AdvertisePage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('4,720+')).toBeInTheDocument();
    await expect(canvas.getAllByText('Japanese')).toHaveLength(2);
    await expect(canvas.getByText('42%')).toBeInTheDocument();
    await expect(canvas.getByText('$50 per 30 days')).toBeInTheDocument();
    await expect(canvas.getByText('$100 per 30 days')).toBeInTheDocument();
    await expect(
      canvas.getByText(
        'Images: 2400 × 300 from 768px wide, 1200 × 300 on phones',
      ),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole('link', { name: 'Message us on Discord' }),
    ).toHaveAttribute('href', 'https://discord.gg/polycord');
  },
};

export const NotEnoughProfiles: Story = {
  args: { audience: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/Audience numbers appear here once/),
    ).toBeInTheDocument();
    await expect(canvas.queryByText('Public profiles')).toBeNull();
  },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
