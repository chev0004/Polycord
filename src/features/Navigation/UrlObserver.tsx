'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

const Listener = ({
  onChange,
}: {
  onChange: (query: string, pathname: string) => void;
}) => {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  useEffect(() => onChange(query, pathname), [query, pathname, onChange]);
  return null;
};

export const UrlObserver = (props: {
  onChange: (query: string, pathname: string) => void;
}) => (
  <Suspense fallback={null}>
    <Listener {...props} />
  </Suspense>
);
