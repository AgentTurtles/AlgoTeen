'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

const ERROR_MESSAGES = {
  CredentialsSignin: 'The username or password you entered is incorrect.',
  AccessDenied: 'Your account does not have access to this area yet.',
  default: 'Unable to sign you in right now. Please try again.'
};

function parseError(code) {
  if (!code) return null;
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.default;
}

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackParam = useMemo(
    () => searchParams.get('callbackUrl') ?? searchParams.get('callback') ?? '/codelab',
    [searchParams]
  );
  const errorParam = useMemo(() => searchParams.get('error'), [searchParams]);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(() => parseError(errorParam));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (errorParam) {
      setError(parseError(errorParam));
    }
  }, [errorParam]);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      setLoading(true);
      setError(null);
      try {
        const result = await signIn('credentials', {
          username,
          password,
          redirect: false,
          callbackUrl: callbackParam
        });

        if (!result || result.error) {
          setError(parseError(result?.error) ?? ERROR_MESSAGES.default);
          setLoading(false);
          return;
        }

        const destination = result.url ?? callbackParam;
        router.push(destination);
        router.refresh();
      } catch (submitError) {
        setError(submitError?.message ?? ERROR_MESSAGES.default);
        setLoading(false);
      }
    },
    [callbackParam, password, router, username]
  );

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-emerald-50 via-white to-emerald-100/40">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
        <div className="rounded-3xl border border-emerald-100 bg-white/95 p-10 shadow-xl shadow-emerald-900/5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-500">Account access</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-emerald-950">Sign in to AlgoTeen</h1>
          <p className="mt-4 text-sm leading-6 text-emerald-900/80">
            Enter the username and password you created during sign-up to unlock the CodeLab, live market data, and the paper
            trading desk.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <label className="flex flex-col gap-2 text-sm font-medium text-emerald-900" htmlFor="username">
              Username
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase())}
                placeholder="yourname"
                required
                className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-normal text-emerald-950 placeholder:text-emerald-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-emerald-900" htmlFor="password">
              Password
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
                required
                className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-normal text-emerald-950 placeholder:text-emerald-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </label>

            {error ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-400/60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-6 py-5 text-sm text-emerald-900/80">
            <p className="font-semibold text-emerald-600">Need an account?</p>
            <p className="mt-2">
              <Link href={`/auth/signup?callbackUrl=${encodeURIComponent(callbackParam)}`} className="font-semibold text-emerald-600 hover:text-emerald-500">
                Create one now
              </Link>{' '}
              to save your work across sessions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}