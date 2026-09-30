import type { Meta, StoryObj } from '@storybook/react';
import { expect, screen, userEvent, waitFor, within } from '@storybook/test';
import { Proficiency } from '@/constants';
import {
  type CardTheme,
  findCardTheme,
  getCustomCardTheme,
  getFreeCardTheme,
} from './cardTheme';
import { type DiscoveryProfile, ProfileCard } from './ProfileCard';
import 'src/app/globals.css';

const profile = (
  id: string,
  displayName: string,
  cardTheme: CardTheme,
  premium: boolean,
): DiscoveryProfile => ({
  id,
  displayName,
  discordUsername: displayName.toLowerCase(),
  primaryLanguage: 'ja',
  targetLanguages: [{ language: 'en', level: Proficiency.ADVANCED }],
  about: 'Looking for a relaxed weekly call partner.',
  tags: ['Anime', 'Gaming'],
  country: 'JP',
  timezone: 'Asia/Tokyo',
  cardTheme,
  premium,
});

const meta: Meta<typeof ProfileCard> = {
  title: 'Discovery/MobileProfileSheet',
  component: ProfileCard,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [
    (Story) => (
      <div className="flex flex-col gap-4 p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ProfileCard>;

const sheetMatchesCard = async (canvasElement: HTMLElement, name: string) => {
  const card = within(canvasElement)
    .getByText(name)
    .closest('article') as HTMLElement;
  await userEvent.click(card);
  const dialog = await screen.findByRole('dialog', { name });
  await expect(getComputedStyle(dialog).backgroundImage).toBe(
    getComputedStyle(card).backgroundImage,
  );
  await expect(getComputedStyle(dialog).backgroundColor).toBe(
    getComputedStyle(card).backgroundColor,
  );
  return dialog;
};

const themedStory = (cardTheme: CardTheme, premium: boolean): Story => ({
  args: { profile: profile('1', 'Aiko', cardTheme, premium) },
  play: async ({ canvasElement }) => {
    const dialog = await sheetMatchesCard(canvasElement, 'Aiko');
    await expect(getComputedStyle(dialog).backgroundImage === 'none').toBe(
      !premium,
    );
  },
});

export const Free = themedStory(getFreeCardTheme(0), false);
export const FreeWithPremiumColour = themedStory(
  findCardTheme('indigo') as CardTheme,
  false,
);
export const PremiumFlat = themedStory(
  findCardTheme('blue') as CardTheme,
  true,
);
export const PremiumGradient = themedStory(
  findCardTheme('indigo') as CardTheme,
  true,
);
export const PremiumCustomGradient = themedStory(
  getCustomCardTheme({ from: '#e0457b', to: '#f7b267' }),
  true,
);

export const SwitchProfiles: Story = {
  render: () => (
    <>
      <ProfileCard
        profile={profile(
          '1',
          'Aiko',
          getCustomCardTheme({ from: '#e0457b', to: '#f7b267' }),
          true,
        )}
      />
      <ProfileCard profile={profile('2', 'Ben', getFreeCardTheme(1), false)} />
    </>
  ),
  play: async ({ canvasElement }) => {
    await sheetMatchesCard(canvasElement, 'Aiko');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const dialog = await sheetMatchesCard(canvasElement, 'Ben');
    await expect(getComputedStyle(dialog).backgroundImage).toBe('none');
  },
};
