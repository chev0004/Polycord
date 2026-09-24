import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { Proficiency } from '@/constants';
import { PREMIUM_CARD_THEMES } from '@/features/Discovery/cardTheme';
import type { DiscoveryProfile } from '@/features/Discovery/ProfileCard';
import { ProfileDetail } from './ProfileDetail';
import 'src/app/globals.css';

const profile: DiscoveryProfile = {
  id: 'profile-1',
  displayName: 'Yuki',
  discordUsername: 'yuki_lang',
  primaryLanguage: 'ja',
  targetLanguages: [
    { language: 'en', level: Proficiency.ADVANCED },
    { language: 'ko', level: Proficiency.BEGINNER },
  ],
  about:
    'Software engineer in Tokyo preparing for the IELTS. Happy to help with Japanese grammar or kanji in exchange for English conversation.',
  interests: ['Anime', 'Gaming', 'Coding'],
  country: 'JP',
  timezone: 'Asia/Tokyo',
  availability: { days: 'weekdays', from: '20:00', to: '23:00' },
  allowAnonymousCopy: true,
};

const meta: Meta<typeof ProfileDetail> = {
  title: 'Features/Profile/ProfileDetail',
  component: ProfileDetail,
  args: {
    profile,
    isLoggedIn: true,
    viewerTimezone: 'Europe/London',
    onCopyUsername: fn(),
    onShare: fn(),
    onToggleSave: fn(),
    onReport: fn(),
    onBlock: fn(),
    onSignIn: fn(),
    onTagClick: fn(),
    onLanguageClick: fn(),
    onCountryClick: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-5xl bg-background-main p-4 sm:p-8">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ProfileDetail>;

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Yuki' }),
    ).toBeInTheDocument();
    await expect(canvas.getByText('Japan')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: /Korean/ }));
    await expect(args.onLanguageClick).toHaveBeenCalledWith('ko', false);
    await userEvent.click(canvas.getByRole('button', { name: 'Japan' }));
    await expect(args.onCountryClick).toHaveBeenCalledWith('JP');
    await userEvent.click(canvas.getByRole('button', { name: 'Gaming' }));
    await expect(args.onTagClick).toHaveBeenCalledWith('Gaming');
  },
};

export const PremiumSaved: Story = {
  args: {
    isSaved: true,
    profile: {
      ...profile,
      premium: true,
      cardTheme: PREMIUM_CARD_THEMES[0],
      voiceIntroSeconds: 12,
    },
  },
};

export const LongContent: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  args: {
    profile: {
      ...profile,
      displayName: 'Maximiliana Alexandrovna Konstantinopolskaya-Whitfield',
      targetLanguages: ['en', 'ko', 'zh', 'fr', 'es', 'de', 'pt', 'it'].map(
        (language) => ({ language, level: Proficiency.INTERMEDIATE }),
      ),
      about: `${'Polyglot in progress with a very long introduction. '.repeat(9)}Supercalifragilisticexpialidociouslylongwordwithoutanybreaks.`,
      interests: [
        'Historical Linguistics',
        'Board Games',
        'Photography',
        'Mountaineering',
        'Jazz Piano',
        'Calligraphy',
        'Cooking',
        'Astronomy',
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const article = canvasElement.querySelector('article') as HTMLElement;

    await expect(article.scrollWidth).toBeLessThanOrEqual(article.clientWidth);
  },
};

export const LoggedOutPrivateUsername: Story = {
  args: {
    isLoggedIn: false,
    onToggleSave: undefined,
    profile: { ...profile, allowAnonymousCopy: false },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.queryByRole('button', { name: 'Copy username' }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole('button', { name: /Sign in to view/ }),
    );
    await expect(args.onSignIn).toHaveBeenCalled();
  },
};

export const OwnProfile: Story = {
  args: {
    onToggleSave: undefined,
    onReport: undefined,
    onBlock: undefined,
    onEdit: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole('button', { name: 'Edit Profile' }),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByRole('button', { name: /Report/ }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole('button', { name: /Save/ }),
    ).not.toBeInTheDocument();
  },
};
