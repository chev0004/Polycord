import type { Meta, StoryObj } from '@storybook/react';
import {
  expect,
  fireEvent,
  fn,
  screen,
  userEvent,
  waitFor,
  within,
} from '@storybook/test';
import { DEFAULT_DISCORD_CARD } from '@/constants/discordCards';
import { MOCK_USER_AVATAR_URL } from '@/constants/mock-data';
import { DEFAULT_CARD_COLOR } from '@/features/Discovery/cardTheme';
import { clips, stubPlayback } from '@/features/Discovery/voicePlaybackStub';
import { AppShell } from '@/features/Navigation/AppShell';
import { RouteProgressProvider } from '@/features/Navigation/RouteProgress';
import { FieldValidationError } from '@/lib/formErrors';
import { ProfilePage } from './ProfilePage';
import type { ProfileFormValues } from './schema';

const meta: Meta<typeof ProfilePage> = {
  title: 'Features/Profile/ProfilePage',
  component: ProfilePage,
  parameters: {
    layout: 'fullscreen',
    nextjs: { appDirectory: true },
  },
  decorators: [
    (Story) => (
      <RouteProgressProvider>
        <div className="min-h-screen bg-background-main">
          <Story />
        </div>
      </RouteProgressProvider>
    ),
  ],
  args: {
    onSubmit: fn(),
    userDisplayName: 'Kenji Ito',
  },
};

export default meta;
type Story = StoryObj<typeof ProfilePage>;

const sampleProfile: ProfileFormValues = {
  primaryLanguage: 'ja',
  targetLanguages: [{ language: 'en', level: 'intermediate' }],
  country: 'JP',
  timezone: 'Asia/Tokyo',
  isPublic: true,
  allowAnonymousCopy: true,
  displayTimezone: true,
  displayAvailability: true,
  availability: { days: 'weekdays', from: '06:00', to: '09:00' },
  bio: 'I am a graphic designer in Osaka looking for a patient partner to practice everyday English with.',
  tags: ['Anime', 'Cooking', 'Photography'],
  cardColor: DEFAULT_CARD_COLOR,
  discordCard: DEFAULT_DISCORD_CARD,
  voiceIntroSeconds: 0,
};

const twoLanguages = [
  { language: 'en', level: 'intermediate' },
  { language: 'ko', level: 'beginner' },
];

const premiumLanguages = [
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
].map((language) => ({ language, level: 'beginner' }));

const setFieldValue = (
  field: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) => {
  const prototype =
    field instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(field, value);
  field.dispatchEvent(new Event('input', { bubbles: true }));
};

const selectTimezone = async (
  input: HTMLInputElement,
  query: string,
  option: RegExp,
) => {
  setFieldValue(input, query);
  fireEvent.mouseDown(await screen.findByRole('option', { name: option }));
};

const addTag = async (canvas: ReturnType<typeof within>, value: string) => {
  const input = canvas.getByPlaceholderText(
    'Type a tag and press Enter',
  ) as HTMLInputElement;
  setFieldValue(input, value);
  await waitFor(() => expect(input).toHaveValue(value));
  fireEvent.click(canvas.getByRole('button', { name: 'Add Tag' }));
};

export const Default: Story = {
  args: {
    onBumpProfile: fn(),
    onViewPublicProfile: fn(),
    onDeleteProfile: fn(),
  },
};

export const WithProfile: Story = {
  args: {
    initialValues: sampleProfile,
    onBumpProfile: fn(),
    onViewPublicProfile: fn(),
    onDeleteProfile: fn(),
  },
};

export const PremiumInsights: Story = {
  args: {
    initialValues: sampleProfile,
    premium: true,
    stats: { views30d: 12, copies30d: 5, shares30d: 3, saves: 7 },
    onBumpProfile: fn(),
    onViewPublicProfile: fn(),
    onDeleteProfile: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const [label, value] of [
      ['Views (30d)', '12'],
      ['Copies (30d)', '5'],
      ['Shares (30d)', '3'],
      ['Saves', '7'],
    ]) {
      await expect(
        canvas.getByText(label).previousElementSibling,
      ).toHaveTextContent(value);
    }
  },
};

