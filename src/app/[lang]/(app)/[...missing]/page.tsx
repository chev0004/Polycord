import { notFound } from 'next/navigation';
import { tracePage } from '@/lib/pageLoadTrace';

function MissingPage() {
  return notFound();
}

export default tracePage('[...missing]', MissingPage);
