import { getLegalDocument, LegalDocument } from '@/features/Legal';
import { getCurrentUser } from '@/lib/auth';

export default async function GuidelinesRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const user = await getCurrentUser();
  const { content, isFallback } = getLegalDocument(lang, 'guidelines');

  return (
    <LegalDocument
      locale={lang}
      documentId="guidelines"
      content={content}
      isFallback={isFallback}
      isLoggedIn={Boolean(user)}
      userAvatarUrl={user?.avatarUrl}
    />
  );
}
