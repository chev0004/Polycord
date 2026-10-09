import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { RouteProgressProvider } from '@/features/Navigation/RouteProgress';
import { Footer } from './Footer';
import 'src/app/globals.css';

const meta: Meta<typeof Footer> = {
  title: 'Features/Footer/Footer',
  component: Footer,
  parameters: { layout: 'fullscreen', nextjs: { appDirectory: true } },
  args: { locale: 'en' },
  decorators: [
    (Story) => (
      <RouteProgressProvider>
        <div className="min-h-[420px] pt-24">
          <Story />
        </div>
      </RouteProgressProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Footer>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText('Find language exchange partners on Discord.'),
    ).toBeInTheDocument();
    await expect(
      canvas.getByText(
        "Polycord is for finding language partners. Anything Discord's Terms of Service does not allow has no place here.",
      ),
    ).toBeInTheDocument();
    await expect(canvas.queryByRole('link', { name: /join discord/i })).toBe(
      null,
    );
    await expect(canvas.getByRole('link', { name: 'English' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await expect(
      canvas.getByRole('link', { name: 'Terms of Service' }),
    ).toHaveAttribute('href', '/en/legal/terms');
    const footer = canvasElement.querySelector('footer');
    await expect(footer && getComputedStyle(footer).backgroundColor).toBe(
      'rgb(17, 17, 17)',
    );
    await expect(canvasElement.querySelector('footer svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  },
};

export const WithInvite: Story = {
  args: { inviteUrl: 'https://discord.gg/polycord' },
  play: async ({ canvasElement }) => {
    const join = within(canvasElement).getByRole('link', {
      name: 'Join Discord Server',
    });
    await expect(join).toHaveAttribute('href', 'https://discord.gg/polycord');
    await expect(join).toHaveAttribute('target', '_blank');
  },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  args: { inviteUrl: 'https://discord.gg/polycord' },
  play: async ({ canvasElement }) => {
    const terms = within(canvasElement).getByRole('link', {
      name: 'Terms of Service',
    });
    await expect(terms.getBoundingClientRect().height).toBeGreaterThanOrEqual(
      44,
    );
    const columns = canvasElement.querySelectorAll('footer nav');
    await expect(columns[1].getBoundingClientRect().left).toBeGreaterThan(
      columns[0].getBoundingClientRect().left,
    );
  },
};
