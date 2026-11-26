import type { Meta, StoryObj } from '@storybook/react';
import {
  expect,
  fireEvent,
  fn,
  userEvent,
  waitFor,
  within,
} from '@storybook/test';
import { type ToastData, useToastStack } from '@/hooks/useToast';
import { Button } from '../Button';
import { ToastStack } from './ToastStack';

type DemoProps = {
  toast: Omit<ToastData, 'id'>;
  second?: Omit<ToastData, 'id'>;
};

const MobileToastDemo = ({ toast, second }: DemoProps) => {
  const { toasts, addToast, dismissToast } = useToastStack();

  return (
    <>
      <div className="flex gap-2 p-4">
        <Button onClick={() => addToast(toast)}>Show toast</Button>
        {second ? (
          <Button onClick={() => addToast({ ...second })}>Show second</Button>
        ) : null}
      </div>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};

const meta: Meta<typeof MobileToastDemo> = {
  title: 'Components/MobileToast',
  component: MobileToastDemo,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  args: { toast: { title: 'Link copied', description: '' } },
};

export default meta;
type Story = StoryObj<typeof MobileToastDemo>;

export const Status: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByText('Show toast'));

    await expect(await canvas.findByRole('status')).toHaveTextContent(
      'Link copied',
    );
    await waitFor(
      () => expect(canvas.queryByRole('status')).not.toBeInTheDocument(),
      { timeout: 8000 },
    );
  },
};

export const ErrorStatus: Story = {
  args: {
    toast: { title: 'Could not save', description: '', variant: 'error' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByText('Show toast'));

    const toast = await canvas.findByRole('status');
    await expect(toast).toHaveTextContent('Could not save');
    await expect(toast.querySelector('svg')).toHaveClass('text-danger');
  },
};

export const ReplacesCurrent: Story = {
  args: { second: { title: 'Profile saved', description: '' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByText('Show toast'));
    await canvas.findByText('Link copied');
    await userEvent.click(canvas.getByText('Show second'));

    await expect(await canvas.findByText('Profile saved')).toBeInTheDocument();
    await waitFor(() =>
      expect(canvas.queryByText('Link copied')).not.toBeInTheDocument(),
    );
    await expect(canvas.getAllByRole('status')).toHaveLength(1);
  },
};

export const SwipeUpDismisses: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByText('Show toast'));
    const toast = await canvas.findByRole('status');

    await fireEvent.pointerDown(toast, { clientY: 100, pointerId: 1 });
    await fireEvent.pointerMove(toast, { clientY: 60, pointerId: 1 });
    await fireEvent.pointerUp(toast, { clientY: 60, pointerId: 1 });

    await waitFor(
      () => expect(canvas.queryByRole('status')).not.toBeInTheDocument(),
      { timeout: 2000 },
    );
  },
};

export const ShortSwipeKeepsToast: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByText('Show toast'));
    const toast = await canvas.findByRole('status');

    await fireEvent.pointerDown(toast, { clientY: 100, pointerId: 1 });
    await fireEvent.pointerMove(toast, { clientY: 90, pointerId: 1 });
    await fireEvent.pointerUp(toast, { clientY: 90, pointerId: 1 });

    await expect(canvas.getByRole('status')).toBeInTheDocument();
  },
};

export const HoldPausesTimer: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByText('Show toast'));
    const toast = await canvas.findByRole('status');

    await fireEvent.pointerDown(toast, { clientY: 100, pointerId: 1 });
    await new Promise((resolve) => setTimeout(resolve, 3500));
    await expect(canvas.getByRole('status')).toBeInTheDocument();

    await fireEvent.pointerUp(toast, { clientY: 100, pointerId: 1 });
    await waitFor(
      () => expect(canvas.queryByRole('status')).not.toBeInTheDocument(),
      { timeout: 8000 },
    );
  },
};

const onOpen = fn();

export const ActivityBanner: Story = {
  args: {
    toast: {
      title: 'xhev copied your username',
      description: '',
      activity: { actionLabel: 'View profile', onOpen },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByText('Show toast'));

    const banner = await canvas.findByRole('alert');
    await expect(banner).toHaveTextContent('Polycord');
    await expect(banner).toHaveTextContent('now');
    await expect(banner).toHaveTextContent('xhev copied your username');
    await expect(banner).toHaveTextContent('View profile');
    await expect(within(banner).queryByText('?')).not.toBeInTheDocument();

    await userEvent.click(within(banner).getByRole('button'));

    await expect(onOpen).toHaveBeenCalledTimes(1);
    await waitFor(
      () => expect(canvas.queryByRole('alert')).not.toBeInTheDocument(),
      { timeout: 2000 },
    );
  },
};