export const DiscordCardSection: Story = {
  args: { initialValues: sampleProfile },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const cardStyle = canvas.getByRole('heading', { name: 'Card Style' });
    const discordCard = canvas.getByRole('heading', { name: 'Discord Card' });
    await expect(
      cardStyle.compareDocumentPosition(discordCard) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    await expect(
      canvas.getByRole('button', { name: 'Classic card' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      canvas.getByRole('img', { name: 'Classic card card preview' }),
    ).toBeInTheDocument();
  },
};

export const OptionsMenuTransition: Story = {
  args: {
    initialValues: sampleProfile,
    onBumpProfile: fn(),
    onViewPublicProfile: fn(),
    onDeleteProfile: fn(),
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: 'Profile options' }),
    );
    const menu = (
      await screen.findByRole('button', { name: 'View public profile' })
    ).closest('.PopoverContent') as HTMLElement;
    await expect(getComputedStyle(menu).animationName).toBe('slideUpAndFade');
  },
};

export const LastBump: Story = {
  args: {
    initialValues: sampleProfile,
    lastBumpedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('2 hours ago')).toBeInTheDocument();
    await expect(canvas.queryByText('just now')).not.toBeInTheDocument();
  },
};

export const NeverBumped: Story = {
  args: { initialValues: sampleProfile },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('Copy username');
    await expect(canvas.queryByText('just now')).not.toBeInTheDocument();
  },
};

export const RestoredDraft: Story = {
  args: { initialValues: sampleProfile, userId: 'profile-draft-story' },
  loaders: [
    async () => {
      sessionStorage.setItem(
        'polycord:profile:profile-draft-story',
        JSON.stringify({
          bio: 'Recovered edits for my next language exchange.',
        }),
      );
      return {};
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByLabelText('Bio')).toHaveValue(
        'Recovered edits for my next language exchange.',
      ),
    );
    await expect(
      canvas.getByText(
        'Your unsaved draft has been restored. Review it, then Save or Discard.',
      ),
    ).toBeInTheDocument();
  },
};

