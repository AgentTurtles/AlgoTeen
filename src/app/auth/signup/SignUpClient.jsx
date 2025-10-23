'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useCallback, useMemo, useState } from 'react';

const USERNAME_HELP = '3-24 characters • letters, numbers, underscores';

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(
    () => searchParams.get('callbackUrl') ?? searchParams.get('callback') ?? '/codelab',
    [searchParams]
  );

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      setError(null);

      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      setLoading(true);
      try {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, callbackUrl })
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error ?? 'Unable to create account.');
        }

        const result = await signIn('credentials', {
          username,
          password,
          redirect: false,
          callbackUrl
        });

        if (result?.error) {
          throw new Error('Account created, but automatic sign-in failed. Please sign in manually.');
        }

        router.push(result?.url ?? callbackUrl);
        router.refresh();
      } catch (submitError) {
        setError(submitError.message ?? 'Unable to create account.');
        setLoading(false);
      }
    },
    [callbackUrl, confirmPassword, password, router, username]
  );

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-emerald-50 via-white to-emerald-100/40">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
        <div className="rounded-3xl border border-emerald-100 bg-white/95 p-10 shadow-xl shadow-emerald-900/5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-500">Create account</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-emerald-950">Join AlgoTeen</h1>
          <p className="mt-4 text-sm leading-6 text-emerald-900/80">
            Build strategies in the CodeLab, run trustworthy backtests, and paper trade live markets under one account.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <label className="flex flex-col gap-2 text-sm font-medium text-emerald-900" htmlFor="username">
              Username
              <input
                id="username"
                type="text"
                autoComplete="off"
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase())}
                placeholder="yourname"
                pattern="[A-Za-z0-9_]{3,24}"
                required
                className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-normal text-emerald-950 placeholder:text-emerald-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
              <span className="text-xs font-medium text-emerald-500">{USERNAME_HELP}</span>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-emerald-900" htmlFor="password">
              Password
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                required
                className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-normal text-emerald-950 placeholder:text-emerald-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-emerald-900" htmlFor="confirmPassword">
              Confirm password
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter your password"
                minLength={8}
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
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-6 py-5 text-sm text-emerald-900/80">
            <p className="font-semibold text-emerald-600">Already have an account?</p>
            <p className="mt-2">
              <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-semibold text-emerald-600 hover:text-emerald-500">
                Sign in here
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}