export const ActivityBannerSwipeUp: Story = {
  args: ActivityBanner.args,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    onOpen.mockClear();

    await userEvent.click(canvas.getByText('Show toast'));
    const banner = await canvas.findByRole('alert');

    await fireEvent.pointerDown(banner, { clientY: 80, pointerId: 1 });
    await fireEvent.pointerMove(banner, { clientY: 40, pointerId: 1 });
    await fireEvent.pointerUp(banner, { clientY: 40, pointerId: 1 });

    await waitFor(
      () => expect(canvas.queryByRole('alert')).not.toBeInTheDocument(),
      { timeout: 2000 },
    );
    await expect(onOpen).not.toHaveBeenCalled();
  },
};

const showsDetailInOneColumn: Story['play'] = async ({
  args,
  canvasElement,
}) => {
  const canvas = within(canvasElement);

  await userEvent.click(canvas.getByText('Show toast'));

  const toast = await canvas.findByRole('status');
  await expect(toast).toHaveTextContent(args.toast.title);
  await expect(toast).toHaveTextContent(args.toast.mobileDescription ?? '');
  await expect(toast.children).toHaveLength(2);
  const text = (toast.lastElementChild as HTMLElement).getBoundingClientRect();
  await expect(text.width).toBeGreaterThan(
    toast.getBoundingClientRect().width - 70,
  );
};

export const CooldownDetail: Story = {
  args: {
    toast: {
      title: 'Bump cooling down',
      description: 'Try again in 2 hours 59 minutes.',
      mobileDescription: 'Try again in 2 hours 59 minutes.',
      variant: 'error',
    },
  },
  play: showsDetailInOneColumn,
};

export const CooldownDetailJapanese: Story = {
  globals: { locale: 'ja' },
  args: {
    toast: {
      title: 'まだバンプできません',
      description: 'あと2時間59分で再試行できます。',
      mobileDescription: 'あと2時間59分で再試行できます。',
      variant: 'error',
    },
  },
  play: showsDetailInOneColumn,
};

export const PrerequisiteStatus: Story = {
  args: {
    toast: {
      title: 'Log in to save profiles',
      description: '',
      variant: 'info',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByText('Show toast'));

    const toast = await canvas.findByRole('status');
    await expect(toast.querySelector('svg')).toHaveClass('text-muted');
  },
};

const bump = fn();

export const FirstBumpPrompt: Story = {
  globals: { locale: 'ja' },
  args: {
    toast: {
      title: 'プロフィールをバンプしてディスカバリーに表示しましょう',
      description: '',
      mobileDescription: '新しいプロフィールは最初のバンプ後に表示されます。',
      activity: { actionLabel: '今すぐバンプ', onOpen: bump },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByText('Show toast'));

    const banner = await canvas.findByRole('alert');
    await expect(banner).toHaveTextContent(
      '新しいプロフィールは最初のバンプ後に表示されます。',
    );
    await expect(banner).toHaveTextContent('今すぐバンプ');
    await userEvent.click(within(banner).getByRole('button'));
    await expect(bump).toHaveBeenCalledTimes(1);
  },
};

const SeparateStacksDemo = () => {
  const status = useToastStack();
  const banner = useToastStack();

  return (
    <>
      <div className="flex gap-2 p-4">
        <Button
          onClick={() =>
            status.addToast({ title: 'Bump cooling down', description: '' })
          }
        >
          Show status
        </Button>
        <Button
          onClick={() =>
            banner.addToast({
              title: 'xhev copied your username',
              description: '',
              activity: { onOpen: fn() },
            })
          }
        >
          Show banner
        </Button>
      </div>
      <ToastStack toasts={status.toasts} onDismiss={status.dismissToast} />
      <ToastStack toasts={banner.toasts} onDismiss={banner.dismissToast} />
    </>
  );
};

export const BannerReplacesStatusFromAnotherStack: Story = {
  render: () => <SeparateStacksDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByText('Show status'));
    await canvas.findByRole('status');
    await userEvent.click(canvas.getByText('Show banner'));

    await expect(await canvas.findByRole('alert')).toBeInTheDocument();
    await waitFor(() =>
      expect(canvas.queryByRole('status')).not.toBeInTheDocument(),
    );
  },
};

export const BlockToastHasNoUndo: Story = {
  args: {
    toast: {
      title: 'ユーザーをブロックしました',
      description: (
        <span>
          このユーザーのプロフィールはディスカバリーに表示されません。
          <button type="button">元に戻す</button>
        </span>
      ),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByText('Show toast'));
    const toast = await canvas.findByRole('status');

    await expect(within(toast).queryByRole('button')).not.toBeInTheDocument();
    await expect(toast.getBoundingClientRect().height).toBeLessThan(60);
  },
};
