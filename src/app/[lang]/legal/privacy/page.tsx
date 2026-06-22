import { getLegalDocument, LegalDocument } from '@/features/Legal';
import { getCurrentUser } from '@/lib/auth';

export default async function PrivacyRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const user = await getCurrentUser();
  const { content, isFallback } = getLegalDocument(lang, 'privacy');

  return (
    <LegalDocument
      locale={lang}
      documentId="privacy"
      content={content}
      isFallback={isFallback}
      isLoggedIn={Boolean(user)}
      userAvatarUrl={user?.avatarUrl}
    />
  );
}
