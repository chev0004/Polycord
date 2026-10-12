import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import { useState } from 'react';
import { Radio, RadioGroup } from './Radio';

const REASONS = ['Spam or advertising', 'Harassment or hate', 'Impersonation'];

const Controlled = () => {
  const [value, setValue] = useState('');

  return (
    <RadioGroup value={value} onValueChange={setValue} aria-label="Reason">
      {REASONS.map((reason) => (
        <Radio key={reason} value={reason} label={reason} />
      ))}
    </RadioGroup>
  );
};

const meta: Meta<typeof RadioGroup> = {
  title: 'Components/Form/Radio',
  component: RadioGroup,
  decorators: [
    (Story) => (
      <div className="w-[360px] p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

export const Default: Story = {
  render: () => <Controlled />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByRole('radio', { name: 'Harassment or hate' }),
    );
    await expect(
      canvas.getByRole('radio', { name: 'Harassment or hate' }),
    ).toBeChecked();

    await userEvent.click(canvas.getByRole('radio', { name: 'Impersonation' }));
    await expect(
      canvas.getByRole('radio', { name: 'Harassment or hate' }),
    ).not.toBeChecked();
    await expect(
      canvas.getByRole('radio', { name: 'Impersonation' }),
    ).toBeChecked();
  },
};

export const ArrowKeys: Story = {
  render: () => <Controlled />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByRole('radio', { name: 'Spam or advertising' }),
    );
    await userEvent.keyboard('{ArrowDown}');
    await expect(
      canvas.getByRole('radio', { name: 'Harassment or hate' }),
    ).toHaveFocus();
  },
};
