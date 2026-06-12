import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { useTranslations } from 'next-intl';
import { FaDiscord } from 'react-icons/fa';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  decorators: [
    (Story) => (
      <div className="p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Button>;

const DefaultStoryComponent = () => {
  const t = useTranslations();
  return <Button>{t('button')}</Button>;
};

export const Default: Story = {
  render: () => <DefaultStoryComponent />,
};

const handlePress = fn();

export const Press: Story = {
  args: {
    children: 'Save Profile',
    onClick: handlePress,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Save Profile' }));

    await expect(handlePress).toHaveBeenCalled();
  },
};

const WithIconStoryComponent = () => {
  const t = useTranslations();
  return (
    <Button variant="discord" weight="bold" icon={() => <FaDiscord />}>
      {t('discordButton')}
    </Button>
  );
};

export const WithIcon: Story = {
  render: () => <WithIconStoryComponent />,
};

export const IconOnly: Story = {
  args: {
    variant: 'white',
    icon: () => <FaDiscord />,
    'aria-label': 'Discord',
  },
};
