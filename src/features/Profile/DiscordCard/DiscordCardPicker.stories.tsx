import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from '@storybook/test';
import { useState } from 'react';
import {
  DEFAULT_DISCORD_CARD,
  type DiscordCardLayout,
} from '@/constants/discordCards';
import { Proficiency } from '@/constants/languages';
import { DiscordCardPicker } from './DiscordCardPicker';
import { buildDiscordCardData } from './data';
import { ClassicCard } from './layouts/ClassicCard';
import { discordCardVars } from './theme';
import type { DiscordCardLayoutDefinition } from './types';

const layouts: DiscordCardLayoutDefinition[] = [
  { id: 'classic', labelKey: 'layoutClassic', component: ClassicCard },
  { id: 'rank', labelKey: 'layoutRank', component: ClassicCard },
  {
    id: 'exchange-pass',
    labelKey: 'layoutExchangePass',
    component: ClassicCard,
  },
];

const labels = {
  days: { any: 'Any day', weekdays: 'Weekdays', weekends: 'Weekends' },
  anyTime: 'Any time',
  levels: {
    [Proficiency.BEGINNER]: 'Beginner',
    [Proficiency.INTERMEDIATE]: 'Intermediate',
    [Proficiency.ADVANCED]: 'Advanced',
    [Proficiency.NATIVE_LEVEL]: 'Native-level',
  },
};

const buildData = (
  overrides: Partial<Parameters<typeof buildDiscordCardData>[0]> = {},
) =>
  buildDiscordCardData({
    name: 'Kenji Ito',
    handle: 'kenji',
    primaryLanguage: 'ja',
    targetLanguages: [
      { language: 'en', level: Proficiency.INTERMEDIATE },
      { language: 'ko', level: Proficiency.BEGINNER },
    ],
    tags: ['Anime', 'Cooking', 'Photography'],
    availability: { days: 'weekdays', from: '18:00', to: '22:00' },
    country: 'JP',
    time: '21:14',
    locale: 'en',
    labels,
    ...overrides,
  });

const SKY = discordCardVars('#c1d5e9', '#7a8a99');
const INDIGO = discordCardVars(
  'linear-gradient(115deg, #3a45ef, #5964f2 55%, #7883f5)',
  '#5964f2',
);

const PickerHarness = ({
  premium,
  initialValue,
  vars,
  error,
  data,
}: {
  premium: boolean;
  initialValue: DiscordCardLayout;
  vars: React.CSSProperties;
  error?: string;
  data: ReturnType<typeof buildData>;
}) => {
  const [value, setValue] = useState(initialValue);
  const [tease, setTease] = useState<DiscordCardLayout | null>(null);

  return (
    <div className="flex w-[720px] flex-col gap-4 rounded-3xl bg-background-dark p-6">
      <DiscordCardPicker
        value={value}
        onChange={setValue}
        premium={premium}
        tease={tease}
        onTease={setTease}
        data={data}
        vars={vars}
        error={error}
        layouts={layouts}
      />
      <output data-testid="saved-layout">{value}</output>
    </div>
  );
};

const meta: Meta<typeof PickerHarness> = {
  title: 'Features/Profile/DiscordCardPicker',
  component: PickerHarness,
  args: {
    premium: false,
    initialValue: DEFAULT_DISCORD_CARD,
    vars: SKY,
    data: buildData(),
  },
};

export default meta;
type Story = StoryObj<typeof PickerHarness>;

export const Free: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole('button', { name: 'Classic card' }),
    ).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(canvas.getByRole('button', { name: 'Rank card' }));

    await expect(
      canvas.getByRole('button', { name: 'Rank card' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas.getByTestId('saved-layout')).toHaveTextContent('rank');
  },
};

export const FreeTeasesLockedLayout: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Rank card' }));
    await userEvent.click(
      canvas.getByRole('button', { name: 'Exchange pass (Premium)' }),
    );

    await expect(
      await canvas.findByText(/layout is part of/),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole('img', { name: 'Exchange pass card preview' }),
    ).toBeInTheDocument();
    await expect(canvas.getByTestId('saved-layout')).toHaveTextContent('rank');

    await userEvent.click(
      canvas.getByRole('button', { name: 'Exchange pass (Premium)' }),
    );

    await waitFor(() =>
      expect(canvas.queryByText(/layout is part of/)).not.toBeInTheDocument(),
    );
    await expect(
      canvas.getByRole('img', { name: 'Rank card card preview' }),
    ).toBeInTheDocument();
  },
};

export const FreeWithLapsedPremiumLayout: Story = {
  args: { initialValue: 'exchange-pass' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole('img', { name: 'Classic card card preview' }),
    ).toBeInTheDocument();
    await expect(canvas.getByTestId('saved-layout')).toHaveTextContent(
      'exchange-pass',
    );
  },
};

export const Premium: Story = {
  args: { premium: true, vars: INDIGO },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByRole('button', { name: 'Exchange pass' }),
    );

    await expect(
      canvas.getByRole('button', { name: 'Exchange pass' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas.getByTestId('saved-layout')).toHaveTextContent(
      'exchange-pass',
    );
    await expect(
      canvas.queryByText(/layout is part of/),
    ).not.toBeInTheDocument();
  },
};

export const EdgeCases: Story = {
  args: {
    data: buildData({
      name: 'Alexandria Montgomery-Featherstonehaugh',
      handle: 'alexandria_montgomery_featherstonehaugh',
      targetLanguages: [
        { language: 'en', level: Proficiency.INTERMEDIATE },
        { language: 'ko', level: Proficiency.BEGINNER },
        { language: 'zh', level: Proficiency.ADVANCED },
      ],
      tags: [],
      availability: null,
      country: '',
      time: '',
    }),
  },
};

export const ServerError: Story = {
  args: { error: 'This card layout is part of Premium.' },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText('This card layout is part of Premium.'),
    ).toBeInTheDocument();
  },
};
