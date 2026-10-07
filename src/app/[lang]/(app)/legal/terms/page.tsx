import { getLegalDocument, LegalDocument } from '@/features/Legal';

export default async function TermsRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const { content, isFallback } = getLegalDocument(lang, 'terms');

  return (
    <LegalDocument
      locale={lang}
      documentId="terms"
      content={content}
      isFallback={isFallback}
    />
  );
}
