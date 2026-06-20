export type BumpProfileResponse = {
  lastBumpedAt: string;
  nextBumpAt: string;
  premium: boolean;
};

export class BumpProfileError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly remainingMs?: number,
  ) {
    super(message);
  }
}

export const bumpProfileRequest = async (): Promise<BumpProfileResponse> => {
  const response = await fetch('/api/profile/bump', { method: 'POST' });
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    remainingMs?: number;
  };

  if (!response.ok) {
    throw new BumpProfileError(
      data.error ?? 'Profile bump failed',
      response.status,
      data.remainingMs,
    );
  }

  return data as BumpProfileResponse;
};
