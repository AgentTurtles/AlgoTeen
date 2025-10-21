'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const SessionContext = createContext({ status: 'loading', data: null });

async function fetchSession() {
  const response = await fetch('/api/auth/session', { credentials: 'include' });
  if (!response.ok) {
    throw new Error('Failed to load session');
  }
  return response.json();
}

export function SessionProvider({ children, initialSession = null }) {
  const [status, setStatus] = useState(initialSession ? 'authenticated' : 'loading');
  const [data, setData] = useState(initialSession);

  useEffect(() => {
    if (initialSession) return;
    let mounted = true;
    fetchSession()
      .then((session) => {
        if (!mounted) return;
        if (session?.user) {
          setStatus('authenticated');
          setData(session);
        } else {
          setStatus('unauthenticated');
          setData(null);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setStatus('unauthenticated');
        setData(null);
      });
    return () => {
      mounted = false;
    };
  }, [initialSession]);

  const value = useMemo(() => ({ status, data }), [status, data]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}

export async function signIn(provider, options = {}) {
  const payload = options.credentials ?? options;
  const response = await fetch('/api/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error ?? 'Unable to sign in');
  }
  const session = await response.json();
  if (options?.callbackUrl) {
    window.location.assign(options.callbackUrl);
  } else {
    window.location.reload();
  }
  return session;
}

export async function signOut(options = {}) {
  await fetch('/api/auth/signout', {
    method: 'POST',
    credentials: 'include'
  });
  if (options?.callbackUrl) {
    window.location.assign(options.callbackUrl);
  } else {
    window.location.reload();
  }
}
