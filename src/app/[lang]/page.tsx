import { DiscoveryShell } from '@/features/Discovery/DiscoveryShell';

export default async function Home({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return <DiscoveryShell locale={lang} />;
}
