import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from '@storybook/test';
import { deriveCardAccent, PREMIUM_CARD_THEMES } from './cardTheme';
import { VoiceChip } from './VoiceChip';
import 'src/app/globals.css';

const meta: Meta<typeof VoiceChip> = {
  title: 'Discovery/VoiceChip',
  component: VoiceChip,
  decorators: [
    (Story) => (
      <div
        className="p-10"
        style={deriveCardAccent(PREMIUM_CARD_THEMES[0].accent)}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof VoiceChip>;

export const Idle: Story = {
  args: { seconds: 12 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole('button', { name: 'Play voice intro' }),
    ).toBeInTheDocument();
    await expect(canvas.getByText('0:12')).toBeInTheDocument();
  },
};

export const Playing: Story = {
  args: { seconds: 12 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByRole('button', { name: 'Play voice intro' }),
    );

    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: 'Stop voice intro' }),
      ).toBeInTheDocument(),
    );

    await userEvent.click(
      canvas.getByRole('button', { name: 'Stop voice intro' }),
    );

    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: 'Play voice intro' }),
      ).toBeInTheDocument(),
    );
  },
};
