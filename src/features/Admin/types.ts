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

export const LOG_ACTIONS = [...MODERATION_ACTIONS, 'grant', 'revoke'] as const;

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
  createdAt: string;
};

export type ModSuspicious = {
  id: string;
  action: string;
  userId?: string;
  ip?: string;
  createdAt: string;
};

export type ModData = {
  users: ModUser[];
  reports: ModReport[];
  log: ModLogEntry[];
};

export type ModSnapshot = ModData & {
  suspicious: ModSuspicious[];
  staff: string[];
  meId: string;
  meRole: StaffRole;
};

export type ModRequest = {
  userId: string;
  action: ModAction;
  reportIds: string[];
  note: string;
  days?: number;
};

export type SeedStatus = {
  real: number;
  dummies: number;
  cap: number;
  label: string;
  shared: boolean;
  environment: string;
};
