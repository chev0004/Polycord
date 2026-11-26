import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from '@storybook/test';
import { useToastStack } from '@/hooks/useToast';
import en from '@/locales/en.json';
import ja from '@/locales/ja.json';
import { Button } from '../Button';
import { Toast, ToastViewport } from './Toast';
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
    await expect(within(toast).queryByText('?')).not.toBeInTheDocument();
    await expect(toast.querySelector('img')).toBeNull();

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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByText('Show toast'));

    const toast = (await canvas.findByText('Username copied')).closest('li');
    await expect(toast?.querySelector('img')).toBeInTheDocument();
  },
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
    await expectActionBelowCopy(title, await canvas.findByText('Undo'));
  },
};

const expectActionBelowCopy = async (title: Element, action: Element) => {
  const description = title.nextElementSibling as Element;
  await expect(action.getBoundingClientRect().top).toBeGreaterThanOrEqual(
    description.getBoundingClientRect().bottom - 1,
  );
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
    await expectActionBelowCopy(
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
    await expectActionBelowCopy(
      await canvas.findByText('User blocked'),
      await canvas.findByText('Undo'),
    );
  },
};

const promptsFor = (messages: typeof en) => [
  {
    title: messages.Discovery.bumpHintTitle,
    description: messages.Discovery.bumpHintDescription,
    action: messages.Discovery.bumpHintAction,
  },
  {
    title: messages.Deployment.title,
    description: messages.Deployment.description,
    action: messages.Deployment.reload,
  },
  {
    title: messages.Discovery.blockSuccessTitle,
    description: messages.Discovery.blockSuccessDescription,
    action: messages.Discovery.blockUndo,
  },
];

const PromptStack = ({ messages }: { messages: typeof en }) => (
  <ToastViewport>
    {promptsFor(messages).map(({ title, description, action }) => (
      <Toast
        key={title}
        title={title}
        description={description}
        action={{ label: action, onClick: () => {} }}
        duration={60000}
      />
    ))}
  </ToastViewport>
);

const lineWidths = (element: Element) => {
  const range = document.createRange();
  range.selectNodeContents(element);
  return [...range.getClientRects()]
    .map(({ width }) => width)
    .filter((width) => width > 0);
};

const roomyPrompts =
  (messages: typeof en): Story['play'] =>
  async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const boxes = [];

    for (const { title, description, action } of promptsFor(messages)) {
      const titleText = await canvas.findByText(title);
      const descriptionText = canvas.getByText(description);
      const toast = titleText.closest('li') as HTMLElement;

      await expect(titleText.getBoundingClientRect().width).toBeGreaterThan(
        240,
      );
      for (const text of [titleText, descriptionText]) {
        const lines = lineWidths(text);
        await expect(Math.min(...lines)).toBeGreaterThanOrEqual(
          Math.max(...lines) / 2,
        );
      }
      await expectActionBelowCopy(
        titleText,
        within(toast).getByRole('button', { name: action }),
      );
      const close = within(toast)
        .getByRole('button', { name: messages.Toast.close })
        .getBoundingClientRect();
      await expect(Math.min(close.width, close.height)).toBeGreaterThanOrEqual(
        32,
      );
      boxes.push(toast.getBoundingClientRect());
    }

    boxes.sort((a, b) => a.top - b.top);
    for (const [index, box] of boxes.slice(1).entries()) {
      await expect(box.top).toBeGreaterThanOrEqual(boxes[index].bottom);
    }
  };

export const ActionPrompts: Story = {
  render: () => <PromptStack messages={en} />,
  play: roomyPrompts(en),
};

export const ActionPromptsJapanese: Story = {
  globals: { locale: 'ja' },
  render: () => <PromptStack messages={ja} />,
  play: roomyPrompts(ja),
};
