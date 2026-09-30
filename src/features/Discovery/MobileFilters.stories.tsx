import type { Meta, StoryObj } from '@storybook/react';
import { expect, waitFor, within } from '@storybook/test';
import { BackToTop } from './MobileFilters';
import 'src/app/globals.css';

const meta: Meta<typeof BackToTop> = {
  title: 'Discovery/BackToTop',
  component: BackToTop,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [
    (Story) => (
      <div className="h-[2000px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BackToTop>;

const scrollToReveal: Story['play'] = async ({ canvasElement, args }) => {
  const view = canvasElement.ownerDocument.defaultView as Window;
  view.scrollTo(0, 1000);
  view.dispatchEvent(new Event('scroll'));
  const button = within(canvasElement).getByRole('button', {
    name: /Back to top/,
  });
  await waitFor(() => expect(button).not.toHaveAttribute('inert'));
  const badge = within(button).getByText(String(args.count));
  const ring = (badge.parentElement as HTMLElement).getBoundingClientRect();
  const box = badge.getBoundingClientRect();
  await expect(ring.top).toBe(box.top);
  await expect(ring.height).toBe(box.height);
};

export const OneFilter: Story = {
  args: { count: 1 },
  play: scrollToReveal,
};

export const SeveralFilters: Story = {
  args: { count: 7 },
  play: scrollToReveal,
};

export const ManyFilters: Story = {
  args: { count: 12 },
  play: scrollToReveal,
};
