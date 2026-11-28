import type { Meta, StoryObj } from '@storybook/react';
import { SavedRouteClient } from '@/app/[lang]/(app)/saved/SavedRouteClient';
import { SettingsPage } from '@/features/Settings/SettingsPage';
import pageMeta from '@/features/Settings/SettingsPage.stories';

const meta = {
  title: 'Review/Settings',
  component: SettingsPage,
  parameters: pageMeta.parameters,
  decorators: pageMeta.decorators,
  args: pageMeta.args,
} satisfies Meta<typeof SettingsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaults = pageMeta.args?.defaultValues as NonNullable<
  Story['args']
>['defaultValues'] & {};

export const Unlisted: Story = {
  args: {
    premium: true,
    defaultValues: { ...defaults, isPublic: false },
  },
  beforeEach: () => {
    const original = Notification.requestPermission;
    Notification.requestPermission = async () => 'denied';
    return () => {
      Notification.requestPermission = original;
    };
  },
};

export const Exporting: Story = {
  args: { onExportData: () => new Promise<void>(() => {}) },
};

export const Exported: Story = { args: { onExportData: async () => {} } };

export const ExportFailed: Story = {
  args: {
    onExportData: async () => {
      throw new Error('failed');
    },
  },
};

export const Owner: Story = {
  args: {
    owner: true,
    defaultValues: {
      ...defaults,
      loadTracing: false,
      discoverySkeleton: false,
    },
    onSubmit: async () => {},
  },
};

export const NothingSaved: Story = {
  render: () => <SavedRouteClient locale="en" profiles={[]} />,
};
