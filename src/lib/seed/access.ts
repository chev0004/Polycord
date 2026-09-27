import 'server-only';

import { countAccounts, getSeedDatabase } from '@/db';
import type { SeedStatus } from '@/features/Admin/types';
import { getStaffRole } from '@/lib/admin';
import type { getCurrentUser } from '@/lib/auth';
import { SEED_CAP } from './limits';

const SEED_ENVIRONMENTS = ['local', 'staging'];

export const seedEnvironment = () => {
  const environment = process.env.POLYCORD_ENVIRONMENT ?? '';
  if (process.env.POLYCORD_SEED_ENABLED !== 'true') return null;
  if (!SEED_ENVIRONMENTS.includes(environment)) return null;
  if (process.env.POLYCORD_PUBLIC_URL) return null;
  return environment;
};

export const getSeedStatus = async (
  user: Awaited<ReturnType<typeof getCurrentUser>>,
): Promise<SeedStatus | null> => {
  const environment = seedEnvironment();
  if (!environment || !user || !(await getStaffRole(user))) return null;
  const database = await getSeedDatabase();
  if (!database) return null;
  return {
    ...(await countAccounts()),
    cap: SEED_CAP,
    label: database.label,
    shared: database.shared,
    environment,
  };
};