export const UnsavedEditsWithoutTopWarning: Story = {
  args: { initialValues: sampleProfile, userId: 'profile-unsaved-story' },
  loaders: [
    async () => {
      sessionStorage.removeItem('polycord:profile:profile-unsaved-story');
      return {};
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bio = (await canvas.findByLabelText('Bio')) as HTMLTextAreaElement;

    setFieldValue(bio, 'Fresh edits that are not saved yet.');

    await canvas.findByText('You have unsaved changes');
    await expect(
      canvas.queryByText(/Unsaved edits are kept for this account/),
    ).not.toBeInTheDocument();
  },
};

export const HiddenTimezone: Story = {
  args: { initialValues: { ...sampleProfile, displayTimezone: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(
        (canvas.getByLabelText('Timezone') as HTMLInputElement).value,
      ).toMatch(/Asia\/Tokyo$/),
    );
  },
};

export const LivePreviewUpdates: Story = {
  args: {
    initialValues: {
      ...sampleProfile,
      tags: [],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const updatedBio =
      'I want relaxed evening chats about design, food, and Japanese idioms.';
    const bio = canvas.getByLabelText('Bio') as HTMLTextAreaElement;

    setFieldValue(bio, updatedBio);

    await waitFor(() =>
      expect(canvas.getByText(updatedBio)).toBeInTheDocument(),
    );

    await addTag(canvas, 'Gardening');

    await waitFor(() =>
      expect(canvas.getAllByText('Gardening').length).toBeGreaterThanOrEqual(2),
    );
  },
};

export const EmptyPreview: Story = {
  args: {
    initialValues: {
      ...sampleProfile,
      primaryLanguage: '',
      targetLanguages: [{ language: '', level: '' }],
      country: '',
      timezone: '',
      displayTimezone: false,
      availability: null,
      bio: '',
      tags: [],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByText('Your bio preview will appear here.'),
    ).toBeInTheDocument();
    await expect(canvas.getByText('No tags yet')).toBeInTheDocument();
    await expect(canvas.getByText('Primary')).toBeInTheDocument();
  },
};

export const TimezoneRequiredForFreeTime: Story = {
  args: { initialValues: { ...sampleProfile, timezone: '' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const timezone = canvas.getByLabelText('Timezone') as HTMLInputElement;
    const toggle = canvas.getByRole('switch', { name: 'Free Time' });
    await expect(timezone).toHaveValue('');
    await expect(toggle).toBeDisabled();
    await selectTimezone(timezone, 'Tokyo', /Asia\/Tokyo$/);
    await waitFor(() => expect(toggle).toBeEnabled());
    await expect(canvas.getByLabelText('From')).toBeEnabled();
    setFieldValue(timezone, '');
    await waitFor(() => expect(toggle).toBeDisabled());
    await expect(timezone).toHaveValue('');
    await expect(canvas.getByLabelText('From')).toBeDisabled();
  },
};

export const TimezoneSearch: Story = {
  args: { initialValues: { ...sampleProfile, timezone: '' } },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const timezone = canvas.getByLabelText('Timezone') as HTMLInputElement;

    setFieldValue(timezone, 'Not a timezone');
    await expect(
      await screen.findByText(/^No results found/),
    ).toBeInTheDocument();
    fireEvent.focusOut(timezone);
    await waitFor(() => expect(timezone).toHaveValue(''));

    await selectTimezone(timezone, 'new york', /America\/New_York$/);
    await waitFor(() => expect(timezone.value).toMatch(/America\/New_York$/));
    await selectTimezone(timezone, 'Asia/Tokyo', /Asia\/Tokyo$/);
    await waitFor(() => expect(timezone.value).toMatch(/Asia\/Tokyo$/));

    fireEvent.click(canvas.getByRole('button', { name: 'Save Profile' }));
    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ timezone: 'Asia/Tokyo' }),
      ),
    );
  },
};

export const CreateModeDetectedTimezone: Story = {
  args: { mode: 'create', userId: 'create-mode-timezone-story' },
  beforeEach: () => {
    const { resolvedOptions } = Intl.DateTimeFormat.prototype;
    Intl.DateTimeFormat.prototype.resolvedOptions = function () {
      return { ...resolvedOptions.call(this), timeZone: 'Asia/Tokyo' };
    };
    return () => {
      Intl.DateTimeFormat.prototype.resolvedOptions = resolvedOptions;
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const timezone = canvas.getByLabelText('Timezone') as HTMLInputElement;

    await waitFor(() => expect(timezone.value).toMatch(/Asia\/Tokyo$/));
    await expect(
      canvas.queryByRole('button', { name: 'Publish profile' }),
    ).not.toBeInTheDocument();
  },
};

export const AddLanguage: Story = {
  args: {
    premium: false,
    initialValues: sampleProfile,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getAllByRole('button', { name: 'Remove language' }),
    ).toHaveLength(1);
    await expect(canvas.getByText('1/2 languages')).toBeInTheDocument();

    fireEvent.click(canvas.getByRole('button', { name: 'Add a language' }));

    await waitFor(() =>
      expect(
        canvas.getAllByRole('button', { name: 'Remove language' }),
      ).toHaveLength(2),
    );
    await expect(canvas.getByText('2/2 languages')).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'Add a language' }),
    ).toBeDisabled();
  },
};

