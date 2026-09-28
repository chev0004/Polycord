'use client';

import { MdArrowBack } from 'react-icons/md';
import { useRouteProgressRouter } from './RouteProgress';

export const BackButton = ({
  href,
  label,
}: {
  href: string;
  label: string;
}) => {
  const router = useRouteProgressRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="mb-4 inline-flex h-9 items-center gap-1.5 rounded-full pr-3.5 pl-2.5 text-muted text-sm transition-colors hover:bg-background-dark hover:text-foreground focus:outline-none focus-visible:bg-background-dark focus-visible:text-foreground"
    >
      <MdArrowBack size={18} />
      {label}
    </button>
  );
};
