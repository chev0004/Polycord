import type { StaffRole } from '@/features/Admin/types';
import type { DiscoveryProfile } from '@/features/Discovery/ProfileCard';

export type ProfileSheetData = {
  profile: DiscoveryProfile;
  isLoggedIn: boolean;
  isSaved: boolean;
  isOwn: boolean;
  viewerTimezone?: string;
  staff?: { meId: string; role: StaffRole };
};

export type ProfileSheetTarget = string | ProfileSheetData;

let target: ProfileSheetTarget | null = null;
const listeners = new Set<() => void>();

export const profileSheetStore = {
  get: () => target,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  open: (next: ProfileSheetTarget) => {
    target = next;
    for (const listener of listeners) listener();
  },
  close: () => {
    target = null;
    for (const listener of listeners) listener();
  },
};
