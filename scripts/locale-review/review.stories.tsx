import type { Meta, StoryObj } from '@storybook/react';
import { LocaleReviewer } from './reviewer';

const meta = {
  title: 'Dev/Locale Review',
  component: LocaleReviewer,
} satisfies Meta<typeof LocaleReviewer>;

export default meta;
export const Reviewer: StoryObj<typeof meta> = {};
