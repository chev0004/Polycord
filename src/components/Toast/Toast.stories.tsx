import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from '@storybook/test';
import { useToastStack } from '@/hooks/useToast';
import { Button } from '../Button';
import { Toast } from './Toast';
import { ToastStack } from './ToastStack';

const meta: Meta<typeof Toast> = {
  title: 'Components/Toast',
  component: Toast,
};

export default meta;
type Story = StoryObj<typeof Toast>;

const ToastDemo = ({
  duration,
  iconUrl,
}: {
  duration: number;
  iconUrl?: string;
}) => {
  const { toasts, addToast, dismissToast } = useToastStack();

  return (
    <>
      <div className="p-10">
        <Button
          onClick={() =>
            addToast({
              title: 'Username copied',
              description: 'Paste it in Discord to add them.',
              duration,
              iconUrl,
            })
          }
        >
          Show toast
        </Button>
      </div>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};

export const Default: Story = {
  render: () => <ToastDemo duration={5000} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByText('Show toast'));

    const title = await canvas.findByText('Username copied');
    await expect(
      canvas.getByText('Paste it in Discord to add them.'),
    ).toBeInTheDocument();

    const toast = title.closest('li');
    if (!toast) throw new Error('Toast root not found');

    await userEvent.click(within(toast).getByRole('button'));

    await waitFor(
      () =>
        expect(canvas.queryByText('Username copied')).not.toBeInTheDocument(),
      { timeout: 5000 },
    );
  },
};

export const AutoDismiss: Story = {
  render: () => <ToastDemo duration={1500} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByText('Show toast'));

    await expect(
      await canvas.findByText('Username copied'),
    ).toBeInTheDocument();

    await waitFor(
      () =>
        expect(canvas.queryByText('Username copied')).not.toBeInTheDocument(),
      { timeout: 8000 },
    );
  },
};

export const WithAvatar: Story = {
  render: () => (
    <ToastDemo
      duration={60000}
      iconUrl="https://cdn.discordapp.com/embed/avatars/0.png"
    />
  ),
};
