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

export const CooldownDetail: Story = {
  args: {
    toast: {
      title: 'Bump cooling down',
      description: 'Try again in 2 hours.',
      mobileDescription: 'Try again in 2 hours.',
      variant: 'error',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByText('Show toast'));

    const toast = await canvas.findByRole('status');

    await expect(toast).toHaveTextContent('Bump cooling down');
    await expect(toast).toHaveTextContent('Try again in 2 hours.');
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
