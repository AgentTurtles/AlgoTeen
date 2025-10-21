'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

const ERROR_MESSAGES = {
  CredentialsSignin: 'We could not verify your keys. Double-check the API key ID and secret key and try again.',
  Configuration: 'Paper trading sign-in is temporarily unavailable. Please try again shortly.',
  AccessDenied: 'This account does not have paper trading access enabled.'
};

function mapError(code) {
  if (!code) return null;
  return ERROR_MESSAGES[code] ?? 'Unable to sign in with Alpaca right now.';
}

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl =
    searchParams.get('callbackUrl') ?? searchParams.get('callback') ?? '/paper-trading';
  const errorParam = searchParams.get('error');

  const [apiKeyId, setApiKeyId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [error, setError] = useState(() => mapError(errorParam));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (errorParam) {
      setError(mapError(errorParam));
    }
  }, [errorParam]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn('alpaca', {
        apiKeyId,
        secretKey,
        redirect: false,
        callbackUrl
      });

      if (!result || result.error) {
        const message =
          result?.error === 'Invalid credentials'
            ? 'We could not verify your keys. Double-check the API key ID and secret key and try again.'
            : mapError(result?.error) ?? 'Unable to sign in with Alpaca right now.';
        throw new Error(message);
      }

      const destination = result.url ?? callbackUrl;
      router.push(destination);
      router.refresh();
    } catch (signInError) {
      setError(signInError.message ?? 'Unable to sign in with Alpaca right now.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-emerald-50 via-white to-emerald-100/40">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
        <div className="rounded-3xl border border-emerald-100 bg-white/95 p-10 shadow-xl shadow-emerald-900/5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-500">Paper trading</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-emerald-950">Connect your Alpaca account</h1>
          <p className="mt-4 text-sm leading-6 text-emerald-900/80">
            Enter your paper API credentials to unlock live market data, streaming positions, and real-time order routing.
          </p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-emerald-900" htmlFor="apiKeyId">
                API key ID
                <input
                  id="apiKeyId"
                  type="text"
                  autoComplete="off"
                  placeholder="PK..."
                  className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-normal text-emerald-950 placeholder:text-emerald-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  value={apiKeyId}
                  onChange={(event) => setApiKeyId(event.target.value)}
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-emerald-900" htmlFor="secretKey">
                Secret key
                <input
                  id="secretKey"
                  type="password"
                  placeholder="Your secret key"
                  className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-normal text-emerald-950 placeholder:text-emerald-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  value={secretKey}
                  onChange={(event) => setSecretKey(event.target.value)}
                  required
                />
              </label>
            </div>

            {error ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-400/60"
            >
              {loading ? 'Connecting…' : 'Connect Alpaca'}
            </button>
          </form>

          <div className="mt-8 grid gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-6 py-5 text-sm text-emerald-900/80 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">Security</p>
              <p>Your keys never leave the browser. We store them in an encrypted session cookie scoped to this device.</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">Need help?</p>
              <p>
                Generate paper credentials in your{' '}
                <Link
                  href="https://app.alpaca.markets/brokerage/new-account"
                  className="font-semibold text-emerald-600 hover:text-emerald-500"
                  target="_blank"
                >
                  Alpaca dashboard
                </Link>
                , then paste them here.
              </p>
            </div>
          </div>

          <p className="mt-6 text-xs text-emerald-900/60">
            Ready to explore later?{' '}
            <Link href="/codelab" className="font-semibold text-emerald-600 hover:text-emerald-500">
              Return to the CodeLab
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
