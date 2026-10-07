import type { AvailabilityPattern } from '@/constants/availability';
import type { TimeFormat } from '@/constants/languages';
import type { StaffRole } from '@/features/Admin/types';
import type { CardTheme } from './cardTheme';

export type DiscoveryViewer = {
  isLoggedIn: boolean;
  userId?: string;
  viewerUserId?: string;
  needsOnboarding?: boolean;
  currentProfileId?: string;
  bumpReadyAt?: string;
  viewerTimezone?: string;
  viewerAvailability?: AvailabilityPattern;
  userAvatarUrl?: string;
  staff?: { meId: string; role: StaffRole };
  pendingCases?: number;
  cardTheme?: CardTheme;
  languageDisplay?: 'long' | 'short';
  timeFormat?: TimeFormat;
};
