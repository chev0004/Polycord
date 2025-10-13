import type { Meta, StoryObj } from '@storybook/react';
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
  },
};
