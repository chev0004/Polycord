import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from '@storybook/test';
import { useState } from 'react';
import { LookingForEditor } from './LookingForEditor';

const EditorHarness = ({ initialValue }: { initialValue: string[] }) => {
  const [value, setValue] = useState<string[]>(initialValue);
  return (
    <div className="w-[420px] rounded-3xl bg-background-dark p-6">
      <LookingForEditor value={value} onChange={setValue} />
    </div>
  );
};

const meta: Meta<typeof EditorHarness> = {
  title: 'Features/Profile/LookingForEditor',
  component: EditorHarness,
};

export default meta;
type Story = StoryObj<typeof EditorHarness>;

export const Empty: Story = {
  args: { initialValue: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const casual = canvas.getByRole('button', { name: 'Casual chat' });
    await expect(casual).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(casual);

    await waitFor(() => expect(casual).toHaveAttribute('aria-pressed', 'true'));
  },
};

export const Preselected: Story = {
  args: { initialValue: ['gaming', 'voice_practice'] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const gaming = canvas.getByRole('button', { name: 'Gaming' });
    await expect(gaming).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(gaming);

    await waitFor(() =>
      expect(gaming).toHaveAttribute('aria-pressed', 'false'),
    );
  },
};