export const RemoveLanguage: Story = {
  args: {
    premium: true,
    initialValues: {
      ...sampleProfile,
      targetLanguages: twoLanguages,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const removeButtons = canvas.getAllByRole('button', {
      name: 'Remove language',
    });
    await expect(removeButtons).toHaveLength(2);

    fireEvent.click(removeButtons[1]);

    await waitFor(() =>
      expect(
        canvas.getAllByRole('button', { name: 'Remove language' }),
      ).toHaveLength(1),
    );
    await expect(
      canvas.getByRole('button', { name: 'Remove language' }),
    ).toBeDisabled();
  },
};

export const FreeLanguageCap: Story = {
  args: {
    premium: false,
    initialValues: {
      ...sampleProfile,
      targetLanguages: twoLanguages,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('2/2 languages')).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'Add a language' }),
    ).toBeDisabled();
    await expect(
      canvas.getByText(/reached the free limit of 2 languages/),
    ).toBeInTheDocument();
  },
};

export const PremiumLanguageCap: Story = {
  args: {
    premium: true,
    initialValues: {
      ...sampleProfile,
      targetLanguages: premiumLanguages,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('10/10 languages')).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'Add a language' }),
    ).toBeDisabled();
    expect(
      canvas.queryByText(/reached the free limit/),
    ).not.toBeInTheDocument();
  },
};

export const FreeTagCap: Story = {
  args: {
    premium: false,
    initialValues: {
      ...sampleProfile,
      tags: ['Anime', 'Cooking', 'Photography', 'Travel', 'Music'],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText(/5\/5 tags/)).toBeInTheDocument();
    await expect(
      canvas.getByText(/Premium members can add up to/),
    ).toBeInTheDocument();

    await addTag(canvas, 'Gaming');

    await waitFor(
      () =>
        expect(
          canvas.getByText('You can add up to 5 tags on your current plan.'),
        ).toBeInTheDocument(),
      { timeout: 5000 },
    );
  },
};

