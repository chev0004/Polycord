import type { Meta, StoryObj } from '@storybook/react';
import { expect, screen, userEvent, within } from '@storybook/test';
import { RouteProgressProvider } from '@/features/Navigation/RouteProgress';
import { LanguageSwitcher } from './LanguageSwitcher';

const meta: Meta<typeof LanguageSwitcher> = {
  title: 'Components/LanguageSwitcher',
  component: LanguageSwitcher,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/en',
      },
    },
  },
  decorators: [
    (Story) => (
      <RouteProgressProvider>
        <div className="flex justify-end bg-background-darker p-10">
          <Story />
        </div>
      </RouteProgressProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LanguageSwitcher>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = await canvas.findByRole('button', {
      name: 'Change language',
    });

    await userEvent.click(trigger);

    await expect(await screen.findByText('English')).toBeInTheDocument();
    await expect(await screen.findByText('Japanese')).toBeInTheDocument();
  },
};
