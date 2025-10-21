import { NextResponse } from 'next/server';
import { getCookieOptions, encodeToken, readTokenFromRequest, SESSION_COOKIE } from './shared';

const GLOBAL_KEY = Symbol.for('algoteen.nextauth.options');

function storeOptions(options) {
  const globalStore = globalThis;
  globalStore[GLOBAL_KEY] = options;
}

function getStoredOptions() {
  const globalStore = globalThis;
  return globalStore[GLOBAL_KEY];
}

function sanitizeSession(token) {
  if (!token) return null;
  const baseSession = {
    user: {
      id: token.sub ?? null,
      account: token.account ?? null
    }
  };
  return baseSession;
}

export default function NextAuth(options = {}) {
  if (!Array.isArray(options.providers) || options.providers.length === 0) {
    throw new Error('NextAuth requires at least one provider.');
  }
  storeOptions(options);
  const credentialsProvider = options.providers.find((provider) => provider.type === 'credentials') ?? options.providers[0];

  async function buildSessionFromToken(token) {
    if (!token) return null;
    let session = sanitizeSession(token);
    if (options.callbacks?.session) {
      session = await options.callbacks.session({ session, token });
    }
    return session;
  }

  async function handleSession(request) {
    const token = readTokenFromRequest(request);
    const session = await buildSessionFromToken(token);
    return NextResponse.json(session ?? { user: null });
  }

  async function handleSignIn(request) {
    const body = request.headers.get('content-type')?.includes('application/json')
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries());

    const credentials = { ...body };
    const user = await credentialsProvider.authorize?.(credentials, request);
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    let token = {
      sub: user.id ?? user.account?.id ?? user.account?.account_number ?? 'alpaca-user',
      account: user.account ?? null,
      alpaca: user.alpaca ?? null
    };

    if (options.callbacks?.jwt) {
      token = await options.callbacks.jwt({ token, user });
    }

    const encoded = encodeToken(token);
    const session = await buildSessionFromToken(token);
    const response = NextResponse.json(session ?? { user: null });
    response.cookies.set({ name: SESSION_COOKIE, value: encoded, ...getCookieOptions() });
    return response;
  }

  async function handleSignOut() {
    const response = NextResponse.json({ ok: true });
    response.cookies.set({ name: SESSION_COOKIE, value: '', ...getCookieOptions({ maxAge: 0 }) });
    return response;
  }

  return async function handler(request) {
    const pathname = request.nextUrl.pathname;
    if (pathname.endsWith('/session')) {
      return handleSession(request);
    }
    if (pathname.endsWith('/signin')) {
      if (request.method === 'POST') {
        return handleSignIn(request);
      }
      return NextResponse.json({ ok: true });
    }
    if (pathname.endsWith('/signout')) {
      if (request.method === 'POST') {
        return handleSignOut();
      }
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Unsupported auth action' }, { status: 405 });
  };
}

export async function getServerSession() {
  const options = getStoredOptions();
  const token = readTokenFromRequest();
  if (!token) return null;
  if (options?.callbacks?.session) {
    return options.callbacks.session({ session: sanitizeSession(token), token });
  }
  return sanitizeSession(token);
}
