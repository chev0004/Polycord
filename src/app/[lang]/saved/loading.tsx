import { ProfileGridSkeleton } from '@/features/Discovery/ProfileGridSkeleton';

export default function SavedLoading() {
  return (
    <div className="min-h-screen bg-background-main text-white">
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8">
        <header className="mb-[26px] flex flex-col gap-2" aria-hidden>
          <div className="skeleton-shimmer h-3 w-14 rounded" />
          <div className="skeleton-shimmer h-7 w-48 rounded" />
          <div className="skeleton-shimmer h-4 w-72 rounded" />
        </header>
        <ProfileGridSkeleton />
      </main>
    </div>
  );
}
