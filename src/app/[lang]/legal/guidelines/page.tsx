import { getLegalDocument, LegalDocument } from '@/features/Legal';

export default async function GuidelinesRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const { content, isFallback } = getLegalDocument(lang, 'guidelines');

  return (
    <LegalDocument
      locale={lang}
      documentId="guidelines"
      content={content}
      isFallback={isFallback}
    />
  );
}
