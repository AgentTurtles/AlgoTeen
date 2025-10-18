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
          <section id="overview" className="relative overflow-hidden text-white" style={{ backgroundColor: '#14C262' }}>
            <div className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-24 text-center sm:px-6 lg:px-8 lg:pb-28 lg:pt-28">
              <span className="inline-flex items-center justify-center gap-2 rounded-full bg-white/15 px-5 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-white/90">
                Code Lab
              </span>

              <h1 className="mt-8 font-ruigslay text-[clamp(3.5rem,10vw,8.5rem)] font-semibold leading-[0.88] tracking-[-0.16em] drop-shadow-[0_20px_44px_rgba(9,30,18,0.35)]">
                Build · Test · Paper Trade
              </h1>

              <p className="mx-auto mt-6 max-w-2xl font-bricolage text-lg leading-relaxed text-white/90">
                The AlgoTeen desk: one room where you code the strategy, read the tape, and push paper orders with live brokerage data.
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

            <div className="pointer-events-none absolute inset-0 opacity-20" aria-hidden="true">
              <div className="h-full w-full bg-[radial-gradient(circle_at_20%_25%,rgba(255,255,255,0.4),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.25),transparent_55%),radial-gradient(circle_at_50%_75%,rgba(255,255,255,0.2),transparent_60%)]" />
            </div>
          </section>

          <section id="desk" className="bg-[var(--surface-base)] py-24">
            <div className="mx-auto max-w-6xl px-4">
              <div className="mx-auto max-w-2xl text-center">
                <span className="font-bricolage text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700/80">
                  Trading desk
                </span>
                <h2 className="mt-4 font-ruigslay text-4xl leading-tight text-[#103224] drop-shadow-[0_18px_38px_rgba(16,50,36,0.18)] md:text-5xl">
                  Code the idea · Watch the market · Route the order
                </h2>
                <p className="mt-4 font-bricolage text-base leading-relaxed text-[#103224]/80">
                  A single workstation with Monaco on the left, a live chart on the right, and a paper desk underneath—mirroring the rest of AlgoTeen’s flow.
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
