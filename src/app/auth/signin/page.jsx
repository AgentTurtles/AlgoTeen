'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function SignInPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callback') ?? '/paper-trading';
  const [apiKeyId, setApiKeyId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn('credentials', {
        apiKeyId,
        secretKey,
        callbackUrl
      });
    } catch (signInError) {
      setLoading(false);
      setError(signInError.message ?? 'Unable to sign in with Alpaca right now.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-16">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl shadow-slate-900/40">
          <h1 className="text-2xl font-semibold tracking-tight">Connect your Alpaca account</h1>
          <p className="mt-3 text-sm text-slate-300">
            We use Alpaca&apos;s paper trading APIs to pull live market data and manage simulated fills. Your keys stay in your
            browser and our secure session cookie.
          </p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label className="text-sm font-medium text-slate-200" htmlFor="apiKeyId">
                API Key ID
              </label>
              <input
                id="apiKeyId"
                type="text"
                autoComplete="off"
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                value={apiKeyId}
                onChange={(event) => setApiKeyId(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-200" htmlFor="secretKey">
                Secret Key
              </label>
              <input
                id="secretKey"
                type="password"
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                value={secretKey}
                onChange={(event) => setSecretKey(event.target.value)}
                required
              />
            </div>
            {error ? <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-2xl px-6 py-3 text-sm font-semibold text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                loading ? 'bg-slate-600' : 'bg-emerald-500 hover:bg-emerald-400'
              }`}
            >
              {loading ? 'Connecting…' : 'Connect Alpaca'}
            </button>
          </form>
          <p className="mt-6 text-xs text-slate-400">
            Don&apos;t have keys yet? Generate paper credentials in your{' '}
            <Link href="https://app.alpaca.markets/brokerage/new-account" className="text-emerald-300 hover:text-emerald-200" target="_blank">
              Alpaca dashboard
            </Link>
            . You can revoke access at any time.
          </p>
        </div>
      </div>
    </div>
  );
}
