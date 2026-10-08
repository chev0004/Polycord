import { DiscoveryShell } from '@/features/Discovery/DiscoveryShell';
import { DISCOVERY_SKELETON_ENABLED } from '@/features/Discovery/skeletonSetting';
import { ServerDiscovery } from './ServerDiscovery';

export default async function Home(props: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!DISCOVERY_SKELETON_ENABLED) return <ServerDiscovery {...props} />;
  const { lang } = await props.params;
  return <DiscoveryShell locale={lang} />;
}
