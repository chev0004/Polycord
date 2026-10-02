import type { Meta, StoryObj } from '@storybook/react';
import { expect, waitFor, within } from '@storybook/test';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import { Proficiency } from '@/constants/languages';
import en from '@/locales/en.json';
import ja from '@/locales/ja.json';
import { buildDiscordCardData } from './data';
import { DISCORD_CARD_LAYOUTS } from './registry';
import { ScaledDiscordCard } from './ScaledDiscordCard';
import { discordCardVars } from './theme';
import type { DiscordCardData } from './types';
import { useDiscordCardData } from './useDiscordCardData';

const labels = {
  days: { any: 'Any day', weekdays: 'Weekdays', weekends: 'Weekends' },
  daysShort: { any: 'Daily', weekdays: 'Wkdy', weekends: 'Wknd' },
  anyTime: 'Any time',
  levels: {
    [Proficiency.BEGINNER]: 'Beginner',
    [Proficiency.INTERMEDIATE]: 'Intermediate',
    [Proficiency.ADVANCED]: 'Advanced',
    [Proficiency.NATIVE_LEVEL]: 'Native-level',
  },
};

const profile = {
  name: 'Kenji Ito',
  handle: 'kenji',
  primaryLanguage: 'ja',
  targetLanguages: [
    { language: 'en', level: Proficiency.INTERMEDIATE },
    { language: 'ko', level: Proficiency.BEGINNER },
    { language: 'zh', level: Proficiency.ADVANCED },
  ],
  tags: ['Anime', 'Cooking', 'Photography', 'Travel'],
  availability: { days: 'weekdays', from: '18:00', to: '22:00' },
  country: 'JP',
} satisfies Parameters<typeof useDiscordCardData>[0];

const build = (
  overrides: Partial<Parameters<typeof buildDiscordCardData>[0]> = {},
) =>
  buildDiscordCardData({
    ...profile,
    time: '21:14',
    locale: 'en',
    labels,
    ...overrides,
  });

const themes = {
  sky: discordCardVars('#c1d5e9', '#7a8a99'),
  pink: discordCardVars('#f9a8cf', '#7a8a99'),
  slate: discordCardVars('#46525f', '#7a8a99'),
  indigo: discordCardVars(
    'linear-gradient(115deg, #3a45ef, #5964f2 55%, #7883f5)',
    '#5964f2',
  ),
};

const LayoutGallery = ({
  data,
  theme,
  active = 0,
}: {
  data: DiscordCardData;
  theme: keyof typeof themes;
  active?: number;
}) => (
  <div className="grid grid-cols-2 gap-6 bg-background-dark p-6">
    {DISCORD_CARD_LAYOUTS.map((layout) => (
      <figure key={layout.id} data-layout={layout.id} className="m-0">
        <figcaption className="mb-2 text-foreground text-sm">
          {layout.id}
        </figcaption>
        <ScaledDiscordCard
          layout={layout}
          data={data}
          vars={themes[theme]}
          active={active}
        />
      </figure>
    ))}
  </div>
);

const meta: Meta<typeof LayoutGallery> = {
  title: 'Features/Profile/DiscordCardLayouts',
  component: LayoutGallery,
  parameters: { layout: 'fullscreen' },
  args: { data: build(), theme: 'sky' },
};

export default meta;
type Story = StoryObj<typeof LayoutGallery>;

const expectEveryLayout = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);

  for (const layout of DISCORD_CARD_LAYOUTS) {
    const figure = canvasElement.querySelector(`[data-layout="${layout.id}"]`);
    await expect(figure).toBeInTheDocument();
    await expect(
      within(figure as HTMLElement).getAllByText(/Kenji Ito|Alexandria/).length,
    ).toBeGreaterThan(0);
  }
  await expect(canvas.getAllByRole('figure')).toHaveLength(
    DISCORD_CARD_LAYOUTS.length,
  );
};

export const Sky: Story = {
  play: ({ canvasElement }) => expectEveryLayout(canvasElement),
};

const LiveLayoutGallery = () => {
  const t = useTranslations('Profile');
  const data = useDiscordCardData(profile);

  return (
    <>
      <h2>{t('discordCardPreviewLabel')}</h2>
      <LayoutGallery data={data} theme="sky" />
    </>
  );
};

