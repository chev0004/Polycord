import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, waitFor, within } from '@storybook/test';
import { useTranslations } from 'next-intl';
import { Proficiency } from '@/constants';
import { getFreeCardTheme, PREMIUM_CARD_THEMES } from './cardTheme';
import { type DiscoveryProfile, ProfileCard } from './ProfileCard';
import 'src/app/globals.css';

const meta: Meta<typeof ProfileCard> = {
  title: 'Discovery/ProfileCard',
  component: ProfileCard,
  args: {
    onCopyUsername: fn(),
    onTagClick: fn(),
    onLanguageClick: fn(),
    onCountryClick: fn(),
    onViewProfile: fn(),
    onReport: fn(),
    onBlock: fn(),
    onShare: fn(),
    onToggleSave: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-96 p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ProfileCard>;

export const ClipboardDenied: Story = {
  args: {
    profile: {
      id: 'clipboard',
      displayName: 'Clipboard fixture',
      discordUsername: 'clipboard.fixture',
      primaryLanguage: 'ja',
      targetLanguages: [],
      tags: [],
    },
  },
  play: async ({ canvasElement, args }) => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('Denied')) },
    });
    try {
      const canvas = within(canvasElement);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Copy username' }),
      );
      await expect(await canvas.findByRole('alert')).toHaveTextContent(
        'clipboard.fixture',
      );
      await expect(args.onCopyUsername).toHaveBeenCalledWith(
        'clipboard.fixture',
        'clipboard',
        undefined,
        false,
      );
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.resolve() },
      });
      await userEvent.click(
        canvas.getByRole('button', { name: 'Copy username' }),
      );
      await waitFor(() =>
        expect(canvas.queryByRole('alert')).not.toBeInTheDocument(),
      );
      await expect(args.onCopyUsername).toHaveBeenLastCalledWith(
        'clipboard.fixture',
        'clipboard',
        undefined,
        true,
      );
    } finally {
      if (original) Object.defineProperty(navigator, 'clipboard', original);
      else Reflect.deleteProperty(navigator, 'clipboard');
    }
  },
};

export const ClipboardUnavailable: Story = {
  args: ClipboardDenied.args,
  play: async ({ canvasElement, args }) => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    try {
      const canvas = within(canvasElement);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Copy username' }),
      );
      await expect(await canvas.findByRole('alert')).toHaveTextContent(
        'clipboard.fixture',
      );
      await userEvent.click(
        canvas.getByRole('button', { name: 'Copy username' }),
      );
      await waitFor(() => expect(args.onCopyUsername).toHaveBeenCalledTimes(2));
    } finally {
      if (original) Object.defineProperty(navigator, 'clipboard', original);
      else Reflect.deleteProperty(navigator, 'clipboard');
    }
  },
};

const longBio =
  'I am a graphic designer in Osaka looking for a patient partner to practice everyday English with. I can already read and write fairly well, but speaking still makes me nervous, so I would love someone who does not mind a few long pauses while I find the right words. In return I am happy to help with Japanese at any level.';

const createMockProfile = (t: ReturnType<typeof useTranslations>) =>
  ({
    id: '1',
    displayName: 'User 1',
    discordUsername: 'user1',
    avatarUrl: undefined,
    primaryLanguage: 'ja',
    primaryLanguageLevel: undefined,
    targetLanguages: [
      {
        language: 'en',
        level: Proficiency.ADVANCED,
      },
      {
        language: 'ko',
        level: Proficiency.BEGINNER,
      },
    ],
    about: longBio,
    tags: ['Anime', 'K-Pop', 'Gaming'],
    country: 'Japan',
    timezone: 'Asia/Tokyo',
    allowAnonymousCopy: true,
    lastBumpRelative: t('bumpTwoDays'),
    cardTheme: getFreeCardTheme(0),
  }) satisfies DiscoveryProfile;

type CardStoryProps = Omit<
  React.ComponentProps<typeof ProfileCard>,
  'profile'
> & {
  modify?: (profile: DiscoveryProfile) => DiscoveryProfile;
};

const CardStory = ({ modify, ...args }: CardStoryProps) => {
  const t = useTranslations('DiscoveryStories');
  const base = createMockProfile(t);
  return <ProfileCard {...args} profile={modify ? modify(base) : base} />;
};

