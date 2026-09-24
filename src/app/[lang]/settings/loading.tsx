const navKeys = Array.from(
  { length: 5 },
  (_, index) => `settings-loading-nav-${index}`,
);

const rowKeys = Array.from(
  { length: 4 },
  (_, index) => `settings-loading-row-${index}`,
);

export default function SettingsLoading() {
  return (
    <main className="min-h-screen bg-background-main">
      <div
        className="mx-auto w-full max-w-[1140px] px-6 pt-8 pb-24"
        aria-hidden
      >
        <div className="mb-6 flex flex-col gap-2">
          <div className="skeleton-shimmer h-8 w-40 rounded" />
          <div className="skeleton-shimmer h-4 w-80 rounded" />
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[232px_minmax(0,1fr)]">
          <div className="flex flex-col gap-3 rounded-3xl bg-background-dark p-4 shadow-xl">
            {navKeys.map((key) => (
              <div
                key={key}
                className="skeleton-shimmer h-9 w-full rounded-full"
              />
            ))}
          </div>
          <div className="flex flex-col gap-5 rounded-3xl bg-background-dark p-6 shadow-xl">
            <div className="flex flex-col gap-2 border-line border-b pb-3.5">
              <div className="skeleton-shimmer h-5 w-36 rounded" />
              <div className="skeleton-shimmer h-3 w-60 rounded" />
            </div>
            {rowKeys.map((key) => (
              <div
                key={key}
                className="skeleton-shimmer h-16 w-full rounded-xl"
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