export const EnglishOnly: Story = {
  render: () => (
    <div className="grid grid-cols-2">
      {(['en', 'ja'] as const).map((locale) => (
        <section key={locale} data-locale={locale}>
          <NextIntlClientProvider
            locale={locale}
            messages={locale === 'en' ? en : ja}
          >
            <LiveLayoutGallery />
          </NextIntlClientProvider>
        </section>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const english = canvasElement.querySelector(
      '[data-locale="en"]',
    ) as HTMLElement;
    const japanese = canvasElement.querySelector(
      '[data-locale="ja"]',
    ) as HTMLElement;

    await expect(within(english).getByRole('heading')).toHaveTextContent(
      'Preview',
    );
    await expect(within(japanese).getByRole('heading')).toHaveTextContent(
      'プレビュー',
    );
    for (const section of [english, japanese]) {
      await expectEveryLayout(section);
      const classic = within(
        section.querySelector('[data-layout="classic"]') as HTMLElement,
      );
      for (const text of [
        'Japanese',
        '日本語',
        'English',
        '· Intermediate',
        'Weekdays',
        'Japan',
      ]) {
        await expect(classic.getByText(text)).toBeInTheDocument();
      }
      const greeting = within(
        section.querySelector('[data-layout="greeting"]') as HTMLElement,
      );
      await expect(greeting.getByText('こんにちは！')).toBeInTheDocument();
      await expect(greeting.getByText('안녕하세요!')).toBeInTheDocument();
    }
    for (const layout of DISCORD_CARD_LAYOUTS) {
      const selector = `[data-layout="${layout.id}"] .dc-root`;
      for (const section of [english, japanese]) {
        await waitFor(() =>
          expect(
            (section.querySelector(selector) as HTMLElement).style.transform,
          ).not.toBe('scale(0)'),
        );
      }
      await waitFor(() =>
        expect(japanese.querySelector(selector)?.textContent).toBe(
          english.querySelector(selector)?.textContent,
        ),
      );
    }
  },
};

export const Pink: Story = {
  args: { theme: 'pink' },
};

export const Slate: Story = {
  args: { theme: 'slate' },
};

export const Gradient: Story = {
  args: { theme: 'indigo' },
  play: async ({ canvasElement }) => {
    const bar = canvasElement.querySelector(
      '[data-layout="rank"] .dc-b3-seg',
    ) as HTMLElement;
    const fills = [...bar.children].map((segment) =>
      getComputedStyle(segment, '::after'),
    );

    for (const [index, fill] of fills.entries()) {
      await expect(Number.parseFloat(fill.backgroundSize)).toBeCloseTo(
        bar.offsetWidth,
        0,
      );
      await expect(Number.parseFloat(fill.backgroundPositionX)).toBeCloseTo(
        -index * (bar.offsetWidth / 4 + 1.5),
        0,
      );
    }

    const segment = bar.children[0] as HTMLElement;
    segment.style.setProperty('--d', '0s');
    segment.classList.remove('dc-on');
    getComputedStyle(segment, '::after').clipPath;
    const reveal = document
      .getAnimations()
      .find(
        (animation) =>
          (animation as CSSTransition).transitionProperty === 'clip-path',
      ) as CSSTransition;
    reveal.pause();
    reveal.currentTime = 160;

    const frame = getComputedStyle(segment, '::after');
    await expect(frame.clipPath).not.toBe('inset(0px)');
    await expect(frame.transform).toBe('none');
    await expect(Number.parseFloat(frame.backgroundSize)).toBeCloseTo(
      bar.offsetWidth,
      0,
    );
  },
};

export const SecondLanguage: Story = {
  args: { active: 1 },
  play: async ({ canvasElement }) => {
    const orbit = canvasElement.querySelector('[data-layout="orbit"]');
    const chip = within(orbit as HTMLElement).getByText('KO', {
      selector: '.dc-ob-c',
    });

    await expect(chip).toHaveStyle({ left: '594px' });
  },
};

export const LongName: Story = {
  args: {
    data: build({
      name: 'Alexandria Montgomery-Featherstonehaugh',
      handle: 'alexandria_montgomery_featherstonehaugh',
    }),
  },
  play: async ({ canvasElement }) => {
    await expectEveryLayout(canvasElement);
  },
};

export const MissingDetails: Story = {
  args: {
    data: build({
      tags: [],
      availability: null,
      country: '',
      time: '',
      targetLanguages: [{ language: 'en', level: Proficiency.BEGINNER }],
    }),
  },
  play: ({ canvasElement }) => expectEveryLayout(canvasElement),
};

export const WithAvatar: Story = {
  args: {
    data: build({
      avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png',
    }),
  },
};

export const SameNativeAndLearningScript: Story = {
  args: {
    data: build({
      primaryLanguage: 'en',
      targetLanguages: [{ language: 'es', level: Proficiency.NATIVE_LEVEL }],
    }),
  },
};

export const LongLanguageNames: Story = {
  args: {
    data: build({
      primaryLanguage: 'nb',
      targetLanguages: [{ language: 'cu', level: Proficiency.INTERMEDIATE }],
    }),
  },
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector('[data-layout="split-flap"]');
    const column = card?.querySelector('.dc-sf-b') as HTMLElement;
    const rows = card?.querySelectorAll<HTMLElement>('.dc-sf-c') ?? [];

    await expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const label = row.previousElementSibling as HTMLElement | null;
      await expect(
        row.offsetWidth + (label?.offsetWidth ?? 0),
      ).toBeLessThanOrEqual(column.clientWidth);
    }
  },
};

const activeTarget = (card: Element | null) =>
  card?.querySelector('.dc-cy > .dc-on')?.textContent ?? '';

export const CyclesThroughLanguages: Story = {
  render: ({ data, theme }) => (
    <div className="max-w-md p-6">
      {DISCORD_CARD_LAYOUTS.filter(({ id }) =>
        ['classic', 'bleed', 'watermark'].includes(id),
      ).map((layout) => (
        <figure key={layout.id} data-layout={layout.id} className="m-0 mb-6">
          <ScaledDiscordCard layout={layout} data={data} vars={themes[theme]} />
        </figure>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const cards = ['classic', 'bleed', 'watermark'].map((id) =>
      canvasElement.querySelector(`[data-layout="${id}"]`),
    );

    for (const card of cards) {
      await expect(activeTarget(card)).toContain('English');
    }
    for (const card of cards) {
      await waitFor(() => expect(activeTarget(card)).toContain('Korean'), {
        timeout: 6000,
      });
    }
  },
};

export const ClassicPillFitsActiveLanguage: Story = {
  args: {
    data: build({
      targetLanguages: [
        { language: 'en', level: Proficiency.INTERMEDIATE },
        { language: 'sw', level: Proficiency.ADVANCED },
        { language: 'ko' },
      ],
    }),
  },
  render: ({ data, theme }) => (
    <div className="max-w-md p-6">
      <ScaledDiscordCard
        layout={DISCORD_CARD_LAYOUTS[0]}
        data={data}
        vars={themes[theme]}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await canvasElement.ownerDocument.fonts.ready;
    const pill = canvasElement.querySelector(
      '.dc-a .dc-pill:not(.dc-pri)',
    ) as HTMLElement;
    const widths: number[] = [];

    for (const label of [
      'English· Intermediate',
      'Swahili· Advanced',
      'Korean',
      'English· Intermediate',
    ]) {
      await waitFor(
        () => expect(pill.querySelector('.dc-on')).toHaveTextContent(label),
        { timeout: 6000 },
      );
      const text = canvasElement.ownerDocument.createRange();
      text.selectNodeContents(pill.querySelector('.dc-on') as HTMLElement);
      const box = pill.getBoundingClientRect();
      const content = text.getBoundingClientRect();
      const scale = box.width / pill.offsetWidth;
      const style = getComputedStyle(pill);

      await expect(
        Math.abs(
          content.left -
            box.left -
            Number.parseFloat(style.paddingLeft) * scale,
        ),
      ).toBeLessThan(1);
      await expect(
        Math.abs(
          box.right -
            content.right -
            Number.parseFloat(style.paddingRight) * scale,
        ),
      ).toBeLessThan(1);
      widths.push(box.width);
    }

    await expect(widths[1]).toBeLessThan(widths[0]);
    await expect(widths[2]).toBeLessThan(widths[1]);
    await expect(widths[3]).toBeCloseTo(widths[0], 0);
  },
};
