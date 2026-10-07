import { LegalHub } from '@/features/Legal';
import { tracePage } from '@/lib/pageLoadTrace';

async function LegalIndexRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return <LegalHub locale={lang} />;
}

export default tracePage('legal', LegalIndexRoute);
