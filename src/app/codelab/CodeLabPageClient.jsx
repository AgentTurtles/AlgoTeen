'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import GlobalStyles from '../../components/GlobalStyles';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import SITE_SEARCH_INDEX from '../../data/searchIndex';

const CodeLabWorkbench = dynamic(() => import('../../components/codelab/CodeLabWorkbench'), {
  ssr: false
});

const NAV_ITEMS = [
  { id: 'overview', label: 'OVERVIEW' },
  { id: 'editor', label: 'CODE EDITOR' },
  { id: 'strategy', label: 'STRATEGY TESTER' },
  { id: 'paper', label: 'PAPER TRADING' }
];

export default function CodeLabPageClient() {
  const router = useRouter();
  const [modeDialogOpen, setModeDialogOpen] = useState(false);

  useEffect(() => {
    const dismissed =
      typeof window !== 'undefined' && window.sessionStorage?.getItem('codelabModeDialogDismissed') === 'true';

    if (!dismissed) {
      setModeDialogOpen(true);
    }
  }, []);

  const closeModeDialog = useCallback(() => {
    setModeDialogOpen(false);
    if (typeof window !== 'undefined') {
      window.sessionStorage?.setItem('codelabModeDialogDismissed', 'true');
    }
  }, []);

  useEffect(() => {
    if (!modeDialogOpen) {
      return undefined;
    }

    if (typeof document === 'undefined') {
      return undefined;
    }

    const { body } = document;
    const previous = body.style.overflow;
    body.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previous;
    };
  }, [modeDialogOpen]);

  useEffect(() => {
    if (!modeDialogOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeModeDialog();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modeDialogOpen, closeModeDialog]);

  const handleSelectAnchor = useCallback(
    (anchorId) => {
      closeModeDialog();

      if (typeof window === 'undefined') {
        return;
      }

      window.requestAnimationFrame(() => {
        const target = document.getElementById(anchorId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    },
    [closeModeDialog]
  );

  const handleOpenPaperDesk = useCallback(() => {
    closeModeDialog();
    router.push('/paper-trading');
  }, [closeModeDialog, router]);

  return (
    <>
      <GlobalStyles />

      {modeDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#04140c]/75 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mode-selector-title"
            className="relative w-full max-w-3xl rounded-3xl border border-emerald-900/15 bg-white/95 p-6 shadow-[0_40px_90px_rgba(12,38,26,0.35)] backdrop-blur"
          >
            <button
              type="button"
              onClick={closeModeDialog}
              className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 text-emerald-900 transition hover:border-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              aria-label="Close mode selector"
            >
              ×
            </button>

            <div className="space-y-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-900/70">Start here</span>
                <h2
                  id="mode-selector-title"
                  className="mt-3 text-3xl font-semibold text-emerald-950 drop-shadow-[0_16px_36px_rgba(16,50,36,0.18)]"
                  style={{ fontFamily: '"Ruigslay"' }}
                >
                  How do you want to work today?
                </h2>
                <p className="mt-2 text-sm text-emerald-900/75">
                  Pick a mode to jump straight into the right station. You can reopen this guide from the help menu later.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => handleSelectAnchor('editor')}
                  className="group rounded-2xl border border-emerald-200 bg-white/90 p-5 text-left shadow-sm transition hover:border-emerald-400 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                  <span className="block text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700/80">Code</span>
                  <span className="mt-2 block text-xl font-semibold text-emerald-950">Strategy editor</span>
                  <p className="mt-2 text-sm text-emerald-900/70">
                    Write, lint, and debug in Monaco with completions and inline errors.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectAnchor('strategy')}
                  className="group rounded-2xl border border-emerald-200 bg-white/90 p-5 text-left shadow-sm transition hover:border-emerald-400 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                  <span className="block text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700/80">Test</span>
                  <span className="mt-2 block text-xl font-semibold text-emerald-950">Backtest controls</span>
                  <p className="mt-2 text-sm text-emerald-900/70">
                    Tune presets, load data, and inspect coverage before running.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={handleOpenPaperDesk}
                  className="group rounded-2xl border border-emerald-200 bg-white/90 p-5 text-left shadow-sm transition hover:border-emerald-400 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                  <span className="block text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700/80">Trade</span>
                  <span className="mt-2 block text-xl font-semibold text-emerald-950">Paper trading desk</span>
                  <p className="mt-2 text-sm text-emerald-900/70">
                    Redirect to the dedicated watchlist → chart → ticket paper workspace.
                  </p>
                </button>
              </div>

              <button
                type="button"
                onClick={closeModeDialog}
                className="inline-flex items-center justify-center rounded-full border border-emerald-200 px-5 py-2 text-sm font-medium text-emerald-900 transition hover:border-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                I'll explore manually
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="min-h-screen" style={{ scrollBehavior: 'smooth' }}>
        <SiteHeader navItems={NAV_ITEMS} searchItems={SITE_SEARCH_INDEX} />

        <main>
          <section id="overview" className="relative overflow-hidden text-white" style={{ backgroundColor: '#14C262' }}>
            <div className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-24 text-center sm:px-6 lg:px-8 lg:pb-28 lg:pt-28">
              <span className="inline-flex items-center justify-center gap-2 rounded-full bg-white/15 px-5 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-white/90">
                Code Lab
              </span>

              <h1
                className="mt-8 font-ruigslay text-[clamp(1rem,10vw,15rem)] tracking-[-0.1em] drop-shadow-[0_20px_44px_rgba(9,30,18,0.35)] leading-[0.9] text-center"
                style={{ fontFamily: 'Ruigslay, sans-serif' }}
              >
                BUILD & TEST
              </h1>

              <p className="mx-auto mt-6 max-w-2xl font-bricolage text-lg leading-relaxed text-white/90">
                The AlgoTeen desk: one room where you code the strategy, read the tape, and push paper orders with live brokerage data.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="#editor" className="cta-primary px-8 text-lg tracking-[-0.04em]">
                  Launch the desk
                </Link>
                <Link href="/learn" className="cta-pill px-8 text-lg tracking-[-0.04em]">
                  Review lessons
                </Link>
              </div>

              <p className="mt-6 font-bricolage text-xs uppercase tracking-[0.32em] text-white/80">
                Paper trading only · Real Alpaca data · Beginner friendly
              </p>
            </div>

            <div className="pointer-events-none absolute inset-0 opacity-20" aria-hidden="true">
              <div className="h-full w-full bg-[radial-gradient(circle_at_20%_25%,rgba(255,255,255,0.4),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.25),transparent_55%),radial-gradient(circle_at_50%_75%,rgba(255,255,255,0.2),transparent_60%)]" />
            </div>
          </section>

          <section id="editor" className="bg-[var(--surface-base)] py-24">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-3xl text-center">
                <span className="font-bricolage text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700/80">
                  Trading desk
                </span>
                <h2 className="mt-4 text-4xl leading-tight text-[#103224] drop-shadow-[0_18px_38px_rgba(16,50,36,0.18)] md:text-5xl"
                style={{ fontFamily: 'Ruigslay, sans-serif' }}>
                  Code·Test·Trade Professionally
                </h2>
                <p className="mt-4 font-bricolage text-base leading-relaxed text-[#103224]/80">
                  Pick your station below: edit the strategy, try quick parameter tweaks, or practise paper trades with matching AlgoTeen styling.
                </p>
              </div>

              <div className="mt-14">
                <CodeLabWorkbench />
              </div>
            </div>
          </section>

          <section id="paper" className="bg-white py-20">
            <div className="mx-auto max-w-5xl px-4">
              <div className="rounded-3xl border border-emerald-900/15 bg-white/95 p-8 shadow-[0_28px_70px_rgba(12,38,26,0.16)]">
                <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                  <div className="space-y-4">
                    <span className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-900/70">Paper trading</span>
                    <h2 className="text-3xl font-semibold text-emerald-950" style={{ fontFamily: '"Ruigslay"' }}>
                      Ready for fills? Jump into the new practice desk.
                    </h2>
                    <p className="text-base leading-relaxed text-emerald-900/75">
                      The paper-trading workspace keeps the watchlist on the left, live chart and order ticket in the center, and positions on the right so you can rehearse trades before putting code into production.
                    </p>
                    <ul className="space-y-2 text-sm text-emerald-900/75">
                      <li>• Chart-based entry, stop, and target tools with ghost orders.</li>
                      <li>• Risk guardrails with buying power fixes and daily loss limits.</li>
                      <li>• Journaling cards and performance analytics for quick reviews.</li>
                    </ul>
                    <div className="flex flex-wrap gap-3 pt-2">
                      <Link href="/paper-trading" className="cta-primary px-7" style={{ fontSize: '18px', letterSpacing: '-0.4px' }}>
                        Launch paper trading
                      </Link>
                      <Link href="/paper-trading#desk" className="cta-pill px-7" style={{ fontSize: '18px', letterSpacing: '-0.4px' }}>
                        Preview the layout
                      </Link>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-emerald-900/10 bg-emerald-50/60 p-6">
                    <div className="space-y-4">
                      <div className="rounded-xl border border-emerald-200 bg-white/90 p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-900/70">Order ticket</p>
                        <p className="mt-2 text-sm text-emerald-900/75">Side · quantity slider · estimated risk</p>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-white/90 p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-900/70">Positions rail</p>
                        <p className="mt-2 text-sm text-emerald-900/75">Inline close, add stop/target, export history</p>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-white/90 p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-900/70">Performance</p>
                        <p className="mt-2 text-sm text-emerald-900/75">Equity curve, heatmaps, and shareable replays</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
