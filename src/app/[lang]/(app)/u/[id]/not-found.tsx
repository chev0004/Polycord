import { PageLoadFailure } from '@/features/Navigation/PageLoadTrace';
import { MemberEmptyState } from '@/features/Profile/MemberEmptyState';

export default function MemberNotFound() {
  return (
    <main className="mx-auto w-full max-w-[1080px] px-4 py-8 sm:px-6">
      <PageLoadFailure />
      <MemberEmptyState kind="notFound" />
    </main>
  );
}
