import type { Meta, StoryObj } from '@storybook/react';
import { expect, fireEvent, userEvent, waitFor, within } from '@storybook/test';
import { useState } from 'react';
import {
  blendHex,
  DEFAULT_CUSTOM_GRADIENT,
} from '@/features/Discovery/cardTheme';
import { CardColorPicker } from './CardColorPicker';

const PickerHarness = ({
  premium,
  initialValue,
}: {
  premium?: boolean;
  initialValue: string;
}) => {
  const [value, setValue] = useState(initialValue);
  const [tease, setTease] = useState<string | null>(null);
  const [customGradient, setCustomGradient] = useState(DEFAULT_CUSTOM_GRADIENT);
  const [accentOverride, setAccentOverride] = useState<string | null>(null);
  const autoAccent = blendHex(customGradient.from, customGradient.to);

  return (
    <div className="w-[420px] rounded-3xl bg-background-dark p-6">
      <CardColorPicker
        value={value}
        onChange={setValue}
        premium={premium}
        tease={tease}
        onTease={setTease}
        customGradient={customGradient}
        accentOverride={accentOverride}
        autoAccent={autoAccent}
        onCustomGradient={setCustomGradient}
        onAccentOverride={setAccentOverride}
      />
    </div>
  );
};

const meta: Meta<typeof PickerHarness> = {
  title: 'Features/Profile/CardColorPicker',
  component: PickerHarness,
};

export default meta;
type Story = StoryObj<typeof PickerHarness>;

export const Free: Story = {
  args: { premium: false, initialValue: 'sky' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const sky = canvas.getByRole('button', { name: 'Sky banner colour' });
    const pink = canvas.getByRole('button', { name: 'Pink banner colour' });
    await expect(sky).toHaveAttribute('aria-pressed', 'true');
    await expect(
      canvas.getByRole('button', { name: 'Indigo banner theme (Premium)' }),
    ).toBeInTheDocument();

    await userEvent.click(pink);

    await waitFor(() => expect(pink).toHaveAttribute('aria-pressed', 'true'));
    await expect(sky).toHaveAttribute('aria-pressed', 'false');
  },
};

export const FreeTease: Story = {
  args: { premium: false, initialValue: 'sky' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const indigo = canvas.getByRole('button', {
      name: 'Indigo banner theme (Premium)',
    });
    const sky = canvas.getByRole('button', { name: 'Sky banner colour' });

    await userEvent.click(indigo);

    await waitFor(() => expect(indigo).toHaveAttribute('aria-pressed', 'true'));
    await expect(sky).toHaveAttribute('aria-pressed', 'false');
    await expect(canvas.getByText(/matching card tint/)).toBeInTheDocument();
    await expect(
      canvas.getByRole('link', { name: 'Premium' }),
    ).toBeInTheDocument();

    await userEvent.click(indigo);

    await waitFor(() =>
      expect(indigo).toHaveAttribute('aria-pressed', 'false'),
    );
    await expect(sky).toHaveAttribute('aria-pressed', 'true');
  },
};

export const Premium: Story = {
  args: { premium: true, initialValue: 'indigo' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const indigo = canvas.getByRole('button', { name: 'Indigo banner theme' });
    const gold = canvas.getByRole('button', { name: 'Gold banner theme' });
    await expect(indigo).toHaveAttribute('aria-pressed', 'true');
    await expect(
      canvas.queryByRole('button', {
        name: 'Indigo banner theme (Premium)',
      }),
    ).not.toBeInTheDocument();

    await userEvent.click(gold);

    await waitFor(() => expect(gold).toHaveAttribute('aria-pressed', 'true'));
    await expect(indigo).toHaveAttribute('aria-pressed', 'false');
    await expect(
      canvas.queryByText(/matching card tint/),
    ).not.toBeInTheDocument();
  },
};

export const PremiumCustomGradient: Story = {
  args: { premium: true, initialValue: 'indigo' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    const custom = canvas.getByRole('button', {
      name: 'Open custom gradient picker',
    });

    await userEvent.click(custom);

    await waitFor(() =>
      expect(
        body.getByRole('button', { name: 'Start colour' }),
      ).toHaveAttribute('aria-pressed', 'true'),
    );
    await expect(custom).toHaveAttribute('aria-pressed', 'false');

    const board = body.getByLabelText('Colour saturation and brightness');
    fireEvent.mouseDown(board, { clientX: 160, clientY: 40 });
    fireEvent.mouseUp(canvasElement.ownerDocument.defaultView ?? board);

    await waitFor(() => expect(custom).toHaveAttribute('aria-pressed', 'true'));

    await userEvent.click(body.getByRole('button', { name: 'End colour' }));
    await waitFor(() =>
      expect(body.getByRole('button', { name: 'End colour' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );

    const hexInput = body.getByLabelText('Hex colour');
    await userEvent.clear(hexInput);
    await userEvent.type(hexInput, '22cc88');

    await waitFor(() => expect(hexInput).toHaveValue('22cc88'));
  },
};

export const PremiumAccentOverride: Story = {
  args: { premium: true, initialValue: 'custom' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(
      canvas.getByRole('button', { name: 'Open accent colour picker' }),
    );

    const hexInput = body.getByLabelText('Hex colour');
    await userEvent.clear(hexInput);
    await userEvent.type(hexInput, '00ffaa');

    await waitFor(() => expect(hexInput).toHaveValue('00ffaa'));
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: /reset to auto/i }),
      ).toBeInTheDocument(),
    );

    await userEvent.click(
      canvas.getByRole('button', { name: /reset to auto/i }),
    );

    await waitFor(() =>
      expect(
        canvas.queryByRole('button', { name: /reset to auto/i }),
      ).not.toBeInTheDocument(),
    );
  },
};
