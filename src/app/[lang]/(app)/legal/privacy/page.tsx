import { getLegalDocument, LegalDocument } from '@/features/Legal';
import { tracePage } from '@/lib/pageLoadTrace';

async function PrivacyRoute({ params }: { params: Promise<{ lang: string }> }) {
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

export default tracePage('legal/privacy', PrivacyRoute);