const premiumTheme = (id: string) =>
  PREMIUM_CARD_THEMES.find((theme) => theme.id === id);

export const FreeSky: Story = {
  render: (args) => (
    <CardStory
      {...args}
      modify={(p) => ({ ...p, cardTheme: getFreeCardTheme(0) })}
    />
  ),
};

export const FreePink: Story = {
  render: (args) => (
    <CardStory
      {...args}
      modify={(p) => ({ ...p, cardTheme: getFreeCardTheme(1) })}
    />
  ),
};

export const FreeSlate: Story = {
  render: (args) => (
    <CardStory
      {...args}
      modify={(p) => ({ ...p, cardTheme: getFreeCardTheme(2) })}
    />
  ),
};

export const PremiumIndigo: Story = {
  render: (args) => (
    <CardStory
      {...args}
      modify={(p) => ({
        ...p,
        premium: true,
        cardTheme: premiumTheme('indigo'),
      })}
    />
  ),
};

export const PremiumGold: Story = {
  render: (args) => (
    <CardStory
      {...args}
      modify={(p) => ({ ...p, premium: true, cardTheme: premiumTheme('gold') })}
    />
  ),
};

export const PremiumDusk: Story = {
  render: (args) => (
    <CardStory
      {...args}
      modify={(p) => ({ ...p, premium: true, cardTheme: premiumTheme('dusk') })}
    />
  ),
};

export const LanguageOverflow: Story = {
  render: (args) => {
    const t = useTranslations('DiscoveryStories');
    const profile: DiscoveryProfile = {
      ...createMockProfile(t),
      targetLanguages: [
        { language: 'en', level: Proficiency.ADVANCED },
        { language: 'ko', level: Proficiency.BEGINNER },
        { language: 'fr', level: Proficiency.INTERMEDIATE },
        { language: 'es', level: Proficiency.BEGINNER },
      ],
    };
    return <ProfileCard {...args} profile={profile} />;
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(
      canvas.getByRole('button', { name: 'Show 3 more languages' }),
    );

    const hidden = await body.findByRole('button', { name: /^French/ });
    await userEvent.click(hidden);

    await expect(args.onLanguageClick).toHaveBeenCalledWith(
      'fr',
      Proficiency.INTERMEDIATE,
      false,
      '1',
    );
  },
};

export const TagOverflow: Story = {
  render: (args) => {
    const t = useTranslations('DiscoveryStories');
    const profile: DiscoveryProfile = {
      ...createMockProfile(t),
      tags: [
        'Anime',
        'K-Pop',
        'Gaming',
        'Cooking',
        'Travel',
        'Photography',
        'Hiking',
      ],
    };
    return <ProfileCard {...args} profile={profile} />;
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    const tags = [
      'Anime',
      'K-Pop',
      'Gaming',
      'Cooking',
      'Travel',
      'Photography',
      'Hiking',
    ];

    for (const tag of tags) {
      await expect(
        canvas.getByRole('button', { name: tag }),
      ).toBeInTheDocument();
    }

    await userEvent.click(canvas.getByRole('button', { name: 'Hiking' }));
    await expect(args.onTagClick).toHaveBeenCalledWith('Hiking', '1');
  },
};

export const LockedCopy: Story = {
  render: (args) => {
    const t = useTranslations('DiscoveryStories');
    const profile: DiscoveryProfile = {
      ...createMockProfile(t),
      allowAnonymousCopy: false,
    };
    return <ProfileCard {...args} profile={profile} isLoggedIn={false} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByText('Sign in to view username'),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByRole('button', { name: 'Copy username' }),
    ).not.toBeInTheDocument();
  },
};

export const LockedCopyLoggedIn: Story = {
  render: (args) => {
    const t = useTranslations('DiscoveryStories');
    const profile: DiscoveryProfile = {
      ...createMockProfile(t),
      allowAnonymousCopy: false,
    };
    return <ProfileCard {...args} profile={profile} isLoggedIn={true} />;
  },
};

export const LongBio: Story = {
  render: (args) => {
    const t = useTranslations('DiscoveryStories');
    return <ProfileCard {...args} profile={createMockProfile(t)} />;
  },
};

