import type { GrantUnit } from '@/lib/premiumGrant';
import type { WarningCategory } from '@/types';

export const MODERATION_ACTIONS = [
  'dismiss',
  'warn',
  'hide_profile',
  'unhide_profile',
  'suspend',
  'unsuspend',
  'ban',
  'unban',
] as const;

export const LOG_ACTIONS = [
  ...MODERATION_ACTIONS,
  'grant',
  'revoke',
  'premium_grant',
  'premium_revoke',
  'ip_block',
  'ip_unblock',
] as const;

export const OWNER_ACTIONS = ['ban', 'unban'] as const;

export type ModAction = (typeof MODERATION_ACTIONS)[number];

export type LogAction = (typeof LOG_ACTIONS)[number];

export type StaffRole = 'owner' | 'moderator';

export type ModUser = {
  id: string;
  displayName: string;
  username: string;
  discordId: string;
  avatarUrl?: string;
  joinedAt: string;
  role?: StaffRole;
  bannedAt?: string;
  suspendedUntil?: string;
  hidden: boolean;
  warnings: number;
  premium: {
    grantedUntil?: string;
    subscriptionUntil?: string;
    configured: boolean;
  };
  profile?: {
    bio: string;
    isPublic: boolean;
    primaryLanguage: string;
    targetLanguages: { language: string; level: string }[];
  };
};

export type ModReport = {
  id: string;
  userId: string;
  reporterId: string;
  reason: 'spam' | 'harassment' | 'inappropriate' | 'impersonation' | 'other';
  details?: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  createdAt: string;
};

export type ModLogEntry = {
  id: string;
  action: LogAction;
  userId?: string;
  staffId?: string;
  note?: string;
  days?: number;
  grant?: { amount: number; unit: GrantUnit };
  expiresAt?: string;
  createdAt: string;
};

export type IpBlock = {
  id: string;
  ip: string;
  reason?: string;
  targetDiscordUserId?: string;
  createdAt: string;
};

export type ObservedIp = { ip: string; lastSeenAt: string };

export type ModSuspiciousEvent = {
  id: string;
  action: string;
  userId?: string;
  ip?: string;
  createdAt: string;
};

export type ModSuspicious = ModSuspiciousEvent & { count: number };

export type ModData = {
  users: ModUser[];
  reports: ModReport[];
  log: ModLogEntry[];
};

export type ModSnapshot = ModData & {
  pendingCases: number;
  suspicious: ModSuspicious[];
  staff: string[];
  meId: string;
  meRole: StaffRole;
};

export type ModState = {
  hidden: boolean;
  suspended: boolean;
  banned: boolean;
  warnings: number;
  pendingReports: number;
};

export type ModRequest = {
  userId: string;
  action: ModAction;
  reportIds: string[];
  note: string;
  days?: number;
  category?: WarningCategory;
};

export type SeedStatus = {
  real: number;
  dummies: number;
  cap: number;
  label: string;
  shared: boolean;
};
