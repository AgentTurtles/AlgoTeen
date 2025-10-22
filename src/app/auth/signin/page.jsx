'use client';

import dynamic from 'next/dynamic';

const SignInPage = dynamic(() => import('./SignInClient'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-emerald-50 via-white to-emerald-100/40">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
        <div className="rounded-3xl border border-emerald-100 bg-white/95 p-10 shadow-xl shadow-emerald-900/5">
          <div className="animate-pulse">
            <div className="h-4 bg-emerald-200 rounded w-1/4 mb-4"></div>
            <div className="h-8 bg-emerald-200 rounded w-3/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-12 bg-emerald-200 rounded"></div>
              <div className="h-12 bg-emerald-200 rounded"></div>
              <div className="h-12 bg-emerald-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
});

export default function Page() {
  return <SignInPage />;
}
