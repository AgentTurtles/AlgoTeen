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
  { id: 'playground', label: 'PLAYGROUND' },
  { id: 'workspace', label: 'WORKSPACE' },
  { id: 'backtesting', label: 'BACKTESTING' },
  { id: 'automation', label: 'AUTOMATION' },
  { id: 'resources', label: 'RESOURCES' }
];

const FEATURE_CARDS = [
  {
    title: 'Author live algorithms',
    description:
      'Spin up the Monaco-powered editor instantly—no installs required—and compose bots with autocompletion and inline helper tips.'
  },
  {
    title: 'One-click backtests',
    description:
      'Run simulations against curated sample data, surface performance metrics, and review each trade with a single click.'
  },
  {
    title: 'Paper-ready workflows',
    description:
      'Route signals to the built-in trading API to validate order payloads, risk checks, and paper fills before you go live.'
  }
];

const WORKSPACE_FEATURES = [
  {
    label: 'Typed Monaco editor',
    detail: 'Enjoy syntax highlighting, error surfacing, and instant updates while you iterate on each idea.'
  },
  {
    label: 'Built-in helpers',
    detail: 'Access EMA, SMA, RSI, and range utilities directly in your scripts—no need to wire indicators manually.'
  },
  {
    label: 'Trading hand-off',
    detail: 'Tag strategies and dispatch paper orders through the simulated trading API without leaving the page.'
  }
];

const BACKTEST_METRICS = [
  { stat: '160', label: 'Sample OHLC bars packaged for testing' },
  { stat: '10K', label: 'Starting equity for every simulation' },
  { stat: '6', label: 'Performance metrics calculated instantly' }
];

const WORKFLOW_STEPS = [
  {
    heading: 'Draft',
    copy: 'Outline entries, risk rules, and exits inside the Monaco editor with helper utilities for EMA, RSI, and range scans.'
  },
  {
    heading: 'Simulate',
    copy: 'Execute instant backtests, inspect the trade ledger, and review equity curves without leaving the page.'
  },
  {
    heading: 'Paper Trade',
    copy: 'Tag strategies and dispatch paper orders through the built-in trading API to validate routing and fills.'
  }
];

const RESOURCE_CARDS = [
  {
    title: 'Starter Kits',
    description: 'Momentum, breakout, and mean-reversion kits seeded with best practices and notes.'
  },
  {
    title: 'API Reference',
    description: 'Searchable docs for helper utilities plus the /api/trading endpoint powering paper order routing.'
  },
  {
    title: 'Community Scripts',
    description: 'Remix fellow learners’ bots, leave comments, and publish your own upgrades when ready.'
  }
];

