import { getRouter, usePathname } from '@storybook/nextjs/navigation.mock';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fireEvent, waitFor, within } from '@storybook/test';
import { useEffect, useState } from 'react';
import { PageLoadReady, PageLoadTrace } from './PageLoadTrace';
import { RouteProgressProvider, useRouteProgressRouter } from './RouteProgress';

let path = '/en/settings';
const spans = { page: 10 };
const NavigationDemo = () => {
  const [page, setPage] = useState(path);
  const router = useRouteProgressRouter();
  useEffect(() => {
    getRouter().push.mockImplementation((href: string) => {
      setTimeout(() => {
        path = href;
        setPage(href);
      }, 250);
    });
  }, []);
  return (
    <main className="min-h-screen bg-background-main p-8 text-foreground">
      <nav className="flex gap-4">
        {['settings', 'profile', 'saved'].map((route) => (
          <button
            key={route}
            type="button"
            onClick={() => router.push(`/en/${route}`)}
          >
            {route}
          </button>
        ))}
        <button type="button" onClick={() => router.refresh()}>
          refresh
        </button>
      </nav>
      <h1 className="mt-8 font-bold text-2xl">{page}</h1>
      <PageLoadReady route={page} spans={spans} />
      <PageLoadTrace />
    </main>
  );
};

const meta = {
  title: 'Navigation/PageLoadTrace',
  render: () => (
    <RouteProgressProvider>
      <NavigationDemo />
    </RouteProgressProvider>
  ),
  parameters: { layout: 'fullscreen', nextjs: { appDirectory: true } },
  beforeEach: () => {
    path = '/en/settings';
    usePathname.mockImplementation(() => path);
    const bootstrap = document.createElement('script');
    bootstrap.id = 'polycord-load-trace';
    bootstrap.type = 'application/json';
    bootstrap.textContent = JSON.stringify({ transport: 'https', spans: {} });
    document.head.append(bootstrap);
    return () => {
      bootstrap.remove();
      usePathname.mockReset();
    };
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const RepeatedNavigation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(
        canvas.getByText(/Page ready: timers stopped/),
      ).toBeInTheDocument(),
    );
    fireEvent.click(canvas.getByRole('button', { name: 'profile' }));
    await waitFor(() =>
      expect(canvas.getByText(/counting from navigation/)).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        canvas.getByRole('heading', { name: '/en/profile' }),
      ).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        canvas.getByText(/Page ready: timers stopped/),
      ).toBeInTheDocument(),
    );
    fireEvent.click(canvas.getByRole('button', { name: 'saved' }));
    await waitFor(() =>
      expect(
        canvas.getByRole('heading', { name: '/en/saved' }),
      ).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        canvas.getByText(/Page ready: timers stopped/),
      ).toBeInTheDocument(),
    );
    fireEvent.click(canvas.getByText('Previous navigations (2)'));
    await expect(
      within(canvas.getByRole('complementary')).getByText('/en/profile'),
    ).toBeVisible();
    await expect(
      within(canvas.getByRole('complementary')).getByText('/en/settings'),
    ).toBeVisible();
    const timer = canvas
      .getByRole('complementary')
      .querySelector('summary')?.textContent;
    await new Promise((resolve) => setTimeout(resolve, 150));
    await expect(
      canvas.getByRole('complementary').querySelector('summary')?.textContent,
    ).toBe(timer);
  },
};

export const RefreshKeepsVisit: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(
        canvas.getByText(/Page ready: timers stopped/),
      ).toBeInTheDocument(),
    );
    fireEvent.click(canvas.getByRole('button', { name: 'profile' }));
    await waitFor(() =>
      expect(canvas.getByText(/counting from navigation/)).toBeInTheDocument(),
    );
    fireEvent.click(canvas.getByRole('button', { name: 'refresh' }));
    await expect(getRouter().refresh).toHaveBeenCalledOnce();
    await expect(canvas.getByText(/counting from navigation/)).toBeVisible();
    await waitFor(() =>
      expect(
        canvas.getByRole('heading', { name: '/en/profile' }),
      ).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        canvas.getByText(/Page ready: timers stopped/),
      ).toBeInTheDocument(),
    );
    await expect(canvas.getByText('Previous navigations (1)')).toBeVisible();
  },
};
