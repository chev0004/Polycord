import type { Meta, StoryObj } from '@storybook/react';
import { fn, userEvent, within } from '@storybook/test';
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