export default function CodeLabPage() {
  return (
    <>
      <GlobalStyles />

      <div
        className="min-h-screen bg-[var(--surface-base)]"
        style={{ scrollBehavior: 'smooth' }}
      >
        <SiteHeader navItems={NAV_ITEMS} searchItems={SITE_SEARCH_INDEX} />

        <main>
          <section
            id="overview"
            className="relative overflow-hidden bg-gradient-to-br from-[#14C262] to-[#0ea351] text-white"
          >
            <div className="relative z-10 mx-auto max-w-6xl px-4 pb-32 pt-28 text-center">
              <div className="inline-flex items-center justify-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-white/90">
                Code Lab
              </div>

              <h1 className="mt-8 font-ruigslay text-[clamp(3.5rem,9vw,10rem)] font-semibold leading-[0.88] tracking-[-0.2em] drop-shadow-[0_22px_44px_rgba(10,30,18,0.35)]">
                BUILD · BACKTEST · PAPER
              </h1>

              <p className="mx-auto mt-8 max-w-3xl font-bricolage text-lg leading-relaxed text-white/90">
                Draft algorithms, replay years of data, and graduate to real-time paper trading without leaving the browser. Code Lab is your sandbox to test, iterate, and learn safely.
              </p>

              <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="#playground" className="cta-primary px-8 text-lg tracking-[-0.04em]">
                  Explore the desk
                </Link>
                <Link href="#backtesting" className="cta-pill px-8 text-lg tracking-[-0.04em]">
                  Run a sample test
                </Link>
              </div>

              <p className="mt-6 font-bricolage text-xs uppercase tracking-[0.32em] text-white/80">
                Paper trading only · Simulated market data · Instant resets
              </p>
            </div>

            <div className="pointer-events-none absolute inset-0 opacity-20" aria-hidden="true">
              <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.6),transparent_55%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.45),transparent_55%),radial-gradient(circle_at_50%_80%,rgba(255,255,255,0.4),transparent_60%)]" />
            </div>
          </section>

          <section id="features" className="bg-[var(--surface-white)] py-24">
            <div className="mx-auto max-w-6xl px-4 text-center">
              <span className="font-bricolage text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700/80">
                Why Code Lab
              </span>
              <h2 className="mt-4 font-ruigslay text-4xl leading-tight text-[#103224] drop-shadow-[0_12px_28px_rgba(16,50,36,0.18)] md:text-5xl">
                Ship ideas with pro-grade tools
              </h2>
              <p className="mx-auto mt-4 max-w-3xl font-bricolage text-base leading-relaxed text-[#103224]/80">
                The AlgoTeen desk bundles everything you need to experiment safely—live coding, instant feedback, and the data pipelines that power confident decision making.
              </p>

              <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {FEATURE_CARDS.map((card) => (
                  <div
                    key={card.title}
                    className="flex h-full flex-col rounded-3xl border border-emerald-500/15 bg-gradient-to-br from-emerald-100/40 via-white to-white px-8 py-10 text-left shadow-[0_22px_48px_rgba(12,38,26,0.08)]"
                  >
                    <h3 className="font-bricolage text-xl font-semibold text-[#0f3224]">
                      {card.title}
                    </h3>
                    <p className="mt-4 font-bricolage text-base leading-relaxed text-[#0f3224]/80">
                      {card.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="playground" className="bg-[var(--surface-base)] py-24">
            <div className="mx-auto max-w-6xl px-4">
              <div className="mx-auto max-w-3xl text-center">
                <span className="font-bricolage text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700/80">
                  Live playground
                </span>
                <h2 className="mt-4 font-ruigslay text-4xl leading-tight text-[#103224] drop-shadow-[0_18px_38px_rgba(16,50,36,0.2)] md:text-5xl">
                  Code, backtest, and route orders without leaving the page
                </h2>
                <p className="mt-4 font-bricolage text-base leading-relaxed text-[#103224]/80">
                  Experiment with Monaco-powered scripts, run instant backtests against our sample dataset, and tag your results
                  before shipping signals to the paper trading API. Everything you need to validate an idea lives right here.
                </p>
              </div>

              <div className="mt-12">
                <CodeLabWorkbench />
              </div>
            </div>
          </section>

          <section id="workspace" className="bg-[var(--surface-white)] py-24">
            <div className="mx-auto max-w-6xl px-4">
              <div className="grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                <div>
                  <span className="font-bricolage text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700/80">
                    Workspace
                  </span>
                  <h2 className="mt-4 font-ruigslay text-4xl leading-tight text-[#103224] drop-shadow-[0_18px_36px_rgba(16,50,36,0.22)] md:text-5xl">
                    Your trading desk in the browser
                  </h2>
                  <p className="mt-4 font-bricolage text-base leading-relaxed text-[#103224]/80">
                    The Code Lab editor now wraps Monaco around your ideas—syntax highlighting, inline errors, and autocompletion arrive instantly. Indicator helpers and the paper trading API live beside your code so you can go from draft to execution faster.
                  </p>

                  <div className="mt-10 space-y-6">
                    {WORKSPACE_FEATURES.map((feature) => (
                      <div
                        key={feature.label}
                        className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-100/30 to-white p-6 shadow-[0_18px_36px_rgba(12,38,26,0.08)]"
                      >
                        <h3 className="font-bricolage text-lg font-semibold text-[#103224]">
                          {feature.label}
                        </h3>
                        <p className="mt-2 font-bricolage text-base leading-relaxed text-[#103224]/75">
                          {feature.detail}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-10 flex flex-wrap gap-4">
                    <Link href="#automation" className="cta-primary px-7 text-base tracking-[-0.03em]">
                      See live workflow
                    </Link>
                    <Link href="/learn" className="cta-pill px-7 text-base tracking-[-0.03em]">
                      Review lessons
                    </Link>
                  </div>
                </div>

                <div className="rounded-[28px] border border-emerald-500/20 bg-gradient-to-br from-emerald-200/20 via-white to-white p-8 shadow-[0_26px_62px_rgba(10,40,27,0.18)]">
                  <div className="flex items-center justify-between text-[#103224]">
                    <span className="font-bricolage text-xs uppercase tracking-[0.28em]">strategy.js</span>
                    <span className="font-bricolage text-xs text-[#103224]/60">Monaco · autosave</span>
                  </div>
                  <pre className="mt-5 min-h-[240px] rounded-3xl border border-emerald-50/20 bg-[#0A281B] p-6 font-mono text-sm leading-relaxed text-emerald-100 shadow-[inset_0_0_0_1px_rgba(233,255,233,0.12)]">
{`function strategy({ data, index, price, helpers, state }) {
  const fast = helpers.ema(data, index, 8);
  const slow = helpers.ema(data, index, 21);

  if (fast === null || slow === null) {
    return { action: 'hold' };
  }

  if (fast > slow && state.positionSize === 0) {
    return { action: 'buy', note: 'Momentum shift' };
  }

  const rsi = helpers.rsi(data, index, 14);
  if (state.positionSize > 0 && (fast < slow || (rsi !== null && rsi > 68))) {
    return { action: 'exit', note: 'Momentum cooling' };
  }

  return { action: 'hold' };
}`}
                  </pre>
                  <div className="mt-5 grid gap-4 rounded-2xl bg-white/80 p-5 text-[#103224] shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="font-bricolage text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
                        Sample dataset
                      </span>
                      <span className="font-bricolage text-sm text-[#103224]/70">160 bars · $10K capital</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {BACKTEST_METRICS.map((metric) => (
                        <div key={metric.stat} className="rounded-xl border border-emerald-500/15 bg-emerald-50/70 px-4 py-3 text-center">
                          <p className="font-bricolage text-xl font-semibold text-[#0f3224]">{metric.stat}</p>
                          <p className="mt-1 font-bricolage text-xs text-[#0f3224]/70">{metric.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="backtesting" className="bg-gradient-to-br from-[#062517] via-[#0B3A27] to-[#125538] py-24 text-white">
            <div className="mx-auto max-w-6xl px-4">
              <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                <div>
                  <span className="font-bricolage text-sm font-semibold uppercase tracking-[0.32em] text-white/70">
                    Backtesting
                  </span>
                  <h2 className="mt-4 font-ruigslay text-4xl leading-tight drop-shadow-[0_18px_36px_rgba(4,18,12,0.45)] md:text-5xl">
                    Stress test every idea with instant feedback
                  </h2>
                  <p className="mt-4 font-bricolage text-base leading-relaxed text-white/80">
                    Launch a backtest straight from the editor, review the equity curve, and drill into trade-by-trade results. Metrics like total return, win rate, and drawdown render in milliseconds so you can iterate confidently.
                  </p>

                  <ul className="mt-8 space-y-4 font-bricolage text-base text-white/80">
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#14C262]" aria-hidden />
                      <span>Run JavaScript strategies over 160 packaged OHLC bars with a single click.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#14C262]" aria-hidden />
                      <span>Performance overlays surface total return, win rate, average trade, and drawdown immediately.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#14C262]" aria-hidden />
                      <span>Equity sparkline and trade ledger help capture what worked before you graduate to automation.</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 shadow-[0_24px_56px_rgba(3,15,10,0.35)] backdrop-blur">
                  <h3 className="font-bricolage text-sm font-semibold uppercase tracking-[0.32em] text-white/70">
                    Session snapshot
                  </h3>
                  <div className="mt-6 grid gap-6 md:grid-cols-2">
                    {BACKTEST_METRICS.map((metric) => (
                      <div key={metric.stat} className="rounded-2xl border border-white/10 bg-white/10 px-5 py-6 text-center">
                        <p className="font-bricolage text-3xl font-semibold text-white drop-shadow-[0_10px_24px_rgba(5,20,12,0.4)]">
                          {metric.stat}
                        </p>
                        <p className="mt-2 font-bricolage text-sm text-white/70">{metric.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-6 font-mono text-sm leading-relaxed text-emerald-100/90 shadow-inner">
{`import { runBacktest } from '@/lib/backtester';

const results = runBacktest(editor.getValue());

console.log('Total return:', results.metrics.totalReturn);
results.trades.forEach((trade) => {
  console.log(trade.entryDate, trade.returnPct);
});`}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="automation" className="bg-[var(--surface-white)] py-24">
            <div className="mx-auto max-w-6xl px-4">
              <div className="rounded-[28px] border border-emerald-500/15 bg-gradient-to-br from-white via-emerald-50/60 to-white p-12 shadow-[0_26px_60px_rgba(10,40,27,0.12)]">
                <div className="flex flex-col gap-12 lg:flex-row lg:items-start">
                  <div className="max-w-xl">
                    <span className="font-bricolage text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700/80">
                      Automation workflow
                    </span>
                    <h2 className="mt-4 font-ruigslay text-4xl leading-tight text-[#103224] drop-shadow-[0_18px_36px_rgba(16,50,36,0.18)] md:text-5xl">
                      From draft to live paper trading
                    </h2>
                    <p className="mt-4 font-bricolage text-base leading-relaxed text-[#103224]/80">
                      Graduate your ideas when you are ready. Scheduling, monitoring, and alerting are built into the same dashboard, so you can iterate without context switching.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-4">
                      <Link href="#resources" className="cta-primary px-7 text-base tracking-[-0.03em]">
                        Browse resources
                      </Link>
                      <Link href="/learn" className="cta-pill px-7 text-base tracking-[-0.03em]">
                        Follow roadmap
                      </Link>
                    </div>
                  </div>

                  <div className="flex-1 space-y-6">
                    {WORKFLOW_STEPS.map((step, index) => (
                      <div key={step.heading} className="flex gap-5 rounded-2xl border border-emerald-500/15 bg-white/80 p-6 shadow-[0_16px_32px_rgba(10,32,22,0.08)]">
                        <span className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#14C262]/10 font-bricolage text-sm font-semibold text-[#14C262]">
                          {index + 1}
                        </span>
                        <div>
                          <h3 className="font-bricolage text-lg font-semibold text-[#103224]">{step.heading}</h3>
                          <p className="mt-2 font-bricolage text-base leading-relaxed text-[#103224]/75">{step.copy}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="resources" className="bg-[var(--surface-base)] py-24">
            <div className="mx-auto max-w-6xl px-4">
              <div className="text-center">
                <span className="font-bricolage text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700/80">
                  Resources
                </span>
                <h2 className="mt-4 font-ruigslay text-4xl leading-tight text-[#103224] md:text-5xl">
                  Keep leveling up
                </h2>
                <p className="mx-auto mt-4 max-w-3xl font-bricolage text-base leading-relaxed text-[#103224]/80">
                  Lessons, docs, and community drops help you explore new ideas, patch gaps, and share what you have built with the rest of the AlgoTeen crew.
                </p>
              </div>

              <div className="mt-12 grid gap-6 md:grid-cols-3">
                {RESOURCE_CARDS.map((card) => (
                  <div key={card.title} className="rounded-3xl border border-emerald-500/15 bg-white p-8 text-left shadow-[0_22px_48px_rgba(10,40,27,0.08)]">
                    <h3 className="font-bricolage text-xl font-semibold text-[#103224]">{card.title}</h3>
                    <p className="mt-3 font-bricolage text-base leading-relaxed text-[#103224]/80">{card.description}</p>
                  </div>
                ))}
              </div>

              <div className="mt-16 flex flex-col items-center gap-4 text-center">
                <h3 className="font-bricolage text-2xl font-semibold text-[#103224]">
                  Ready to put your roadmap into practice?
                </h3>
                <p className="font-bricolage text-base text-[#103224]/80">
                  Jump into the editor, remix a strategy, and see what you can uncover.
                </p>
                <Link href="/" className="cta-primary px-8 text-base tracking-[-0.03em]">
                  Return to home
                </Link>
              </div>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
