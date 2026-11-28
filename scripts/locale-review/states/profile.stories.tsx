import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { BumpProfileError } from '@/features/Discovery/bumpProfileRequest';
import { BoostDialog } from '@/features/Profile/BoostDialog';
import { ProfileDetail } from '@/features/Profile/ProfileDetail';
import { ProfilePage } from '@/features/Profile/ProfilePage';
import pageMeta from '@/features/Profile/ProfilePage.stories';
import type { ProfileFormValues } from '@/features/Profile/schema';
import { VoiceIntroEditor } from '@/features/Profile/VoiceIntroEditor';
import { FieldValidationError } from '@/lib/formErrors';
import { mockFetch } from './mockFetch';

const meta = {
  title: 'Review/Profile',
  component: ProfilePage,
  parameters: pageMeta.parameters,
  decorators: pageMeta.decorators,
  args: pageMeta.args,
} satisfies Meta<typeof ProfilePage>;

export default meta;
type Story = StoryObj<typeof meta>;

const profile: ProfileFormValues = {
  primaryLanguage: 'ja',
  targetLanguages: [{ language: 'en', level: 'intermediate' }],
  country: 'JP',
  timezone: 'Asia/Tokyo',
  isPublic: true,
  allowAnonymousCopy: true,
  displayTimezone: true,
  displayAvailability: true,
  bio: 'I am a graphic designer in Osaka looking for a patient partner.',
  tags: ['Anime'],
};

const page = (
  values: Partial<ProfileFormValues>,
  args: Story['args'] = {},
): Story => ({
  args: {
    initialValues: { ...profile, ...values },
    onDeleteProfile: async () => {},
    ...args,
  },
});

export const Unlisted = page({ isPublic: false, country: '' });

export const MissingFields = page({ primaryLanguage: '', targetLanguages: [] });

export const InvalidFields = page({
  primaryLanguage: 'zz',
  targetLanguages: [{ language: 'zz', level: 'beginner' }],
  country: 'zz',
});

export const DuplicateLanguages = page({
  targetLanguages: [
    { language: 'en', level: 'beginner' },
    { language: 'en', level: 'beginner' },
  ],
});

export const TooManyLanguages = page(
  {
    targetLanguages: [
      'en',
      'ko',
      'fr',
      'de',
      'es',
      'it',
      'pt',
      'ru',
      'zh',
      'ar',
      'nl',
    ].map((language) => ({ language, level: 'beginner' })),
  },
  { premium: true },
);

export const LockedCard = page(
  {},
  {
    onSubmit: () => {
      throw new FieldValidationError([
        { path: ['discordCard'], message: 'discordCardPremium' },
      ]);
    },
  },
);

export const CoolingDown = page(
  {},
  {
    onBumpProfile: () => {},
    bumpReadyAt: new Date(Date.now() + 3600000).toISOString(),
  },
);

export const WeekendCard = page(
  {
    discordCard: 'metal',
    availability: { days: 'weekends', from: '09:00', to: '12:00' },
  },
  { premium: true },
);

export const Bumped = page({}, { onBumpProfile: () => {} });

export const BumpTooSoon = page(
  {},
  {
    onBumpProfile: async () => {
      throw new BumpProfileError('cooldown', 429, 3600000);
    },
  },
);

const boost = (props: Partial<Parameters<typeof BoostDialog>[0]>): Story => ({
  render: () => (
    <BoostDialog
      open
      onOpenChange={() => {}}
      active={false}
      remaining={3}
      boosting={false}
      error={null}
      onBoost={() => {}}
      {...props}
    />
  ),
});

export const BoostReady = boost({});
export const BoostLive = boost({
  active: true,
  remaining: 2,
  boostedUntil: new Date(Date.now() + 36000000).toISOString(),
  error: 'boostErrorActive',
});
export const BoostEmpty = boost({ remaining: 0, error: 'boostErrorNone' });

function Voice() {
  const [seconds, setSeconds] = useState(0);
  return (
    <div className="max-w-[460px] rounded-3xl bg-background-dark p-6">
      <VoiceIntroEditor premium voiceSeconds={seconds} onChange={setSeconds} />
    </div>
  );
}

const voice = (allowed: boolean): Story => ({
  render: () => <Voice />,
  beforeEach: () => {
    const { mediaDevices } = navigator;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => {
          if (!allowed) throw new Error('denied');
          return new AudioContext().createMediaStreamDestination().stream;
        },
      },
    });
    const restore = mockFetch(() => new Response('{}', { status: 500 }));
    return () => {
      restore();
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: mediaDevices,
      });
    };
  },
});

export const VoiceRecording = voice(true);
export const VoiceBlocked = voice(false);

const clock = (timezone: string): Story => ({
  render: () => (
    <ProfileDetail
      viewerTimezone="UTC"
      profile={{
        id: 'review',
        displayName: 'Yuki',
        primaryLanguage: 'ja',
        targetLanguages: [],
        tags: [],
        timezone,
      }}
      onCopyUsername={async () => true}
      onTagClick={() => {}}
      onLanguageClick={() => {}}
      onCountryClick={() => {}}
    />
  ),
});

export const SameTime = clock('UTC');
export const HoursBehind = clock('Pacific/Pago_Pago');
