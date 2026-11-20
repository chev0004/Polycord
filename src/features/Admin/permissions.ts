import type { ModUser, StaffRole } from './types';

export const canModerate = (actor: StaffRole, target?: StaffRole) =>
  target === undefined || (actor === 'owner' && target === 'moderator');

export const protectionOf = (
  store: { meId: string; meRole: StaffRole },
  user: Pick<ModUser, 'id' | 'role'>,
) => {
  if (user.id === store.meId) return 'self';
  if (canModerate(store.meRole, user.role)) return null;
  return user.role === 'owner' ? 'owner' : 'staff';
};

export const canDismissReports = (
  store: { meId: string; meRole: StaffRole },
  user: Pick<ModUser, 'id' | 'role'>,
) => store.meRole === 'owner' || protectionOf(store, user) === null;
