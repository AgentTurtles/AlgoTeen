'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

import GlobalStyles from '../../components/GlobalStyles';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import SITE_SEARCH_INDEX from '../../data/searchIndex';

const CodeLabWorkbench = dynamic(() => import('../../components/codelab/CodeLabWorkbench'), {
  ssr: false
});

const NAV_ITEMS = [
  { id: 'overview', label: 'OVERVIEW' },
  { id: 'desk', label: 'DESK' }
];

export default function CodeLabPageClient() {
  return (
    <>
      <GlobalStyles />

      <div className="min-h-screen bg-[var(--surface-base)]" style={{ scrollBehavior: 'smooth' }}>
        <SiteHeader navItems={NAV_ITEMS} searchItems={SITE_SEARCH_INDEX} />

        <main>
          <section
            id="overview"
            className="relative overflow-hidden bg-gradient-to-br from-[#14C262] to-[#0ea351] text-white"
          >
            <div className="relative z-10 mx-auto max-w-6xl px-4 pb-28 pt-28 text-center">
              <div className="inline-flex items-center justify-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-white/90">
                Code Lab
              </div>

              <h1 className="mt-8 font-ruigslay text-[clamp(4rem,9vw,10rem)] font-semibold leading-[0.9] tracking-[-0.18em] drop-shadow-[0_22px_44px_rgba(10,30,18,0.35)]">
                Build · Test · Paper Trade
              </h1>

              <p className="mx-auto mt-6 max-w-3xl font-bricolage text-lg leading-relaxed text-white/90">
                Follow a simple path: pick a market, edit the script, watch the charts update, and practise routing paper orders.
                Everything on this page mirrors the flow used across AlgoTeen—no surprises, just the tools you already know.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="#desk" className="cta-primary px-8 text-lg tracking-[-0.04em]">
                  Jump to the desk
                </Link>
                <Link href="/learn" className="cta-pill px-8 text-lg tracking-[-0.04em]">
                  Review lessons
                </Link>
              </div>

              <p className="mt-6 font-bricolage text-xs uppercase tracking-[0.32em] text-white/80">
                Paper trading only · Real Alpaca data · Beginner friendly
              </p>
            </div>

            <div className="pointer-events-none absolute inset-0 opacity-15" aria-hidden="true">
              <div className="h-full w-full bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.6),transparent_55%),radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.4),transparent_55%),radial-gradient(circle_at_50%_80%,rgba(255,255,255,0.35),transparent_60%)]" />
            </div>
          </section>

          <section id="desk" className="bg-[var(--surface-base)] py-24">
            <div className="mx-auto max-w-6xl px-4">
              <div className="mx-auto max-w-3xl text-center">
                <span className="font-bricolage text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700/80">
                  Trading desk
                </span>
                <h2 className="mt-4 font-ruigslay text-4xl leading-tight text-[#103224] drop-shadow-[0_18px_38px_rgba(16,50,36,0.2)] md:text-5xl">
                  One screen for code, charts, and paper orders
                </h2>
                <p className="mt-4 font-bricolage text-base leading-relaxed text-[#103224]/80">
                  Work through three steady steps: choose your market (stocks, forex, or crypto), run the backtest to inspect the charts and PnL, then log buy, sell, or cancel actions in the paper desk. The layout matches AlgoTeen’s other pages so every control feels familiar.
                </p>
              </div>

              <div className="mt-12">
                <CodeLabWorkbench />
              </div>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
