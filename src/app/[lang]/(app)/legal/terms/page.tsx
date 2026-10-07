import { getLegalDocument, LegalDocument } from '@/features/Legal';
import { tracePage } from '@/lib/pageLoadTrace';

async function TermsRoute({ params }: { params: Promise<{ lang: string }> }) {
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

export default tracePage('legal/terms', TermsRoute);
