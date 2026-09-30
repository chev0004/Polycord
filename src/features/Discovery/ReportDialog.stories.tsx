import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { ReportDialog } from './ReportDialog';
import 'src/app/globals.css';

const meta: Meta<typeof ReportDialog> = {
  title: 'Discovery/ReportDialog',
  component: ReportDialog,
  args: {
    open: true,
    onOpenChange: fn(),
    profileName: 'User 1',
    onSubmit: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ReportDialog>;

export const Default: Story = {};

export const ReasonSelected: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(await body.findByText('Harassment or hate'));
    await userEvent.type(
      await body.findByPlaceholderText(
        'Add any context that will help us review this report.',
      ),
      'They keep sending unsolicited promotional links.',
    );
  },
};

export const OpensWithTransition: Story = {
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument;
    const dialog = await within(doc.body).findByRole('dialog');
    const overlay = doc.querySelector('.DialogOverlay') as HTMLElement;
    await expect(getComputedStyle(overlay).animationName).toBe('sheetFadeIn');
    await expect(getComputedStyle(dialog).animationName).toBe('popIn');
    const box = dialog.getBoundingClientRect();
    const view = doc.defaultView as Window;
    await expect(
      Math.abs(box.left + box.width / 2 - view.innerWidth / 2),
    ).toBeLessThan(2);
    await expect(
      Math.abs(box.top + box.height / 2 - view.innerHeight / 2),
    ).toBeLessThan(2);
  },
};
