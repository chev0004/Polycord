import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { useTranslations } from 'next-intl';
import type { ComponentProps } from 'react';
import { FaDiscord } from 'react-icons/fa';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  args: {
    onClick: fn(),
  },
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

const TranslatedButton = (props: ComponentProps<typeof Button>) => {
  const t = useTranslations();
  return <Button {...props}>{t('button')}</Button>;
};

export const Default: Story = {
  render: (args) => <TranslatedButton {...args} />,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button'));

    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const Outline: Story = {
  render: (args) => <TranslatedButton {...args} variant="outline" />,
};

const WithIconStoryComponent = (props: ComponentProps<typeof Button>) => {
  const t = useTranslations();
  return (
    <Button {...props} variant="discord" weight="bold" icon={FaDiscord}>
      {t('discordButton')}
    </Button>
  );
};

export const WithIcon: Story = {
  render: (args) => <WithIconStoryComponent {...args} />,
};

export const IconOnly: Story = {
  args: {
    variant: 'white',
    icon: FaDiscord,
  },
};

export const Disabled: Story = {
  render: (args) => <TranslatedButton {...args} disabled />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('button')).toBeDisabled();
  },
};
