import { cookies } from 'next/headers';
import { DiscoveryShell } from '@/features/Discovery/DiscoveryShell';
import { DISCOVERY_SKELETON_ENABLED } from '@/features/Discovery/skeletonSetting';
import { hasOwnerDevToggle } from '@/lib/devSettings';
import { ServerDiscovery } from './ServerDiscovery';

export default async function Home(props: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!DISCOVERY_SKELETON_ENABLED) {
    const jar = await cookies();
    if (!(await hasOwnerDevToggle((name) => jar.get(name)?.value, 'skeleton')))
      return <ServerDiscovery {...props} />;
  }
  const { lang } = await props.params;
  return <DiscoveryShell locale={lang} />;
}
