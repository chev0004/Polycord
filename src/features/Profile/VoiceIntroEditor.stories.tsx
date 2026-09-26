import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from '@storybook/test';
import { useState } from 'react';
import { VoiceIntroEditor } from './VoiceIntroEditor';
import 'src/app/globals.css';

const EditorHarness = ({
  premium,
  initialSeconds = 0,
}: {
  premium: boolean;
  initialSeconds?: number;
}) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  return (
    <div className="w-[460px] rounded-3xl bg-background-dark p-6">
      <VoiceIntroEditor
        premium={premium}
        voiceSeconds={seconds}
        onChange={setSeconds}
      />
    </div>
  );
};

const meta: Meta<typeof EditorHarness> = {
  title: 'Features/Profile/VoiceIntroEditor',
  component: EditorHarness,
};

export default meta;
type Story = StoryObj<typeof EditorHarness>;

export const FreeLocked: Story = {
  args: { premium: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Voice Intro')).toBeInTheDocument();
    await expect(
      canvas.queryByRole('button', { name: 'Record voice intro' }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getByRole('link', { name: 'Premium' }),
    ).toBeInTheDocument();
    await expect(canvas.getAllByText('Premium')).toHaveLength(2);
  },
};

export const PremiumIdle: Story = {
  args: { premium: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole('button', { name: 'Record voice intro' }),
    ).toBeInTheDocument();
    await expect(canvas.queryByText('Premium')).not.toBeInTheDocument();
  },
};

export const PremiumRecording: Story = {
  args: { premium: true },
  beforeEach: () => {
    const { mediaDevices } = navigator;
    const original = globalThis.fetch;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: async () =>
          new AudioContext().createMediaStreamDestination().stream,
      },
      configurable: true,
    });
    globalThis.fetch = Object.assign(
      (...args: Parameters<typeof fetch>) =>
        String(args[0]) === '/api/profile/voice'
          ? Promise.resolve(Response.json({ durationSeconds: 12 }))
          : original(...args),
      { preconnect: original.preconnect },
    );
    return () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: mediaDevices,
        configurable: true,
      });
      globalThis.fetch = original;
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByRole('button', { name: 'Record voice intro' }),
    );

    const stop = await canvas.findByRole('button', { name: 'Stop recording' });
    await expect(stop).toBeInTheDocument();

    await userEvent.click(stop);
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Save clip' }),
    );

    await waitFor(() =>
      expect(
        canvas.getByText('Your 12-second intro is live on your card.'),
      ).toBeInTheDocument(),
    );
  },
};
