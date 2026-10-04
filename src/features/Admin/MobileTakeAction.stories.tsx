import type { Meta, StoryObj } from '@storybook/react';
import {
  expect,
  fireEvent,
  fn,
  screen,
  userEvent,
  waitFor,
  within,
} from '@storybook/test';
import { MobileTakeAction } from './MobileTakeAction';
import { moderationSnapshot } from './moderationFixtures';
import type { ModUser } from './types';

const actionFetch = fn();

const ryan = moderationSnapshot.users.find(
  (user) => user.id === 'ryan',
) as ModUser;
const flagged = { ...ryan, hidden: true, warnings: 2 };
const tomas = moderationSnapshot.users.find(
  (user) => user.id === 'tomas',
) as ModUser;
const kenji = moderationSnapshot.users.find(
  (user) => user.id === 'kenji',
) as ModUser;
let subject = flagged;

const mockCaseApi = () => {
  const original = globalThis.fetch;
  actionFetch.mockReset();
  globalThis.fetch = Object.assign(
    async (...args: Parameters<typeof fetch>) => {
      const url = String(args[0]);
      if (url.startsWith('/api/admin/case')) {
        return new Response(
          JSON.stringify({
            userId: subject.id,
            users: [
              ...moderationSnapshot.users.filter(
                (user) => user.id !== subject.id,
              ),
              subject,
            ],
            reports: moderationSnapshot.reports.filter(
              (report) => report.userId === subject.id,
            ),
            log: [],
          }),
        );
      }
      if (url !== '/api/admin/moderation') return original(...args);
      const body = JSON.parse(String(args[1]?.body));
      actionFetch(body);
      return new Response(
        JSON.stringify({
          users: [{ ...flagged, warnings: flagged.warnings + 1 }],
          reports: [],
          log: [
            {
              id: 'action-1',
              action: body.action,
              userId: 'ryan',
              staffId: 'kenji',
              note: body.note,
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      );
    },
    { preconnect: original.preconnect },
  );
  return () => {
    globalThis.fetch = original;
  };
};

const openedSheet = async () => {
  await screen.findByText('@ryanmercer.fx');
  return within(screen.getByRole('dialog', { name: 'Ryan Mercer' }));
};

const meta: Meta<typeof MobileTakeAction> = {
  title: 'Features/Admin/MobileTakeAction',
  component: MobileTakeAction,
  parameters: {
    layout: 'fullscreen',
    viewport: { defaultViewport: 'mobile1' },
  },
  args: {
    profileId: 'profile-ryan',
    displayName: 'Ryan Mercer',
    meId: 'kenji',
    meRole: 'owner',
    addToast: fn(),
    onClose: fn(),
  },
  beforeEach: mockCaseApi,
};

export default meta;
type Story = StoryObj<typeof MobileTakeAction>;

export const Owner: Story = {
  play: async () => {
    const sheet = await openedSheet();
    await expect(sheet.getByText('@ryanmercer.fx')).toBeInTheDocument();
    await expect(
      sheet.getByRole('button', { name: /Discord ID/ }),
    ).toHaveTextContent('10000000000000ryan');
    await expect(sheet.getByText(/Profile hidden|Hidden/)).toBeInTheDocument();
    await expect(sheet.getByText('Warned 2×')).toBeInTheDocument();
    await expect(
      sheet.getByRole('button', { name: /^Ban/ }),
    ).toBeInTheDocument();
  },
};

export const Moderator: Story = {
  args: { meId: 'tomas', meRole: 'moderator' },
  play: async () => {
    const sheet = await openedSheet();
    await expect(
      sheet.queryByRole('button', { name: /^Ban/ }),
    ).not.toBeInTheDocument();
    await expect(
      sheet.queryByRole('button', { name: /Supporter/ }),
    ).not.toBeInTheDocument();
  },
};

const protectedSheet = (
  target: ModUser,
  args: Story['args'],
  notice: RegExp,
): Story => ({
  args: {
    profileId: `profile-${target.id}`,
    displayName: target.displayName,
    ...args,
  },
  beforeEach: () => {
    subject = target;
    return () => {
      subject = flagged;
    };
  },
  play: async () => {
    await screen.findByText(`@${target.username}`);
    const sheet = within(
      screen.getByRole('dialog', { name: target.displayName }),
    );
    await expect(sheet.getByText(notice)).toBeInTheDocument();
    await expect(
      sheet.queryByRole('button', { name: /^Suspend/ }),
    ).not.toBeInTheDocument();
    await expect(
      sheet.queryByRole('button', { name: /^Warn/ }),
    ).not.toBeInTheDocument();
  },
});

export const OwnerModeratesModerator: Story = {
  args: { profileId: 'profile-tomas', displayName: 'Tomás Ruiz' },
  beforeEach: () => {
    subject = tomas;
    return () => {
      subject = flagged;
    };
  },
  play: async () => {
    await screen.findByText('@tomas.r');
    const sheet = within(screen.getByRole('dialog', { name: 'Tomás Ruiz' }));
    await expect(
      sheet.queryByText(/Moderator account/),
    ).not.toBeInTheDocument();
    await expect(
      sheet.getByRole('button', { name: /^Suspend/ }),
    ).toBeInTheDocument();
    await expect(
      sheet.getByRole('button', { name: /^Warn/ }),
    ).toBeInTheDocument();
    await expect(
      sheet.getByRole('button', { name: /^Ban/ }),
    ).toBeInTheDocument();
  },
};

export const ModeratorProtectedFromModerator: Story = protectedSheet(
  tomas,
  { meId: 'amara', meRole: 'moderator' },
  /Moderator account/,
);

export const ModeratorProtectedFromOwner: Story = protectedSheet(
  kenji,
  { meId: 'tomas', meRole: 'moderator' },
  /Owner account/,
);

export const OwnerProtectedFromOwner: Story = protectedSheet(
  kenji,
  { meId: 'amara', meRole: 'owner' },
  /Owner account/,
);

export const ChainedSheets: Story = {
  play: async ({ args }) => {
    const sheet = await openedSheet();
    await userEvent.click(
      await sheet.findByRole('button', { name: /^Suspend/ }),
    );
    const suspend = within(
      await screen.findByRole('dialog', { name: 'Suspend Ryan Mercer' }),
    );
    await userEvent.click(suspend.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(
      await within(
        await screen.findByRole('dialog', { name: 'Ryan Mercer' }),
      ).findByRole('button', { name: /^Ban/ }),
    );
    const ban = within(
      await screen.findByRole('dialog', { name: 'Ban Ryan Mercer?' }),
    );
    await userEvent.click(ban.getByRole('button', { name: 'Cancel' }));
    await expect(
      await screen.findByRole('dialog', { name: 'Ryan Mercer' }),
    ).toBeInTheDocument();
    await expect(actionFetch).not.toHaveBeenCalled();
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

export const Warn: Story = {
  play: async ({ args }) => {
    const sheet = await openedSheet();
    await userEvent.click(await sheet.findByRole('button', { name: /^Warn/ }));
    const composer = within(
      await screen.findByRole('dialog', { name: 'Warn Ryan Mercer' }),
    );
    await userEvent.click(composer.getByRole('button', { name: 'Harassment' }));
    await userEvent.click(
      composer.getByRole('button', { name: 'Send warning' }),
    );
    await waitFor(() =>
      expect(actionFetch).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'warn', userId: 'ryan' }),
      ),
    );
    await waitFor(() =>
      expect(args.addToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Warning sent to Ryan Mercer' }),
      ),
    );
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

export const UnhideConfirmation: Story = {
  play: async ({ args }) => {
    const sheet = await openedSheet();
    await expect(sheet.queryByRole('textbox', { name: 'Note' })).toBeNull();
    await userEvent.click(
      sheet.getByRole('button', { name: /^Unhide profile/ }),
    );
    let dialog = within(
      await screen.findByRole('dialog', {
        name: "Unhide Ryan Mercer's profile?",
      }),
    );
    fireEvent.change(dialog.getByRole('textbox', { name: 'Note' }), {
      target: { value: 'Draft note' },
    });
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    await expect(actionFetch).not.toHaveBeenCalled();
    await userEvent.click(
      (await openedSheet()).getByRole('button', { name: /^Unhide profile/ }),
    );
    dialog = within(
      await screen.findByRole('dialog', {
        name: "Unhide Ryan Mercer's profile?",
      }),
    );
    await expect(dialog.getByRole('textbox', { name: 'Note' })).toHaveValue('');
    await userEvent.click(
      dialog.getByRole('button', { name: 'Unhide profile' }),
    );
    await waitFor(() =>
      expect(actionFetch).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'unhide_profile', userId: 'ryan' }),
      ),
    );
    await expect(actionFetch.mock.lastCall?.[0].note).toBeUndefined();
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

export const HideConfirmation: Story = {
  beforeEach: () => {
    subject = ryan;
    return () => {
      subject = flagged;
    };
  },
  play: async () => {
    await userEvent.click(
      (await openedSheet()).getByRole('button', { name: /^Hide profile/ }),
    );
    const dialog = within(
      await screen.findByRole('dialog', {
        name: "Hide Ryan Mercer's profile?",
      }),
    );
    await expect(actionFetch).not.toHaveBeenCalled();
    fireEvent.change(dialog.getByRole('textbox', { name: 'Note' }), {
      target: { value: 'Profile requires review.' },
    });
    await userEvent.click(dialog.getByRole('button', { name: 'Hide profile' }));
    await waitFor(() =>
      expect(actionFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'hide_profile',
          note: 'Profile requires review.',
        }),
      ),
    );
  },
};
