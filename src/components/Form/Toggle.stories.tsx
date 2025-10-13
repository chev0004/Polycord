import type { Meta, StoryObj } from '@storybook/react';
import { useId } from 'react';
import { Label } from './Label';
import { Toggle } from './Toggle';

const meta: Meta<typeof Toggle> = {
  title: 'Components/Form/Toggle',
  component: Toggle,
  decorators: [
    (Story) => (
      <div className="flex items-center space-x-2 p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Toggle>;

const ToggleWithLabel = () => {
  const id = useId();
  return (
    <>
      <Toggle id={id} />
      <Label htmlFor={id}>Toggle</Label>
    </>
  );
};

export const Default: Story = {
  render: () => <ToggleWithLabel />,
};
