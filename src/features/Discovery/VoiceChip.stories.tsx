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

const silentClip =
  'data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';
const audible = new Set<HTMLMediaElement>();
const clips = new Set<HTMLMediaElement>();

const stubPlayback =
  (outcome: 'play' | 'fail' = 'play') =>
  () => {
    const proto = HTMLMediaElement.prototype;
    const { play, pause } = proto;
    const paused = Object.getOwnPropertyDescriptor(proto, 'paused');
    audible.clear();
    clips.clear();
    Object.defineProperty(proto, 'paused', {
      configurable: true,
      get() {
        return !audible.has(this);
      },
    });
    proto.play = function (this: HTMLMediaElement) {
      clips.add(this);
      if (outcome === 'fail') return Promise.reject(new Error('Blocked'));
      audible.add(this);
      this.dispatchEvent(new Event('play'));
      return Promise.resolve();
    };
    proto.pause = function (this: HTMLMediaElement) {
      audible.delete(this);
      this.dispatchEvent(new Event('pause'));
    };
    return () => {
      proto.play = play;
      proto.pause = pause;
      if (paused) Object.defineProperty(proto, 'paused', paused);
    };
  };

export const RapidToggle: Story = {
  args: { seconds: 12, src: silentClip },
  beforeEach: stubPlayback(),
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button');

    await userEvent.click(button);
    await expect(button).toHaveAccessibleName('Stop voice intro');
    await expect(
      canvasElement.querySelectorAll('.animate-voiceBar').length,
    ).toBeGreaterThan(0);
    await userEvent.click(button);
    await expect(button).toHaveAccessibleName('Play voice intro');
    await expect(canvasElement.querySelector('.animate-voiceBar')).toBeNull();
    await userEvent.click(button);
    await userEvent.click(button);
    await userEvent.click(button);

    await expect(button).toHaveAccessibleName('Stop voice intro');
    await expect(clips.size).toBe(1);
    await expect(audible.size).toBe(1);
  },
};

export const OneClipAtATime: Story = {
  args: { seconds: 12, src: silentClip },
  beforeEach: stubPlayback(),
  render: (args) => (
    <div className="flex flex-col gap-3">
      <VoiceChip {...args} />
      <VoiceChip {...args} src={`${silentClip}#second`} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const [first, second] = within(canvasElement).getAllByRole('button');

    await userEvent.click(first);
    await userEvent.click(second);

    await waitFor(() => expect(first).toHaveAccessibleName('Play voice intro'));
    await expect(second).toHaveAccessibleName('Stop voice intro');
    await expect(audible.size).toBe(1);
  },
};

export const PlaybackFails: Story = {
  args: { seconds: 12, src: silentClip },
  beforeEach: stubPlayback('fail'),
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button');

    await userEvent.click(button);

    await waitFor(() =>
      expect(button).toHaveAccessibleName('Play voice intro'),
    );
    await expect(canvasElement.querySelector('.animate-voiceBar')).toBeNull();
    await expect(within(canvasElement).getByText('0:12')).toBeInTheDocument();
  },
};
