import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from '@storybook/test';
import { useState } from 'react';
import { VoiceIntroEditor } from './VoiceIntroEditor';
import { toneUrl } from './voiceTone';
import 'src/app/globals.css';

const EditorHarness = ({
  premium,
  initialSeconds = 0,
  profileId,
}: {
  premium: boolean;
  initialSeconds?: number;
  profileId?: string;
}) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  return (
    <div className="w-[460px] max-w-full rounded-3xl bg-background-dark p-6">
      <VoiceIntroEditor
        premium={premium}
        profileId={profileId}
        voiceSeconds={seconds}
        onChange={setSeconds}
      />
    </div>
  );
};

const mockRecordingApis = () => {
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
      canvas.getByRole('link', { name: 'Supporter' }),
    ).toBeInTheDocument();
    await expect(canvas.getAllByText('Supporter')).toHaveLength(2);
  },
};

export const SupporterIdle: Story = {
  args: { premium: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole('button', { name: 'Record voice intro' }),
    ).toBeInTheDocument();
    await expect(canvas.queryByText('Supporter')).not.toBeInTheDocument();
  },
};

export const SupporterRecording: Story = {
  args: { premium: true },
  beforeEach: mockRecordingApis,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByRole('button', { name: 'Record voice intro' }),
    );

    const stop = await canvas.findByRole('button', { name: 'Stop recording' });
    await expect(stop).toBeInTheDocument();

    await userEvent.click(stop);
    await expect(
      await canvas.findByRole('button', { name: 'Play your voice intro' }),
    ).toBeInTheDocument();
    await expect(canvasElement.querySelector('audio')).toBeNull();
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

const routeVoiceToTone = () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLMediaElement.prototype,
    'src',
  ) as PropertyDescriptor;
  const tone = toneUrl(4);
  Object.defineProperty(HTMLMediaElement.prototype, 'src', {
    configurable: true,
    get: descriptor.get,
    set(this: HTMLMediaElement, value: string) {
      descriptor.set?.call(
        this,
        value.startsWith('/api/voice/') ? tone : value,
      );
    },
  });
  const restoreRecording = mockRecordingApis();
  return () => {
    restoreRecording();
    Object.defineProperty(HTMLMediaElement.prototype, 'src', descriptor);
    URL.revokeObjectURL(tone);
  };
};

export const SavedIntroPlays: Story = {
  args: { premium: true, initialSeconds: 4, profileId: 'profile-1' },
  beforeEach: routeVoiceToTone,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      await canvas.findByRole('button', { name: 'Play your voice intro' }),
    );
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: 'Pause your voice intro' }),
      ).toBeInTheDocument(),
    );
    await expect(canvasElement.querySelector('audio')).toBeNull();
    await expect(canvas.queryByRole('alert')).toBeNull();
  },
};

export const RemovingStopsPlayback: Story = {
  args: { premium: true, initialSeconds: 4, profileId: 'profile-1' },
  beforeEach: routeVoiceToTone,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const { pause } = HTMLMediaElement.prototype;
    let pauses = 0;
    HTMLMediaElement.prototype.pause = function (this: HTMLMediaElement) {
      pauses++;
      pause.call(this);
    };

    await userEvent.click(
      await canvas.findByRole('button', { name: 'Play your voice intro' }),
    );
    await canvas.findByRole('button', { name: 'Pause your voice intro' });
    await userEvent.click(
      canvas.getByRole('button', { name: 'Remove voice intro' }),
    );

    await waitFor(() =>
      expect(
        canvas.queryByRole('button', { name: 'Pause your voice intro' }),
      ).toBeNull(),
    );
    await expect(pauses).toBeGreaterThan(0);
    HTMLMediaElement.prototype.pause = pause;
  },
};

export const RecordingReplacesSavedPlayer: Story = {
  args: { premium: true, initialSeconds: 4, profileId: 'profile-1' },
  beforeEach: routeVoiceToTone,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole('button', { name: 'Play your voice intro' });
    await userEvent.click(
      canvas.getByRole('button', { name: 'Record voice intro' }),
    );

    await canvas.findByRole('button', { name: 'Stop recording' });
    await expect(
      canvas.queryByRole('button', { name: 'Play your voice intro' }),
    ).toBeNull();
  },
};

export const SavedIntroOnMobile: Story = {
  args: { premium: true, initialSeconds: 4, profileId: 'profile-1' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  beforeEach: routeVoiceToTone,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const play = await canvas.findByRole('button', {
      name: 'Play your voice intro',
    });
    const row = play.parentElement as HTMLElement;

    await expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
    await expect(
      canvas.getByRole('button', { name: 'Voice intro actions' }),
    ).toBeVisible();
  },
};
