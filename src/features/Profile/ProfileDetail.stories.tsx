import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, waitFor, within } from '@storybook/test';
import { Proficiency } from '@/constants';
import {
  type CardTheme,
  findCardTheme,
  PREMIUM_CARD_THEMES,
} from '@/features/Discovery/cardTheme';
import type { DiscoveryProfile } from '@/features/Discovery/ProfileCard';
import { ProfileDetail } from './ProfileDetail';
import { useProfileActions } from './useProfileActions';
import 'src/app/globals.css';

const profile: DiscoveryProfile = {
  id: 'profile-1',
  displayName: 'Yuki Tanaka',
  discordUsername: 'yuki_lang',
  primaryLanguage: 'ja',
  targetLanguages: [
    { language: 'en', level: Proficiency.ADVANCED },
    { language: 'ko', level: Proficiency.BEGINNER },
  ],
  about:
    'Software engineer in Tokyo preparing for the IELTS. Happy to help with Japanese grammar or kanji in exchange for English conversation.',
  tags: ['Anime', 'Gaming', 'Coding'],
  country: 'JP',
  timezone: 'Asia/Tokyo',
  availability: { days: 'any', from: '20:00', to: '23:00' },
  allowAnonymousCopy: true,
  lastBumpedAt: new Date(Date.now() - 4 * 60000).toISOString(),
};

const meta: Meta<typeof ProfileDetail> = {
  title: 'Features/Profile/ProfileDetail',
  component: ProfileDetail,
  parameters: { layout: 'fullscreen' },
  args: {
    profile,
    isLoggedIn: true,
    viewerTimezone: 'Europe/London',
    viewerAvailability: { days: 'any', from: '11:00', to: '14:00' },
    onCopyUsername: fn(async () => true),
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
      <div className="max-w-[1080px] bg-background-main p-4 sm:p-8">
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
      canvas.getByRole('heading', { level: 1, name: 'Yuki Tanaka' }),
    ).toBeInTheDocument();
    await expect(canvas.getByText('Description')).toBeInTheDocument();
    await expect(await canvas.findByText(/overlap$/)).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Korean' }));
    await expect(args.onLanguageClick).toHaveBeenCalledWith('ko', false);
    await userEvent.click(canvas.getByRole('button', { name: 'Japan' }));
    await expect(args.onCountryClick).toHaveBeenCalledWith('JP');
    await userEvent.click(canvas.getByRole('button', { name: 'Gaming' }));
    await expect(args.onTagClick).toHaveBeenCalledWith('Gaming');
    await userEvent.click(
      canvas.getByRole('button', { name: 'Copy profile link' }),
    );
    await expect(args.onShare).toHaveBeenCalled();
  },
};

export const CopyUsername: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Yuki Tanaka' }));
    await expect(args.onCopyUsername).toHaveBeenCalled();
    await expect(canvas.queryByText(/yuki_lang/)).not.toBeInTheDocument();
    const name = getComputedStyle(canvas.getByText('Yuki Tanaka'));
    await waitFor(() => expect(name.backgroundClip).toBe('text'));
    await expect(name.backgroundImage).toBe(
      'linear-gradient(rgb(70, 82, 95), rgb(70, 82, 95))',
    );
  },
};

export const CopyFallback: Story = {
  args: { onCopyUsername: fn(async () => false) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.queryByText(/yuki_lang/)).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Yuki Tanaka' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'yuki_lang',
    );
  },
};

export const UsernameCopyFeedback: Story = {
  args: {
    profile: {
      ...profile,
      avatarUrl: 'https://cdn.discordapp.com/avatars/1/yuki.png',
    },
  },
  render: (args) => {
    const actions = useProfileActions('en', true, () => {});
    return (
      <>
        <ProfileDetail
          {...args}
          onCopyUsername={() => actions.copyUsername(args.profile, true)}
        />
        {actions.feedback}
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const writeText = fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole('button', { name: 'Yuki Tanaka' }));
    await expect(writeText).toHaveBeenCalledWith('yuki_lang');
    await waitFor(() =>
      expect(
        getComputedStyle(canvas.getByText('Yuki Tanaka')).backgroundClip,
      ).toBe('text'),
    );
    if (window.innerWidth < 768) {
      await expect(body.queryByText('Copied!')).not.toBeInTheDocument();
    } else {
      const toast = (
        await body.findByText('yuki_lang copied to clipboard')
      ).closest('li');
      await expect(toast?.querySelector('img')).toHaveAttribute(
        'src',
        'https://cdn.discordapp.com/avatars/1/yuki.png',
      );
    }
  },
};

export const MobileUsernameCopyFeedback: Story = {
  ...UsernameCopyFeedback,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};

