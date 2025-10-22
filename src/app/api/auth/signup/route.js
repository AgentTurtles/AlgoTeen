import { NextResponse } from 'next/server';

import { getSupabaseAuthAdapter } from '@/lib/auth';
import { hashPassword } from '@/lib/passwords';
import { createUserCredentials, getCredentialsByUsername } from '@/lib/userStore';

const USERNAME_REGEX = /^[a-z0-9_]{3,24}$/i;

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const usernameInput = payload?.username?.trim?.();
  const password = payload?.password ?? '';
  const callbackUrl = payload?.callbackUrl ?? null;

  if (!usernameInput || !USERNAME_REGEX.test(usernameInput)) {
    return NextResponse.json(
      { error: 'Username must be 3-24 characters and only include letters, numbers, or underscores.' },
      { status: 400 }
    );
  }

  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
  }

  const username = usernameInput.toLowerCase();

  try {
    const existing = await getCredentialsByUsername(username);
    if (existing) {
      return NextResponse.json({ error: 'Username already exists.' }, { status: 409 });
    }

    const adapter = getSupabaseAuthAdapter();

    const email = `${username}@algoteen.local`;
    let user = await adapter.getUserByEmail(email);
    if (!user) {
      user = await adapter.createUser({
        name: usernameInput,
        username,
        email
      });
    }

    const passwordHash = hashPassword(password);
    await createUserCredentials({ userId: user.id, username, passwordHash });

    return NextResponse.json({
      user: {
        id: user.id,
        username,
        name: usernameInput
      },
      callbackUrl: callbackUrl ?? null
    });
  } catch (error) {
    const status = error?.code === 'username_exists' ? 409 : error?.status ?? 500;
    return NextResponse.json({ error: error.message ?? 'Unable to create account.' }, { status });
  }
}
