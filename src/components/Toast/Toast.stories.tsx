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

    await userEvent.click(canvas.getByText('Show toast'));

    const toast = (await canvas.findByText('Username copied')).closest('li');
    await expect(toast?.parentElement?.children).toHaveLength(1);
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

const BlockToastDemo = () => {
  const { toasts, addToast, dismissToast } = useToastStack();

  return (
    <>
      <div className="p-10">
        <Button
          onClick={() =>
            addToast({
              title: 'User blocked',
              description:
                "Their profiles won't appear in your discovery feed.",
              action: { label: 'Undo', onClick: () => {} },
              duration: 60000,
            })
          }
        >
          Block user
        </Button>
      </div>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};

export const BlockUndo: Story = {
  render: () => <BlockToastDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByText('Block user'));

    const title = await canvas.findByText('User blocked');
    await expectActionCentered(title, await canvas.findByText('Undo'));
  },
};

const centerOf = (element: Element) => {
  const box = element.getBoundingClientRect();
  return box.top + box.height / 2;
};

const expectActionCentered = async (title: Element, action: Element) => {
  const toast = title.closest('li');
  if (!toast) throw new Error('Toast root not found');
  await expect(
    Math.abs(centerOf(action) - centerOf(toast)),
  ).toBeLessThanOrEqual(2);
};

const ActionToast = ({
  description,
  iconUrl,
}: {
  description: string;
  iconUrl?: string;
}) => (
  <div className="p-10">
    <Toast
      title="User blocked"
      description={description}
      iconUrl={iconUrl}
      action={{ label: 'Undo', onClick: () => {} }}
    />
  </div>
);

export const ActionOneLine: Story = {
  render: () => <ActionToast description="Hidden from discovery." />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expectActionCentered(
      await canvas.findByText('User blocked'),
      await canvas.findByText('Undo'),
    );
  },
};

export const ActionWrappedWithAvatar: Story = {
  render: () => (
    <ActionToast
      description="Their profiles won't appear in your discovery feed until you unblock them from your settings, which is a longer wrapped line."
      iconUrl="/polycord-wordmark.svg"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expectActionCentered(
      await canvas.findByText('User blocked'),
      await canvas.findByText('Undo'),
    );
  },
};
