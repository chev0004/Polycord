import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from '@storybook/test';
import {
  type CardTheme,
  findCardTheme,
  getCustomCardTheme,
} from '@/features/Discovery/cardTheme';
import { RouteProgressProvider, useRouteProgress } from './RouteProgress';

const StartButton = () => {
  const { start } = useRouteProgress();
  return (
    <button
      type="button"
      className="m-8 text-foreground"
      onClick={() => start()}
    >
      Start
    </button>
  );
};

const RouteProgressDemo = ({ theme }: { theme?: CardTheme }) => (
  <RouteProgressProvider theme={theme}>
    <StartButton />
  </RouteProgressProvider>
);

const meta = {
  title: 'Navigation/RouteProgress',
  component: RouteProgressDemo,
  parameters: { layout: 'fullscreen', nextjs: { appDirectory: true } },
} satisfies Meta<typeof RouteProgressDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

const startAndExpect =
  (property: 'backgroundColor' | 'backgroundImage', value: string) =>
  async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: 'Start' }),
    );
    const bar = canvasElement.querySelector<HTMLElement>('div.fixed');
    await waitFor(() => expect(bar).toHaveClass('opacity-100'));
    await expect(getComputedStyle(bar as HTMLElement)[property]).toBe(value);
  };

export const Default: Story = {
  play: startAndExpect('backgroundColor', 'rgb(193, 213, 233)'),
};

export const Gray: Story = {
  args: { theme: findCardTheme('slate') },
  play: startAndExpect('backgroundColor', 'rgb(70, 82, 95)'),
};

export const Pink: Story = {
  args: { theme: findCardTheme('pink') },
  play: startAndExpect('backgroundColor', 'rgb(249, 168, 207)'),
};

export const SupporterGradient: Story = {
  args: { theme: findCardTheme('gold') },
  play: startAndExpect(
    'backgroundImage',
    'linear-gradient(115deg, rgb(236, 159, 10), rgb(240, 177, 51) 60%, rgb(244, 195, 92))',
  ),
};

export const CustomSolid: Story = {
  args: { theme: getCustomCardTheme({ from: '#2bb673', to: '#2bb673' }) },
  play: startAndExpect(
    'backgroundImage',
    'linear-gradient(115deg, rgb(43, 182, 115), rgb(43, 182, 115))',
  ),
};

export const CustomGradient: Story = {
  args: { theme: getCustomCardTheme({ from: '#ff5f6d', to: '#ffc371' }) },
  play: startAndExpect(
    'backgroundImage',
    'linear-gradient(115deg, rgb(255, 95, 109), rgb(255, 195, 113))',
  ),
};