export const PremiumTagCap: Story = {
  args: {
    premium: true,
    initialValues: {
      ...sampleProfile,
      tags: [
        'Anime',
        'Cooking',
        'Photography',
        'Travel',
        'Music',
        'Gaming',
        'Cinema',
        'Hiking',
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText(/8\/8 tags/)).toBeInTheDocument();
    expect(
      canvas.queryByText(/Premium members can add up to/),
    ).not.toBeInTheDocument();
  },
};

export const ValidationErrors: Story = {
  args: {
    initialValues: sampleProfile,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await addTag(canvas, 'a');
    await waitFor(
      () =>
        expect(
          canvas.getByText('Tags must be at least 2 characters.'),
        ).toBeInTheDocument(),
      { timeout: 5000 },
    );
    const tagInput = canvas.getByPlaceholderText('Type a tag and press Enter');
    await expect(tagInput).toHaveAttribute('aria-invalid', 'true');
    await expect(tagInput).toHaveAccessibleDescription(
      'Tags must be at least 2 characters.',
    );

    await addTag(canvas, 'anime');
    await waitFor(
      () =>
        expect(
          canvas.getByText('This tag has already been added.'),
        ).toBeInTheDocument(),
      { timeout: 5000 },
    );
  },
};

export const ServerFieldErrors: Story = {
  args: {
    initialValues: sampleProfile,
    onSubmit: fn(async () => {
      throw new FieldValidationError([
        { path: ['bio'], message: 'bioTooShort' },
        { path: ['tags'], message: 'maxTags' },
      ]);
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const bio = canvas.getByLabelText('Bio') as HTMLTextAreaElement;
    setFieldValue(bio, `${sampleProfile.bio} Updated for the server check.`);
    await canvas.findByText('You have unsaved changes');

    fireEvent.click(canvas.getByRole('button', { name: 'Save Profile' }));

    await waitFor(() =>
      expect(bio).toHaveAccessibleDescription(
        'Please enter at least 10 characters for your bio.',
      ),
    );
    await expect(bio).toHaveAttribute('aria-invalid', 'true');
    await expect(
      canvas.getByPlaceholderText('Type a tag and press Enter'),
    ).toHaveAccessibleDescription(
      'You can add up to 5 tags on your current plan.',
    );
    await expect(
      canvas.queryByText('Profile could not be saved. Please try again.'),
    ).not.toBeInTheDocument();
  },
};

export const SaveError: Story = {
  args: {
    initialValues: sampleProfile,
    onSubmit: fn(async () => {
      throw new Error('save failed');
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const bio = canvas.getByLabelText('Bio') as HTMLTextAreaElement;
    setFieldValue(bio, `${sampleProfile.bio} Updated for the error path.`);

    await waitFor(
      () =>
        expect(
          canvas.getByText('You have unsaved changes'),
        ).toBeInTheDocument(),
      { timeout: 5000 },
    );

    fireEvent.click(canvas.getByRole('button', { name: 'Save Profile' }));

    await waitFor(
      () =>
        expect(
          canvas.getByText('Profile could not be saved. Please try again.'),
        ).toBeInTheDocument(),
      { timeout: 5000 },
    );
    await expect(
      canvas.getByText('You have unsaved changes'),
    ).toBeInTheDocument();
  },
};

export const DirtySaveFlow: Story = {
  args: {
    initialValues: sampleProfile,
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.queryByRole('button', { name: 'Save Profile' }),
    ).not.toBeInTheDocument();

    const bio = canvas.getByLabelText('Bio') as HTMLTextAreaElement;
    setFieldValue(
      bio,
      `${sampleProfile.bio} I can help with Japanese in return.`,
    );

    await waitFor(
      () =>
        expect(
          canvas.getByText('You have unsaved changes'),
        ).toBeInTheDocument(),
      { timeout: 5000 },
    );
    const saveButton = canvas.getByRole('button', { name: 'Save Profile' });
    await expect(saveButton).toBeEnabled();

    fireEvent.click(saveButton);

    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledTimes(1), {
      timeout: 5000,
    });
    await waitFor(
      () =>
        expect(
          canvas.queryByRole('button', { name: 'Save Profile' }),
        ).not.toBeInTheDocument(),
      { timeout: 5000 },
    );

    setFieldValue(bio, `${sampleProfile.bio} Weekends work best for me.`);
    await expect(
      await canvas.findByRole('button', { name: 'Save Profile' }),
    ).toBeEnabled();
  },
};

export const DiscardAndRevert: Story = {
  args: {
    initialValues: sampleProfile,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bio = canvas.getByLabelText('Bio') as HTMLTextAreaElement;
    const expectBarHidden = () =>
      waitFor(
        () =>
          expect(
            canvas.queryByRole('button', { name: 'Discard' }),
          ).not.toBeInTheDocument(),
        { timeout: 5000 },
      );
    const expectBarShown = () =>
      waitFor(
        () =>
          expect(
            canvas.getByRole('button', { name: 'Discard' }),
          ).toBeInTheDocument(),
        { timeout: 5000 },
      );

    setFieldValue(bio, `${sampleProfile.bio} Discard me.`);
    await expectBarShown();
    fireEvent.click(canvas.getByRole('button', { name: 'Discard' }));
    await expectBarHidden();
    await expect(bio).toHaveValue(sampleProfile.bio);

    setFieldValue(bio, `${sampleProfile.bio} Revert me.`);
    await expectBarShown();
    setFieldValue(bio, sampleProfile.bio);
    await expectBarHidden();
  },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  args: { initialValues: sampleProfile },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    fireEvent.click(await canvas.findByRole('button', { name: /^Native/ }));
    const sheet = within(await screen.findByRole('dialog'));
    fireEvent.click(sheet.getByRole('button', { name: 'Advanced' }));
    fireEvent.click(sheet.getByRole('button', { name: 'Done' }));
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: /^English/ }),
      ).toHaveTextContent('Advanced'),
    );
    fireEvent.click(canvas.getByRole('button', { name: 'Preview' }));
    const preview = (await canvas.findByText('Copy username')).closest(
      'article',
    ) as HTMLElement;
    await expect(within(preview).getByText(/\/ Advanced$/)).toBeInTheDocument();
    fireEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          targetLanguages: [{ language: 'en', level: 'advanced' }],
        }),
      ),
    );
  },
};

