import { LegalHub } from '@/features/Legal';

export default async function LegalIndexRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return <LegalHub locale={lang} />;
}
