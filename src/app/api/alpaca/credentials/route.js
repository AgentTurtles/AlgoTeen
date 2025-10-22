import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { validateAlpacaCredentials } from '@/lib/alpaca';
import { deleteAlpacaCredentials, getAlpacaCredentials, storeAlpacaCredentials } from '@/lib/userStore';

const AUTH_SECRET = process.env.NEXTAUTH_SECRET ?? 'algoteen-dev-secret';

async function requireSession(request) {
  const token = await getToken({ req: request, secret: AUTH_SECRET });
  if (!token?.sub) {
    return null;
  }
  return token.sub;
}

export async function GET(request) {
  const userId = await requireSession(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const credentials = await getAlpacaCredentials(userId);
  return NextResponse.json({
    hasCredentials: Boolean(credentials?.apiKey && credentials?.secretKey),
    account: credentials?.account ?? null
  });
}

export async function POST(request) {
  const userId = await requireSession(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const apiKey = payload?.apiKey?.trim?.();
  const secretKey = payload?.secretKey?.trim?.();

  if (!apiKey || !secretKey) {
    return NextResponse.json({ error: 'API key and secret key are required.' }, { status: 400 });
  }

  try {
    const account = await validateAlpacaCredentials(apiKey, secretKey);
    await storeAlpacaCredentials(userId, { apiKey, secretKey, account });
    return NextResponse.json({
      hasCredentials: true,
      account
    });
  } catch (error) {
    return NextResponse.json({ error: error.message ?? 'Unable to validate Alpaca credentials.' }, { status: 400 });
  }
}

export async function DELETE(request) {
  const userId = await requireSession(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await deleteAlpacaCredentials(userId);
  return NextResponse.json({ hasCredentials: false });
}
