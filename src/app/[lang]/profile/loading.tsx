const sectionRowKeys = (section: string, rows: number) =>
  Array.from({ length: rows }, (_, index) => `${section}-row-${index}`);

const SectionSkeleton = ({ rowKeys }: { rowKeys: string[] }) => (
  <div className="flex flex-col gap-5 rounded-3xl bg-background-dark p-6 shadow-xl">
    <div className="flex flex-col gap-2 border-white/10 border-b pb-3.5">
      <div className="skeleton-shimmer h-5 w-40 rounded" />
      <div className="skeleton-shimmer h-3 w-64 rounded" />
    </div>
    {rowKeys.map((key) => (
      <div key={key} className="flex flex-col gap-2">
        <div className="skeleton-shimmer h-3 w-28 rounded" />
        <div className="skeleton-shimmer h-10 w-full rounded-lg" />
      </div>
    ))}
  </div>
);

export default function ProfileLoading() {
  return (
    <main className="min-h-screen bg-background-main">
      <div
        className="mx-auto w-full max-w-[1140px] px-6 pt-8 pb-24"
        aria-hidden
      >
        <div className="mb-6 flex flex-col gap-2">
          <div className="skeleton-shimmer h-8 w-52 rounded" />
          <div className="skeleton-shimmer h-4 w-80 rounded" />
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-5">
            <SectionSkeleton rowKeys={sectionRowKeys('profile-languages', 3)} />
            <SectionSkeleton rowKeys={sectionRowKeys('profile-about', 2)} />
          </div>
          <div className="skeleton-shimmer h-[420px] rounded-3xl" />
        </div>
      </div>
    </main>
  );
}
