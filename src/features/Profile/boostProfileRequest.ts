export type BoostResult = {
  boostedUntil: string;
  remaining: number;
};

export type BoostStatus = {
  boostedUntil: string | null;
  remaining: number;
};

export class BoostProfileError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export const boostProfileRequest = async (): Promise<BoostResult> => {
  const response = await fetch('/api/profile/boost', { method: 'POST' });
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
  };

  if (!response.ok) {
    throw new BoostProfileError(
      data.error ?? 'Profile boost failed',
      response.status,
    );
  }

  return data as BoostResult;
};

export const boostStatusRequest = async (): Promise<BoostStatus> => {
  const response = await fetch('/api/profile/boost', { cache: 'no-store' });

  if (!response.ok) throw new Error('Boost status failed');

  return response.json();
};
