import { MemberEmptyState } from '@/features/Profile/MemberEmptyState';

export default function MemberNotFound() {
  return (
    <main className="mx-auto w-full max-w-[1080px] px-4 py-8 sm:px-6">
      <MemberEmptyState kind="notFound" />
    </main>
  );
}
