import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, waitFor, within } from '@storybook/test';
import { useTranslations } from 'next-intl';
import { Proficiency } from '@/constants';
import {
  type CardTheme,
  getCustomCardTheme,
  getFreeCardTheme,
  PREMIUM_CARD_THEMES,
} from './cardTheme';
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

export const Dummy: Story = {
  render: (args) => (
    <CardStory {...args} modify={(p) => ({ ...p, synthetic: true })} />
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Dummy')).toBeInTheDocument();
  },
};

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

export const SupporterIndigo: Story = {
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

export const SupporterGold: Story = {
  render: (args) => (
    <CardStory
      {...args}
      modify={(p) => ({ ...p, premium: true, cardTheme: premiumTheme('gold') })}
    />
  ),
};

export const SupporterDusk: Story = {
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

const overflowStory = (
  cardTheme: CardTheme | undefined,
  premium: boolean,
  variant?: 'preview',
): Story => ({
  args: { variant },
  render: (args) => (
    <CardStory
      {...args}
      modify={(p) => ({
        ...p,
        premium,
        cardTheme,
        targetLanguages: [
          { language: 'en', level: Proficiency.ADVANCED },
          { language: 'ko', level: Proficiency.BEGINNER },
          { language: 'fr', level: Proficiency.INTERMEDIATE },
          { language: 'es', level: Proficiency.BEGINNER },
        ],
      })}
    />
  ),
  play: async ({ canvasElement }) => {
    const card = getComputedStyle(
      canvasElement.querySelector('article') as HTMLElement,
    );
    const trigger = within(canvasElement).getByRole('button', {
      name: /^Show \d more languages$/,
    });
    await userEvent.click(trigger);
    const popover = getComputedStyle(
      await waitFor(() => {
        const content =
          canvasElement.ownerDocument.querySelector<HTMLElement>(
            '.PopoverContent',
          );
        if (!content) throw new Error('Language popover did not open');
        return content;
      }),
    );

    await expect(popover.backgroundImage).toBe(card.backgroundImage);
    await expect(popover.backgroundColor).toBe(card.backgroundColor);
    await expect(getComputedStyle(trigger).backgroundImage).toBe('none');
  },
});

export const LanguageOverflowFreeSky = overflowStory(
  getFreeCardTheme(0),
  false,
);
export const LanguageOverflowFreePink = overflowStory(
  getFreeCardTheme(1),
  false,
);
export const LanguageOverflowFreeSlate = overflowStory(
  getFreeCardTheme(2),
  false,
);
export const LanguageOverflowSupporterFlat = overflowStory(
  premiumTheme('blue'),
  true,
);
export const LanguageOverflowSupporterGradient = overflowStory(
  premiumTheme('indigo'),
  true,
);
export const LanguageOverflowSupporterCustom = overflowStory(
  getCustomCardTheme({ from: '#e0457b', to: '#f7b267' }),
  true,
);
export const LanguageOverflowSupporterPreview = overflowStory(
  getCustomCardTheme({ from: '#e0457b', to: '#f7b267' }),
  true,
  'preview',
);

const overflowScrollStory = (nested: boolean): Story => ({
  render: (args) => (
    <div
      data-testid="scroll-container"
      className={nested ? 'h-[400px] overflow-y-auto' : undefined}
    >
      <div className="min-h-[200vh]">
        <CardStory {...args} />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const scroller = canvas.getByTestId('scroll-container');
    const trigger = canvas.getByRole('button', {
      name: 'Show 1 more languages',
    });
    const top = nested ? scroller.getBoundingClientRect().top : 0;
    const scroll = (value: number) =>
      (nested ? scroller : window).scrollTo(0, value);
    const partial =
      trigger.getBoundingClientRect().bottom - top - trigger.offsetHeight / 2;
    const hidden = Math.ceil(partial + trigger.offsetHeight + 50);
    await userEvent.click(trigger);
    await body.findByRole('dialog');
    scroll(partial);
    await waitFor(() => {
      expect(trigger.getBoundingClientRect().bottom).toBeGreaterThan(top);
      expect(trigger.getBoundingClientRect().top).toBeLessThan(top);
    });
    await expect(body.getByRole('dialog')).toBeInTheDocument();
    scroll(hidden);
    await waitFor(() =>
      expect(body.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await expect(nested ? scroller.scrollTop : window.scrollY).toBeCloseTo(
      hidden,
      0,
    );
    scroll(0);
    await waitFor(() =>
      expect(nested ? scroller.scrollTop : window.scrollY).toBe(0),
    );
    await expect(body.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(trigger);
    await body.findByRole('dialog');
    await userEvent.click(trigger);
    await waitFor(() =>
      expect(body.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await userEvent.click(trigger);
    await body.findByRole('dialog');
    await userEvent.click(canvasElement);
    await waitFor(() =>
      expect(body.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  },
});

export const LanguageOverflowViewportScroll = overflowScrollStory(false);
export const LanguageOverflowContainerScroll = overflowScrollStory(true);
export const MobileLanguageOverflowViewportScroll: Story = {
  ...LanguageOverflowViewportScroll,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
export const MobileLanguageOverflowContainerScroll: Story = {
  ...LanguageOverflowContainerScroll,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
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

export const CountryName: Story = {
  render: (args) => {
    const t = useTranslations('DiscoveryStories');
    const profile: DiscoveryProfile = {
      ...createMockProfile(t),
      country: 'KR',
      timezone: undefined,
    };
    return <ProfileCard {...args} profile={profile} />;
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Korea' }));

    await expect(canvas.queryByText('KR')).not.toBeInTheDocument();
    await expect(args.onCountryClick).toHaveBeenCalledWith('KR', '1');
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
const copyInMobileSheet =
  (label: string): Story['play'] =>
  async ({ canvasElement }) => {
    const view = canvasElement.ownerDocument.defaultView as Window;
    Object.defineProperty(view.navigator, 'clipboard', {
      value: { writeText: async () => {} },
      configurable: true,
    });
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(
      canvasElement.querySelector('article') as HTMLElement,
    );
    const sheet = await body.findByRole('dialog', { name: 'User 1' });
    await userEvent.click(
      within(sheet).getByRole('button', { name: /User 1/ }),
    );
    const copied = await within(sheet).findByText(label);
    await waitFor(() => {
      expect(copied.clientWidth).toBeGreaterThan(0);
      expect(copied.scrollWidth).toBeLessThanOrEqual(copied.clientWidth);
    });
  };

export const MobileSheetCopied: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  render: (args) => <CardStory {...args} />,
  play: copyInMobileSheet('Copied!'),
};

export const MobileSheetCopiedJapanese: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  globals: { locale: 'ja' },
  render: (args) => <CardStory {...args} />,
  play: copyInMobileSheet('コピーしました！'),
};

export const MobileSheet: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  render: (args) => <CardStory {...args} />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(
      canvasElement.querySelector('article') as HTMLElement,
    );
    const sheet = await body.findByRole('dialog', { name: 'User 1' });
    await expect(
      within(sheet).getByRole('button', { name: "Copy User 1's username" }),
    ).toBeInTheDocument();
    await expect(
      within(sheet).queryByText('Tap the name to copy their Discord username'),
    ).not.toBeInTheDocument();
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
