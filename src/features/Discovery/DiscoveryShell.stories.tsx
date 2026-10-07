import type { Meta, StoryObj } from '@storybook/react';
import { expect, fireEvent, waitFor, within } from '@storybook/test';
import { DiscoveryShell } from './DiscoveryShell';

const meta: Meta<typeof DiscoveryShell> = {
  title: 'Discovery/DiscoveryShell',
  component: DiscoveryShell,
  args: { locale: 'en' },
  parameters: { nextjs: { appDirectory: true } },
};

export default meta;
type Story = StoryObj<typeof DiscoveryShell>;

export const Pending: Story = {
  beforeEach: () => {
    const original = globalThis.fetch;
    globalThis.fetch = Object.assign(
      (...args: Parameters<typeof fetch>) =>
        String(args[0]).startsWith('/api/discovery')
          ? new Promise<Response>(() => {})
          : original(...args),
      { preconnect: original.preconnect },
    );
    return () => {
      globalThis.fetch = original;
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: 'Search profiles' });
    fireEvent.change(input, { target: { value: 'Waiting search' } });
    await expect(input).toHaveValue('Waiting search');
    await expect(
      canvas.getByRole('button', { name: 'Primary Language' }),
    ).toBeEnabled();
    await expect(canvas.getByRole('button', { name: 'Sort' })).toBeEnabled();
    await expect(
      canvas.getByRole('status', { name: 'Loading your account' }),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByRole('button', { name: 'Login with Discord' }),
    ).not.toBeInTheDocument();
  },
};

export const AccountRetry: Story = {
  beforeEach: () => {
    const original = globalThis.fetch;
    let viewerCalls = 0;
    globalThis.fetch = Object.assign(
      (...args: Parameters<typeof fetch>) => {
        const url = String(args[0]);
        if (url.startsWith('/api/discovery/viewer'))
          return Promise.resolve(
            ++viewerCalls === 1
              ? new Response('{}', { status: 503 })
              : Response.json({ isLoggedIn: false }),
          );
        if (url.startsWith('/api/discovery?'))
          return Promise.resolve(
            Response.json({
              profiles: [],
              total: 0,
              page: 1,
              tags: [],
              savedProfileIds: [],
            }),
          );
        return original(...args);
      },
      { preconnect: original.preconnect },
    );
    return () => {
      globalThis.fetch = original;
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByRole('alert')).toBeInTheDocument());
    fireEvent.click(
      within(canvas.getByRole('alert')).getByRole('button', {
        name: 'Try again',
      }),
    );
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: 'Login with Discord' }),
      ).toBeInTheDocument(),
    );
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
  },
};

export const TracedOwner: Story = {
  beforeEach: () => {
    const bootstrap = document.createElement('script');
    bootstrap.id = 'polycord-load-trace';
    bootstrap.type = 'application/json';
    bootstrap.textContent = JSON.stringify({ transport: 'https', spans: {} });
    document.head.append(bootstrap);
    const original = globalThis.fetch;
    globalThis.fetch = Object.assign(
      (...args: Parameters<typeof fetch>) => {
        const url = String(args[0]);
        if (url.startsWith('/api/discovery'))
          return new Promise<Response>((resolve) => {
            const viewer = url.startsWith('/api/discovery/viewer');
            setTimeout(
              () =>
                resolve(
                  Response.json(
                    viewer
                      ? {
                          isLoggedIn: true,
                          staff: { meId: 'trace-owner', role: 'owner' },
                          pendingCases: 0,
                        }
                      : {
                          profiles: [
                            {
                              id: 'trace-profile',
                              displayName: 'Trace member',
                              primaryLanguage: 'ja',
                              targetLanguages: [{ language: 'en' }],
                              tags: [],
                              bumpedMinutesAgo: 0,
                            },
                          ],
                          total: 1,
                          page: 1,
                          tags: [],
                          savedProfileIds: [],
                        },
                  ),
                ),
              viewer ? 1200 : 2200,
            );
          });
        return Promise.resolve(Response.json({ notifications: [], total: 0 }));
      },
      { preconnect: original.preconnect },
    );
    return () => {
      globalThis.fetch = original;
      bootstrap.remove();
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(
        canvas.getByRole('complementary', { name: 'Discovery load trace' }),
      ).toBeInTheDocument(),
    );
    await expect(
      canvas.getByText(/counting from navigation/),
    ).toBeInTheDocument();
    const input = canvas.getByRole('textbox', { name: 'Search profiles' });
    fireEvent.change(input, { target: { value: 'Trace member' } });
    await expect(input).toHaveValue('Trace member');
    await waitFor(
      () => expect(canvas.getByText(/Initial grid ready/)).toBeInTheDocument(),
      { timeout: 10000 },
    );
    await expect(canvas.getAllByText('Trace member').length).toBeGreaterThan(0);
    const clock = canvas
      .getByRole('complementary')
      .querySelector('summary')?.textContent;
    await new Promise((resolve) => setTimeout(resolve, 250));
    await expect(
      canvas.getByRole('complementary').querySelector('summary')?.textContent,
    ).toBe(clock);
  },
};
