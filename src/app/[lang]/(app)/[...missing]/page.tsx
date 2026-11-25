import { notFound } from 'next/navigation';
import { tracePage } from '@/lib/pageLoadTrace';
import { pageTitle } from '@/lib/pageTitle';

export const generateMetadata = pageTitle('notFound');

function MissingPage() {
  return notFound();
}

export default tracePage('[...missing]', MissingPage);
