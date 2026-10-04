import type { Meta, StoryObj } from '@storybook/react';
import {
  expect,
  fireEvent,
  fn,
  screen,
  userEvent,
  waitFor,
} from '@storybook/test';
import { WarningNotice } from './WarningNotice';

const meta = {
  title: 'Inbox/WarningNotice',
  component: WarningNotice,
  parameters: {
    layout: 'fullscreen',
    viewport: { defaultViewport: 'mobile1' },
  },
  args: {
    open: true,
    acknowledged: false,
    onAcknowledge: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof WarningNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

const fillsViewport = (panel: HTMLElement) => {
  const rect = panel.getBoundingClientRect();
  if (window.innerWidth < 768) {
    expect(rect.width).toBe(window.innerWidth);
    expect(rect.height).toBe(window.innerHeight);
  } else {
    expect(rect.width).toBeLessThanOrEqual(540);
  }
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
    window.innerWidth,
  );
};

export const BeforeAcknowledgement: Story = {
  play: async ({ args }) => {
    const dialog = await screen.findByRole('alertdialog');
    const checkbox = screen.getByRole('checkbox', {
      name: 'I have read and understand this warning.',
    });
    const proceed = screen.getByRole('button', { name: 'Continue' });
    fillsViewport(dialog.firstElementChild as HTMLElement);

    await expect(screen.getByText('Note from moderation')).toBeInTheDocument();
    await expect(
      screen.getByRole('heading', { name: 'Harassment Offense Warning' }),
    ).toBeInTheDocument();
    await expect(
      screen.getByRole('link', { name: 'Community Guidelines' }),
    ).toHaveAttribute('href', '/en/legal/guidelines');
    await expect(
      screen.getByText(
        'This is a warning and no other action has been taken. If this continues, your profile may be hidden and your account suspended or banned.',
      ),
    ).toBeInTheDocument();

    await expect(checkbox).not.toHaveFocus();
    await expect(dialog.contains(document.activeElement)).toBe(true);
    await expect(document.body).toHaveAttribute('data-scroll-locked');
    await expect(screen.queryByRole('button', { name: /close/i })).toBeNull();
    await expect(proceed).toBeDisabled();

    await userEvent.keyboard('{Escape}');
    await fireEvent.pointerDown(dialog);
    await expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await expect(args.onClose).not.toHaveBeenCalled();

    for (let index = 0; index < 4; index += 1) await userEvent.tab();
    await expect(dialog.contains(document.activeElement)).toBe(true);

    await userEvent.click(checkbox);
    await expect(proceed).toBeEnabled();
    await userEvent.click(proceed);
    await waitFor(() => expect(args.onAcknowledge).toHaveBeenCalledOnce());
  },
};

export const AfterAcknowledgement: Story = {
  args: { acknowledged: true },
  play: async ({ args }) => {
    const dialog = await screen.findByRole('alertdialog');
    fillsViewport(dialog.firstElementChild as HTMLElement);

    await expect(screen.queryByRole('checkbox')).toBeNull();
    const note = screen.getByText(/^This is a warning and no other action/);
    await expect(note.className).not.toContain('pl-[34px]');

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(args.onClose).toHaveBeenCalledOnce());
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(args.onClose).toHaveBeenCalledTimes(2));
  },
};

export const Japanese: Story = {
  globals: { locale: 'ja' },
  play: async () => {
    await expect(
      await screen.findByRole('heading', { name: '嫌がらせ行為に関する警告' }),
    ).toBeInTheDocument();
    await expect(
      screen.getByRole('link', { name: 'コミュニティガイドライン' }),
    ).toHaveAttribute('href', '/ja/legal/guidelines');
    await expect(
      screen.getByRole('checkbox', { name: 'この警告を読み、理解しました。' }),
    ).toBeInTheDocument();
  },
};