export const MoreActions: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(canvas.getByRole('button', { name: 'More actions' }));
    await userEvent.click(
      await body.findByRole('button', { name: 'Save profile' }),
    );
    await expect(args.onToggleSave).toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: 'More actions' }));
    await expect(
      await body.findByRole('button', { name: 'Report profile' }),
    ).toBeInTheDocument();
    await userEvent.click(body.getByRole('button', { name: 'Block user' }));
    await userEvent.click(
      within(await body.findByRole('dialog')).getByRole('button', {
        name: 'Cancel',
      }),
    );
    await expect(args.onBlock).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: 'More actions' }));
    await userEvent.click(body.getByRole('button', { name: 'Block user' }));
    await userEvent.click(
      within(await body.findByRole('dialog')).getByRole('button', {
        name: 'Block user',
      }),
    );
    await expect(args.onBlock).toHaveBeenCalledTimes(1);
  },
};

export const SupporterSaved: Story = {
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

const premiumPill = (cardTheme: CardTheme, chipBg: string): Story => ({
  args: { profile: { ...profile, premium: true, cardTheme } },
  play: async ({ canvasElement }) => {
    const pill = within(canvasElement).getByText('Supporter');
    await expect(getComputedStyle(pill).backgroundColor).toBe(chipBg);
  },
});

export const SupporterPillCustomAccent = premiumPill(
  { ...(findCardTheme('blue') as CardTheme), accent: '#f97316' },
  'rgba(249, 115, 22, 0.15)',
);

export const SupporterPillThemeAccent = premiumPill(
  findCardTheme('rose') as CardTheme,
  'rgba(196, 91, 149, 0.15)',
);

export const NoAvailability: Story = {
  args: {
    profile: { ...profile, availability: undefined },
    viewerAvailability: undefined,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => expect(canvas.getAllByText('Not set')).toHaveLength(2));
    await expect(canvas.queryByText(/overlap$/)).not.toBeInTheDocument();
    await expect(canvas.queryByText('·')).not.toBeInTheDocument();
  },
};

export const NoViewerTimezoneNoAvailability: Story = {
  args: {
    profile: { ...profile, availability: undefined },
    viewerTimezone: undefined,
    viewerAvailability: undefined,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = await canvas.findByText('Not set');
    const separator = status.nextElementSibling;

    await expect(separator).toHaveTextContent(/^·$/);
    await expect(separator?.nextElementSibling).toHaveTextContent(/^now \S+/);
  },
};

export const NoViewerTimezone: Story = {
  args: {
    viewerTimezone: undefined,
    viewerAvailability: undefined,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() =>
      expect(canvas.getByText('Description')).toBeInTheDocument(),
    );
    await expect(
      canvas.queryByText('Same time as you'),
    ).not.toBeInTheDocument();
    await expect(canvas.queryByText(/ahead of you$/)).not.toBeInTheDocument();
    await expect(canvas.queryByText(/behind you$/)).not.toBeInTheDocument();
    await expect(canvas.queryByText(/overlap$/)).not.toBeInTheDocument();
    await expect(canvas.queryByText('You')).not.toBeInTheDocument();
    await expect(canvas.getByText('Yuki')).toBeInTheDocument();
  },
};

export const NoTimezones: Story = {
  args: {
    profile: { ...profile, timezone: undefined },
    viewerTimezone: undefined,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText('Their time').nextElementSibling,
    ).toHaveTextContent('Not set');
    await expect(
      canvas.queryByText('Same time as you'),
    ).not.toBeInTheDocument();
    await expect(canvas.queryByText(/now \d/)).not.toBeInTheDocument();
    await expect(canvas.queryByText(/overlap$/)).not.toBeInTheDocument();
  },
};

export const OnlyViewerTimezone: Story = {
  ...NoTimezones,
  args: {
    profile: { ...profile, timezone: undefined },
    viewerTimezone: 'Europe/London',
  },
};

export const DummyProfile: Story = {
  args: { profile: { ...profile, synthetic: true } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Dummy')).toBeInTheDocument();
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Yuki Tanaka' }),
    ).toBeInTheDocument();
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
      tags: [
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
    viewerAvailability: undefined,
    profile: { ...profile, allowAnonymousCopy: false },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const name = canvas.getByRole('button', { name: 'Yuki Tanaka' });

    await expect(name).toHaveAttribute('title', 'Sign in to view username');
    await userEvent.click(name);
    await expect(args.onSignIn).toHaveBeenCalled();
    await expect(args.onCopyUsername).not.toHaveBeenCalled();
  },
};

export const OwnProfile: Story = {
  args: {
    onToggleSave: undefined,
    onReport: undefined,
    onBlock: undefined,
    onEdit: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(canvas.getByRole('button', { name: 'More actions' }));
    await userEvent.click(
      await body.findByRole('button', { name: 'Edit Profile' }),
    );
    await expect(args.onEdit).toHaveBeenCalled();
    await expect(
      body.queryByRole('button', { name: /Report/ }),
    ).not.toBeInTheDocument();
  },
};

export const MenuTransition: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: 'More actions' }),
    );
    const menu = (
      await within(canvasElement.ownerDocument.body).findByRole('button', {
        name: 'Report profile',
      })
    ).closest('.PopoverContent') as HTMLElement;
    await expect(getComputedStyle(menu).animationName).toBe('slideUpAndFade');
  },
};
