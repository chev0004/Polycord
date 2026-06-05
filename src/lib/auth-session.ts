export type CurrentUser = {
  id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  email?: string;
};

export type SessionPayload = {
  user: CurrentUser;
  expiresAt: number;
};

export type OAuthStatePayload = {
  nonce: string;
  redirectTo: string;
};

export const AUTH_SESSION_COOKIE = 'polycord_session';
export const AUTH_STATE_COOKIE = 'polycord_oauth_state';
export const AUTH_ERROR_PARAM = 'authError';

export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;
export const STATE_DURATION_SECONDS = 60 * 10;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const getAuthSecret = () =>
  process.env.AUTH_SECRET ?? process.env.DISCORD_CLIENT_SECRET;

const base64UrlEncode = (bytes: Uint8Array) => {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
};

const base64UrlDecode = (value: string) => {
  try {
    const base64 = value
      .replaceAll('-', '+')
      .replaceAll('_', '/')
      .padEnd(Math.ceil(value.length / 4) * 4, '=');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  } catch {
    return null;
  }
};

const constantTimeEqual = (left: Uint8Array, right: Uint8Array) => {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }

  return diff === 0;
};

const sign = async (value: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    textEncoder.encode(value),
  );

  return base64UrlEncode(new Uint8Array(signature));
};

const signPayload = async <T>(payload: T, secret: string) => {
  const encodedPayload = base64UrlEncode(
    textEncoder.encode(JSON.stringify(payload)),
  );

  return `${encodedPayload}.${await sign(encodedPayload, secret)}`;
};

const verifyPayload = async <T>(
  value: string,
  secret: string,
): Promise<T | null> => {
  const [encodedPayload, signature] = value.split('.');

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = await sign(encodedPayload, secret);
  const signatureBytes = base64UrlDecode(signature);
  const expectedSignatureBytes = base64UrlDecode(expectedSignature);

  if (
    !signatureBytes ||
    !expectedSignatureBytes ||
    !constantTimeEqual(signatureBytes, expectedSignatureBytes)
  ) {
    return null;
  }

  const payloadBytes = base64UrlDecode(encodedPayload);

  if (!payloadBytes) {
    return null;
  }

  try {
    return JSON.parse(textDecoder.decode(payloadBytes)) as T;
  } catch {
    return null;
  }
};

export const createOAuthState = (redirectTo: string) => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);

  return {
    nonce: base64UrlEncode(bytes),
    redirectTo,
  };
};

export const createOAuthStateCookieValue = async (state: OAuthStatePayload) => {
  const secret = getAuthSecret();

  if (!secret) {
    return null;
  }

  return signPayload(state, secret);
};

export const readOAuthStateFromCookieValue = async (value: string) => {
  const secret = getAuthSecret();

  if (!secret) {
    return null;
  }

  return verifyPayload<OAuthStatePayload>(value, secret);
};

export const createSessionCookieValue = async (user: CurrentUser) => {
  const secret = getAuthSecret();

  if (!secret) {
    return null;
  }

  const session: SessionPayload = {
    user,
    expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000,
  };

  return signPayload(session, secret);
};

export const readSessionFromCookieValue = async (value: string) => {
  const secret = getAuthSecret();

  if (!secret) {
    return null;
  }

  const session = await verifyPayload<SessionPayload>(value, secret);

  if (!session || session.expiresAt < Date.now()) {
    return null;
  }

  return session.user;
};
