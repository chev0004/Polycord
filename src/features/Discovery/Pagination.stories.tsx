import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import { useState } from 'react';
import { Pagination } from './Pagination';
import 'src/app/globals.css';

const meta: Meta<typeof Pagination> = {
  title: 'Discovery/Pagination',
  component: Pagination,
  decorators: [
    (Story) => (
      <div className="bg-background-main p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Pagination>;

const ControlledPagination = ({ totalPages }: { totalPages: number }) => {
  const [page, setPage] = useState(1);

  return (
    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
  );
};

export const Default: Story = {
  render: () => <ControlledPagination totalPages={4} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const prev = canvas.getByRole('button', { name: 'Previous page' });
    const next = canvas.getByRole('button', { name: 'Next page' });

    await expect(canvas.getByText('Page 1 of 4')).toBeInTheDocument();
    await expect(prev).toBeDisabled();
    await expect(next).toBeEnabled();

    await userEvent.click(next);
    await expect(canvas.getByText('Page 2 of 4')).toBeInTheDocument();
    await expect(prev).toBeEnabled();

    await userEvent.click(next);
    await userEvent.click(next);
    await expect(canvas.getByText('Page 4 of 4')).toBeInTheDocument();
    await expect(next).toBeDisabled();

    await userEvent.click(prev);
    await expect(canvas.getByText('Page 3 of 4')).toBeInTheDocument();
    await expect(next).toBeEnabled();
  },
};

export const SinglePage: Story = {
  render: () => <ControlledPagination totalPages={1} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.queryByRole('button', { name: 'Previous page' }),
    ).toBeNull();
    await expect(
      canvas.queryByRole('button', { name: 'Next page' }),
    ).toBeNull();
  },
};