export const ShortBio: Story = {
  render: (args) => {
    const t = useTranslations('DiscoveryStories');
    const profile: DiscoveryProfile = {
      ...createMockProfile(t),
      about: 'Casual learner looking for a relaxed chat partner.',
    };
    return <ProfileCard {...args} profile={profile} />;
  },
};

export const CopyUsername: Story = {
  render: (args) => {
    const t = useTranslations('DiscoveryStories');
    return <ProfileCard {...args} profile={createMockProfile(t)} />;
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    const view = canvasElement.ownerDocument.defaultView as Window;
    Object.defineProperty(view.navigator, 'clipboard', {
      value: { writeText: async () => {} },
      configurable: true,
    });

    await userEvent.click(
      canvas.getByRole('button', { name: 'Copy username' }),
    );

    await waitFor(() =>
      expect(args.onCopyUsername).toHaveBeenCalledWith(
        'user1',
        '1',
        undefined,
        true,
      ),
    );
    await expect(canvas.getByText('Copied!')).toBeInTheDocument();
  },
};

export const OpensProfile: Story = {
  render: (args) => {
    const t = useTranslations('DiscoveryStories');
    return <ProfileCard {...args} profile={createMockProfile(t)} />;
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvasElement.querySelector('article') as HTMLElement;

    await userEvent.click(card);
    await expect(args.onViewProfile).toHaveBeenCalledWith('1');
    await userEvent.click(canvas.getByRole('button', { name: 'Card menu' }));
    await userEvent.keyboard('{Escape}');
    await userEvent.click(
      canvas.getByRole('button', { name: 'Copy username' }),
    );
    await expect(args.onViewProfile).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: 'User 1' }));
    await expect(args.onViewProfile).toHaveBeenCalledTimes(2);
  },
};
export const MobileOpensSheet: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  render: (args) => {
    const t = useTranslations('DiscoveryStories');
    return <ProfileCard {...args} profile={createMockProfile(t)} />;
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await expect(
      canvas.queryByRole('button', { name: 'Copy username' }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      canvasElement.querySelector('article') as HTMLElement,
    );
    const sheet = await body.findByRole('dialog', { name: 'User 1' });
    await expect(
      within(sheet).getByRole('button', { name: "Copy User 1's username" }),
    ).toBeInTheDocument();
    await expect(args.onViewProfile).not.toHaveBeenCalled();
    await userEvent.click(
      within(sheet).getByRole('button', { name: 'More actions' }),
    );
    await expect(
      await body.findByRole('button', { name: 'Report profile' }),
    ).toBeInTheDocument();
  },
};
export const SaveAction: Story = {
  render: (args) => {
    const t = useTranslations('DiscoveryStories');
    return <ProfileCard {...args} profile={createMockProfile(t)} />;
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(canvas.getByRole('button', { name: 'Card menu' }));
    await userEvent.click(
      await body.findByRole('button', { name: 'Save profile' }),
    );
    await expect(args.onToggleSave).toHaveBeenCalledWith('1');
  },
};

export const Saved: Story = {
  render: (args) => {
    const t = useTranslations('DiscoveryStories');
    return <ProfileCard {...args} profile={createMockProfile(t)} isSaved />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(canvas.getByRole('button', { name: 'Card menu' }));

    await expect(
      await body.findByRole('button', { name: 'Remove from saved' }),
    ).toBeInTheDocument();
  },
};

export const MenuActions: Story = {
  render: (args) => {
    const t = useTranslations('DiscoveryStories');
    return <ProfileCard {...args} profile={createMockProfile(t)} />;
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(canvas.getByRole('button', { name: 'Card menu' }));
    await userEvent.click(
      await body.findByRole('button', { name: 'Report profile' }),
    );
    await expect(args.onReport).toHaveBeenCalledWith('1');

    await userEvent.click(canvas.getByRole('button', { name: 'Card menu' }));
    await userEvent.click(
      await body.findByRole('button', { name: 'View profile' }),
    );
    await expect(args.onViewProfile).toHaveBeenCalledWith('1');
  },
};

export const MenuOpen: Story = {
  render: (args) => {
    const t = useTranslations('DiscoveryStories');
    return <ProfileCard {...args} profile={createMockProfile(t)} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(canvas.getByRole('button', { name: 'Card menu' }));

    await expect(
      await body.findByRole('button', { name: 'Block user' }),
    ).toBeInTheDocument();
  },
};
