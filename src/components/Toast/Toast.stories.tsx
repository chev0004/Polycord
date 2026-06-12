import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from '@storybook/test';
import { useState } from 'react';
import { Button } from '../Button';
import { Toast, ToastProvider, ToastViewport } from './Toast';

const meta: Meta<typeof Toast> = {
  title: 'Components/Toast',
  component: Toast,
  decorators: [
    (Story) => (
      <div className="min-h-56 bg-background-main p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Toast>;

const ToastDemo = () => {
  const [open, setOpen] = useState(false);

  return (
    <ToastProvider swipeDirection="right">
      <Button onClick={() => setOpen(true)}>Show toast</Button>
      <Toast
        open={open}
        onOpenChange={setOpen}
        title="Username copied"
        description="Kenji Ito is ready for Discord."
        duration={900}
      />
      <ToastViewport />
    </ToastProvider>
  );
};

export const Lifecycle: Story = {
  render: () => <ToastDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Show toast' }));
    await expect(canvas.getByText('Username copied')).toBeVisible();

    await userEvent.click(
      canvas.getByRole('button', { name: 'Close notification' }),
    );

    await waitFor(() => {
      expect(canvas.queryByText('Username copied')).not.toBeInTheDocument();
    });
  },
};
