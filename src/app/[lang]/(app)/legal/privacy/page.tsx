import { getLegalDocument, LegalDocument } from '@/features/Legal';

export default async function PrivacyRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const { content, isFallback } = getLegalDocument(lang, 'privacy');

  return (
    <LegalDocument
      locale={lang}
      documentId="privacy"
      content={content}
      isFallback={isFallback}
    />
  );
}