export const MobileDockBump: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    nextjs: { appDirectory: true, navigation: { pathname: '/en/profile' } },
  },
  args: { initialValues: sampleProfile, onBumpProfile: fn() },
  render: (args) => (
    <AppShell locale="en" isLoggedIn userAvatarUrl={MOCK_USER_AVATAR_URL}>
      <ProfilePage {...args} />
    </AppShell>
  ),
  play: async ({ args }) => {
    fireEvent.click(await screen.findByRole('button', { name: 'Your Card' }));
    const menu = within(
      await screen.findByRole('dialog', { name: 'Your Card' }),
    );
    fireEvent.click(menu.getByRole('button', { name: 'Bump profile' }));
    await waitFor(() => expect(args.onBumpProfile).toHaveBeenCalledOnce());
  },
};

export const CreateMode: Story = {
  args: { mode: 'create', userId: 'create-mode-story' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByText('Create your language profile'),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByRole('button', { name: 'Profile options' }),
    ).not.toBeInTheDocument();

    await expect(
      canvas.queryByRole('button', { name: 'Publish profile' }),
    ).not.toBeInTheDocument();

    const bio = canvas.getByLabelText('Bio') as HTMLTextAreaElement;
    setFieldValue(bio, sampleProfile.bio);

    await expect(
      await canvas.findByRole('button', { name: 'Publish profile' }),
    ).toBeEnabled();
  },
};

export const CreateModeMobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  args: { mode: 'create', userId: 'create-mode-mobile-story' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.queryByRole('button', { name: 'Profile options' }),
    ).not.toBeInTheDocument();

    const bio = canvas.getByLabelText('Bio') as HTMLTextAreaElement;
    setFieldValue(bio, sampleProfile.bio);

    await expect(
      await canvas.findByRole('button', { name: 'Publish' }),
    ).toBeInTheDocument();
  },
};

export const PreviewVoicePlayback: Story = {
  args: {
    premium: true,
    profileId: 'voice-preview-story',
    initialValues: { ...sampleProfile, voiceIntroSeconds: 8 },
  },
  beforeEach: stubPlayback(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    fireEvent.click(
      await canvas.findByRole('button', { name: 'Play voice intro' }),
    );

    await expect(
      await canvas.findByRole('button', { name: 'Stop voice intro' }),
    ).toBeInTheDocument();
    await expect(
      canvasElement.querySelectorAll('.animate-voiceBar').length,
    ).toBeGreaterThan(0);

    fireEvent.click(canvas.getByRole('button', { name: 'Stop voice intro' }));

    await expect(
      await canvas.findByRole('button', { name: 'Play voice intro' }),
    ).toBeInTheDocument();
    await expect(canvasElement.querySelector('.animate-voiceBar')).toBeNull();
  },
};

export const PreviewPlaysPendingVoiceClip: Story = {
  args: { premium: true, initialValues: sampleProfile },
  beforeEach: () => {
    const restorePlayback = stubPlayback()();
    const { mediaDevices } = navigator;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: async () =>
          new AudioContext().createMediaStreamDestination().stream,
      },
      configurable: true,
    });
    return () => {
      restorePlayback();
      Object.defineProperty(navigator, 'mediaDevices', {
        value: mediaDevices,
        configurable: true,
      });
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.queryByRole('button', { name: 'Play voice intro' }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      (await canvas.findAllByRole('button', { name: 'Record voice intro' }))[0],
    );
    await new Promise((resolve) => setTimeout(resolve, 1200));
    fireEvent.click(
      (await canvas.findAllByRole('button', { name: 'Stop recording' }))[0],
    );

    fireEvent.click(
      await canvas.findByRole('button', { name: 'Play voice intro' }),
    );

    await expect(
      await canvas.findByRole('button', { name: 'Stop voice intro' }),
    ).toBeInTheDocument();
    await expect(
      canvasElement.querySelectorAll('.animate-voiceBar').length,
    ).toBeGreaterThan(0);
    await expect([...clips].some((clip) => clip.src.startsWith('blob:'))).toBe(
      true,
    );
  },
};

