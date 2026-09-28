export class SessionExpiredError extends Error {}

export type FieldIssue = { path: (string | number)[]; message: string };

export class FieldValidationError extends Error {
  constructor(readonly issues: FieldIssue[]) {
    super('Invalid fields');
  }
}

export const saveResponseError = async (
  response: Response,
  fallback: string,
) => {
  if (response.status === 401) return new SessionExpiredError();
  if (response.status === 400) {
    const body = await response.json().catch(() => null);
    if (Array.isArray(body?.issues))
      return new FieldValidationError(body.issues);
  }
  return new Error(fallback);
};
