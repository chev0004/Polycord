export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'inappropriate'
  | 'impersonation'
  | 'other';

export class ReportProfileError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export const reportProfileRequest = async (
  profileId: string,
  reason: ReportReason,
  details?: string,
) => {
  const response = await fetch('/api/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId, reason, details }),
  });

  if (!response.ok) {
    throw new ReportProfileError('Report submission failed', response.status);
  }
};

export const blockProfileRequest = async (
  profileId: string,
  nextBlocked: boolean,
) => {
  const response = await fetch('/api/block', {
    method: nextBlocked ? 'POST' : 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId }),
  });

  if (!response.ok) {
    throw new Error('Block update failed');
  }
};
