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

export type ModAction = (typeof MODERATION_ACTIONS)[number];

export type ModUser = {
  id: string;
  displayName: string;
  username: string;
  discordId: string;
  avatarUrl?: string;
  joinedAt: string;
  staff: boolean;
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
  action: ModAction;
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
  meId: string;
};

export type ModRequest = {
  userId: string;
  action: ModAction;
  reportIds: string[];
  note: string;
  days?: number;
};
