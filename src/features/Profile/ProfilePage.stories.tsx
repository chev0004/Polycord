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
  targetLanguage: 'en',
  proficiencyLevel: 'intermediate',
  country: 'JP',
  timezone: 'Asia/Tokyo',
  isPublic: true,
  allowAnonymousCopy: true,
  displayTimezone: true,
  availability: 'weekday_mornings',
  bio: 'I am a graphic designer in Osaka looking for a patient partner to practice everyday English with.',
  tags: ['Anime', 'Cooking', 'Photography'],
};

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
