"use client";

import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-emerald-50 via-white to-emerald-100/40">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
        <div className="rounded-3xl border border-emerald-100 bg-white/95 p-10 shadow-xl shadow-emerald-900/5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-500">Create account (disabled)</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-emerald-950">Sign up temporarily disabled</h1>
          <p className="mt-4 text-sm leading-6 text-emerald-900/80">
            Sign-up and sign-in are temporarily disabled while we fix authentication issues. You can continue to browse the
            site or return to the <Link href="/">home page</Link>.
          </p>

          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}