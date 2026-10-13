import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from '@storybook/test';
import { useState } from 'react';
import { VoiceIntroPlayer } from './VoiceIntroPlayer';
import { toneUrl } from './voiceTone';
import 'src/app/globals.css';

const Harness = (args: React.ComponentProps<typeof VoiceIntroPlayer>) => {
  const [tone] = useState(() => toneUrl(4));

  return (
    <div className="w-[460px] max-w-full rounded-3xl bg-background-darker p-4">
      <VoiceIntroPlayer {...args} src={args.src || tone} />
    </div>
  );
};

const meta: Meta<typeof VoiceIntroPlayer> = {
  title: 'Features/Profile/VoiceIntroPlayer',
  component: VoiceIntroPlayer,
  args: { seconds: 4, filename: 'polycord-voice-intro' },
  render: (args) => <Harness {...args} />,
};

export default meta;
type Story = StoryObj<typeof VoiceIntroPlayer>;

const body = (canvasElement: HTMLElement) =>
  within(canvasElement.ownerDocument.body);

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvasElement.querySelector('audio')).toBeNull();
    await expect(canvas.getByText('0:00')).toBeInTheDocument();
    await expect(canvas.getByText(/\/ 0:04/)).toBeInTheDocument();

    await userEvent.click(
      canvas.getByRole('button', { name: 'Play your voice intro' }),
    );
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: 'Pause your voice intro' }),
      ).toBeInTheDocument(),
    );
    await waitFor(() => expect(canvas.getByText('0:01')).toBeInTheDocument(), {
      timeout: 3500,
    });

    await userEvent.click(
      canvas.getByRole('button', { name: 'Pause your voice intro' }),
    );
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: 'Play your voice intro' }),
      ).toBeInTheDocument(),
    );
  },
};

export const SeekWithKeyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const seek = canvas.getByRole('slider', { name: 'Seek voice intro' });

    seek.focus();
    await userEvent.keyboard('{End}');

    await waitFor(() => expect(canvas.getByText('0:04')).toBeInTheDocument());
    await expect(seek).toHaveAttribute('aria-valuetext', '0:04 of 0:04');

    await userEvent.keyboard('{Home}');
    await waitFor(() =>
      expect(seek).toHaveAttribute('aria-valuetext', '0:00 of 0:04'),
    );
  },
};

const widthOf = (element: HTMLElement) => element.getBoundingClientRect().width;

export const VolumeExpandsOnFocus: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const speaker = canvas.getByRole('button', { name: 'Volume' });
    const slot = speaker.nextElementSibling as HTMLElement;

    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await expect(speaker).toHaveFocus();
    await waitFor(() => expect(widthOf(slot)).toBeGreaterThanOrEqual(44));

    await userEvent.keyboard('{Tab}{ArrowLeft}');
    await expect(
      canvas.getByRole('slider', { name: 'Volume' }),
    ).toHaveAttribute('aria-valuenow', '0.99');
  },
};

export const MobileVolumeOnTap: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const speaker = canvas.getByRole('button', { name: 'Volume' });
    const slot = speaker.nextElementSibling as HTMLElement;
    const row = speaker.parentElement?.parentElement as HTMLElement;

    await expect(speaker).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(speaker);
    await expect(speaker).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(widthOf(slot)).toBeGreaterThanOrEqual(44));
    await expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
    await expect(
      canvas.getByRole('button', { name: 'Voice intro actions' }),
    ).toBeVisible();
  },
};

const downloads: string[] = [];

export const DownloadMenu: Story = {
  beforeEach: () => {
    const { click } = HTMLAnchorElement.prototype;
    downloads.length = 0;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      if (this.download) downloads.push(this.download);
      else click.call(this);
    };
    return () => {
      HTMLAnchorElement.prototype.click = click;
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByRole('button', { name: 'Voice intro actions' }),
    );
    await userEvent.click(
      await body(canvasElement).findByRole('button', { name: 'Download' }),
    );

    await waitFor(() =>
      expect(downloads).toEqual(['polycord-voice-intro.wav']),
    );
    await waitFor(() =>
      expect(
        body(canvasElement).queryByRole('button', { name: 'Download' }),
      ).toBeNull(),
    );
  },
};

export const LoadAndDownloadErrors: Story = {
  args: { src: '/api/voice/missing' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'This clip could not be played.',
    );

    await userEvent.click(
      canvas.getByRole('button', { name: 'Voice intro actions' }),
    );
    await userEvent.click(
      await body(canvasElement).findByRole('button', { name: 'Download' }),
    );

    await waitFor(() =>
      expect(canvas.getByRole('alert')).toHaveTextContent(
        'This clip could not be downloaded.',
      ),
    );
  },
};
