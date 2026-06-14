import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from '@storybook/test';
import { useState } from 'react';
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
  return (
    <div className="w-[420px] rounded-3xl bg-background-dark p-6">
      <CardColorPicker
        value={value}
        onChange={setValue}
        premium={premium}
        tease={tease}
        onTease={setTease}
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
