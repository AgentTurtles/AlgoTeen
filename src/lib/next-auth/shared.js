import crypto from 'crypto';
import { cookies as getCookies } from 'next/headers';

export const SESSION_COOKIE = 'algoteen.session';

const DEFAULT_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 7
};

export function getCookieOptions(overrides = {}) {
  return { ...DEFAULT_COOKIE_OPTIONS, ...overrides };
}

function getSecret() {
  return process.env.NEXTAUTH_SECRET ?? 'algoteen-dev-secret';
}

export function encodeToken(payload) {
  const raw = JSON.stringify(payload ?? {});
  const base = Buffer.from(raw).toString('base64url');
  const signature = crypto.createHmac('sha256', getSecret()).update(base).digest('base64url');
  return `${base}.${signature}`;
}

export function decodeToken(token) {
  if (!token) return null;
  const [base, signature] = token.split('.');
  if (!base || !signature) return null;
  const expected = crypto.createHmac('sha256', getSecret()).update(base).digest('base64url');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }
  } catch (error) {
    return null;
  }
  try {
    const json = Buffer.from(base, 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
}

export function readTokenFromRequest(request) {
  if (request?.cookies?.get) {
    const cookie = request.cookies.get(SESSION_COOKIE);
    return decodeToken(cookie?.value ?? null);
  }
  const store = getCookies();
  const stored = store.get(SESSION_COOKIE);
  return decodeToken(stored?.value ?? null);
}