export const MobilePreviewTap: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  args: {
    premium: true,
    initialValues: { ...sampleProfile, voiceIntroSeconds: 8 },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    fireEvent.click(await canvas.findByRole('button', { name: 'Preview' }));
    fireEvent.click(
      await canvas.findByRole('button', { name: 'Play voice intro' }),
    );
    await new Promise((resolve) => setTimeout(resolve, 500));
    await expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(canvas.getByText(sampleProfile.bio));
    await expect(await screen.findByRole('dialog')).toBeInTheDocument();
  },
};

export const MobilePickListSearchCover: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  args: { initialValues: sampleProfile },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    fireEvent.click(await canvas.findByRole('button', { name: /^Country/ }));
    const sheet = within(await screen.findByRole('dialog'));
    fireEvent.click(sheet.getByRole('button', { name: 'Japan' }));
    const search = await sheet.findByRole('textbox', { name: 'Country' });
    const bar = search.closest('label')?.parentElement as HTMLElement;

    await waitFor(
      () => {
        (bar.parentElement as HTMLElement).scrollTop = 600;
        const { left, top } = bar.getBoundingClientRect();
        expect(document.elementFromPoint(left + 40, top - 2)).toBe(bar);
      },
      { timeout: 5000 },
    );
  },
};

export const MobileFreeTimeSurvivesSheetClose: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  args: { initialValues: sampleProfile },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const openFreeTime = async () => {
      fireEvent.click(
        await canvas.findByRole('button', { name: /^Free Time/ }),
      );
      return within(await screen.findByRole('dialog'));
    };

    let sheet = await openFreeTime();
    fireEvent.click(sheet.getByRole('switch', { name: 'Free Time' }));
    await waitFor(() =>
      expect(
        sheet.getByRole('switch', { name: 'Free Time' }),
      ).not.toBeChecked(),
    );
    fireEvent.click(sheet.getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );

    sheet = await openFreeTime();
    fireEvent.click(sheet.getByRole('switch', { name: 'Free Time' }));
    await waitFor(() =>
      expect(sheet.getByRole('switch', { name: 'Free Time' })).toBeChecked(),
    );
    await expect(
      sheet.getByRole('button', { name: 'Weekdays' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(sheet.getByLabelText('From')).toHaveValue('06:00');
  },
};

export const MobileTimezonePicker: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  args: {
    initialValues: {
      ...sampleProfile,
      timezone: '',
      displayTimezone: false,
      availability: null,
    },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    fireEvent.click(
      await canvas.findByRole('switch', { name: 'Show my local time' }),
    );
    const sheet = within(await screen.findByRole('dialog'));
    setFieldValue(
      await sheet.findByRole('textbox', { name: 'Timezone' }),
      'Tokyo',
    );
    fireEvent.click(await sheet.findByRole('button', { name: /Asia\/Tokyo$/ }));
    await waitFor(() =>
      expect(
        sheet.queryByRole('textbox', { name: 'Timezone' }),
      ).not.toBeInTheDocument(),
    );
    await expect(
      sheet.getByRole('switch', { name: 'Display timezone' }),
    ).toBeChecked();
    const row = sheet.getByRole('button', { name: /Asia\/Tokyo$/ });

    fireEvent.click(row);
    setFieldValue(
      await sheet.findByRole('textbox', { name: 'Timezone' }),
      'London',
    );
    fireEvent.click(
      await sheet.findByRole('button', { name: /Europe\/London$/ }),
    );
    fireEvent.click(await sheet.findByRole('button', { name: 'Done' }));
    fireEvent.click(await canvas.findByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          timezone: 'Europe/London',
          displayTimezone: true,
        }),
      ),
    );
  },
};
