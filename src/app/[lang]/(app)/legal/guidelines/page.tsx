import { getLegalDocument, LegalDocument } from '@/features/Legal';
import { tracePage } from '@/lib/pageLoadTrace';
import { pageTitle } from '@/lib/pageTitle';

export const generateMetadata = pageTitle('guidelines');

async function GuidelinesRoute({
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

export default tracePage('legal/guidelines', GuidelinesRoute);
