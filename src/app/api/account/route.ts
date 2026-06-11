import { NextResponse } from 'next/server';
import { deleteAccountByDiscordId } from '@/db';
import { clearSessionCookie, getCurrentUser } from '@/lib/auth';

export const DELETE = async (request: Request) => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== 'object' ||
    !('confirmation' in body) ||
    body.confirmation !== 'DELETE'
  ) {
    return NextResponse.json(
      { error: 'Confirmation required' },
      { status: 400 },
    );
  }

  const deleted = await deleteAccountByDiscordId(currentUser.id);
  const response = NextResponse.json({ deleted });
  clearSessionCookie(response);

  return response;
};
