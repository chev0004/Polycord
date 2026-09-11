import type { Meta, StoryObj } from '@storybook/react';
import { expect, fireEvent, fn, waitFor, within } from '@storybook/test';
import { ProfilePage } from './ProfilePage';
import type { ProfileFormValues } from './schema';

const meta: Meta<typeof ProfilePage> = {
  title: 'Features/Profile/ProfilePage',
  component: ProfilePage,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-background-main">
        <Story />
      </div>
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
      expect(canvas.getAllByText('Gardening')).toHaveLength(2),
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

    await expect(canvas.getByText('All changes saved')).toBeInTheDocument();
    const saveButton = canvas.getByRole('button', { name: 'Save Profile' });
    await expect(saveButton).toBeDisabled();

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
    await expect(saveButton).toBeEnabled();

    fireEvent.click(saveButton);

    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledTimes(1), {
      timeout: 5000,
    });
    await waitFor(
      () => expect(canvas.getByText('All changes saved')).toBeInTheDocument(),
      { timeout: 5000 },
    );
  },
};
