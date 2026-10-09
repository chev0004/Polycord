import { z } from 'zod';
import { MODERATION_ACTIONS } from '@/features/Admin/types';
import { WARNING_CATEGORIES } from '@/types';

export const NOTE_MAX_LENGTH = 500;

export const moderationSchema = z
  .object({
    userId: z.string().uuid().optional(),
    reportId: z.string().uuid().optional(),
    reportIds: z.array(z.string().uuid()).max(1000).default([]),
    action: z.enum(MODERATION_ACTIONS),
    days: z.number().int().min(1).max(90).optional(),
    category: z.enum(WARNING_CATEGORIES).optional(),
    note: z
      .string()
      .trim()
      .max(NOTE_MAX_LENGTH, `Keep the note to ${NOTE_MAX_LENGTH} characters`)
      .optional(),
  })
  .refine((value) => value.userId || value.reportId)
  .refine((value) => value.action !== 'suspend' || value.days !== undefined)
  .refine((value) => value.action !== 'warn' || value.note || value.category, {
    message: 'Write a warning message before sending',
    path: ['note'],
  });
