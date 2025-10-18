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

export default function CodeLabPageClient() {
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
                  Experiment with Monaco-powered scripts, run instant backtests against our sample dataset, and tag your results before shipping signals to the paper trading API. Everything you need to validate an idea lives right here.
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
                    Build muscle memory with the same scaffolding pros use: type-safe editors, instant error surfacing, and the helper utilities that make algorithmic trading approachable.
                  </p>

                  <div className="mt-10 grid gap-6 sm:grid-cols-2">
                    {WORKSPACE_FEATURES.map((feature) => (
                      <div
                        key={feature.label}
                        className="rounded-2xl border border-emerald-500/10 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-[0_18px_36px_rgba(12,38,26,0.08)]"
                      >
                        <h3 className="font-bricolage text-lg font-semibold text-[#0f3224]">
                          {feature.label}
                        </h3>
                        <p className="mt-3 font-bricolage text-sm leading-relaxed text-[#0f3224]/75">
                          {feature.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -inset-6 rounded-[40px] bg-gradient-to-br from-emerald-200/40 via-white to-white blur-3xl" aria-hidden="true" />
                  <div className="relative rounded-[32px] border border-emerald-500/15 bg-white/95 p-8 shadow-[0_42px_64px_rgba(12,38,26,0.16)]">
                    <p className="font-mono text-xs uppercase tracking-[0.32em] text-emerald-700/70">
                      Editor helpers
                    </p>
                    <ul className="mt-6 space-y-4 text-left font-mono text-sm text-[#0f3224]/80">
                      <li>
                        <span className="font-semibold text-emerald-600">ema(source, length)</span> → returns exponential moving average
                      </li>
                      <li>
                        <span className="font-semibold text-emerald-600">rsi(source, length)</span> → surfaces relative strength index
                      </li>
                      <li>
                        <span className="font-semibold text-emerald-600">rangeBreakout(high, low, lookback)</span> → flags breakout levels
                      </li>
                      <li>
                        <span className="font-semibold text-emerald-600">dispatchPaperOrder(payload)</span> → routes to paper trading API
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="backtesting" className="relative overflow-hidden bg-[var(--surface-base)] py-24">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(20,194,98,0.2),transparent_60%)]" aria-hidden="true" />
            <div className="relative mx-auto max-w-6xl px-4">
              <div className="grid gap-16 lg:grid-cols-[1fr_1fr] lg:items-center">
                <div>
                  <span className="font-bricolage text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700/80">
                    Backtesting
                  </span>
                  <h2 className="mt-4 font-ruigslay text-4xl leading-tight text-[#103224] drop-shadow-[0_18px_36px_rgba(16,50,36,0.24)] md:text-5xl">
                    Simulate ideas instantly
                  </h2>
                  <p className="mt-4 font-bricolage text-base leading-relaxed text-[#103224]/80">
                    Replay curated OHLC data with deterministic results so you can focus on iteration, not debugging infrastructure. Equity curves, trade ledgers, and performance metrics refresh after every run.
                  </p>

                  <div className="mt-10 grid gap-6 sm:grid-cols-3">
                    {BACKTEST_METRICS.map((metric) => (
                      <div
                        key={metric.label}
                        className="rounded-3xl border border-emerald-500/10 bg-gradient-to-br from-emerald-50 via-white to-white p-6 text-center shadow-[0_18px_36px_rgba(12,38,26,0.08)]"
                      >
                        <div className="font-ruigslay text-4xl text-[#0f3224]">{metric.stat}</div>
                        <p className="mt-2 font-bricolage text-xs uppercase tracking-[0.32em] text-[#0f3224]/70">
                          {metric.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -inset-6 rounded-[40px] bg-gradient-to-br from-emerald-200/40 via-white to-white blur-3xl" aria-hidden="true" />
                  <div className="relative rounded-[32px] border border-emerald-500/15 bg-white/95 p-8 shadow-[0_42px_64px_rgba(12,38,26,0.16)]">
                    <p className="font-mono text-xs uppercase tracking-[0.32em] text-emerald-700/70">
                      Performance snapshot
                    </p>
                    <dl className="mt-6 grid gap-4 text-left font-mono text-sm text-[#0f3224]/80">
                      <div className="flex justify-between">
                        <dt>Net Profit</dt>
                        <dd className="font-semibold text-emerald-600">+$2,430</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Win Rate</dt>
                        <dd className="font-semibold text-emerald-600">58%</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Max Drawdown</dt>
                        <dd className="font-semibold text-emerald-600">-4.2%</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Sharpe</dt>
                        <dd className="font-semibold text-emerald-600">1.4</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Trades</dt>
                        <dd className="font-semibold text-emerald-600">32</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Avg Hold</dt>
                        <dd className="font-semibold text-emerald-600">3.2 days</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="automation" className="bg-[var(--surface-white)] py-24">
            <div className="mx-auto max-w-6xl px-4">
              <div className="grid gap-16 lg:grid-cols-[1fr_1fr] lg:items-center">
                <div className="relative">
                  <div className="absolute -inset-6 rounded-[40px] bg-gradient-to-br from-emerald-200/40 via-white to-white blur-3xl" aria-hidden="true" />
                  <div className="relative rounded-[32px] border border-emerald-500/15 bg-white/95 p-8 shadow-[0_42px_64px_rgba(12,38,26,0.16)]">
                    <p className="font-mono text-xs uppercase tracking-[0.32em] text-emerald-700/70">
                      Automation flow
                    </p>
                    <ol className="mt-6 space-y-4 text-left font-mono text-sm text-[#0f3224]/80">
                      <li>
                        <span className="font-semibold text-emerald-600">1. Tag a strategy</span> → lock in position sizing & risk rules
                      </li>
                      <li>
                        <span className="font-semibold text-emerald-600">2. Validate routing</span> → dry-run payloads with the trading API
                      </li>
                      <li>
                        <span className="font-semibold text-emerald-600">3. Review fills</span> → inspect simulated execution quality
                      </li>
                      <li>
                        <span className="font-semibold text-emerald-600">4. Iterate quickly</span> → apply learnings & re-test instantly
                      </li>
                    </ol>
                  </div>
                </div>

                <div>
                  <span className="font-bricolage text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700/80">
                    Automation
                  </span>
                  <h2 className="mt-4 font-ruigslay text-4xl leading-tight text-[#103224] drop-shadow-[0_18px_36px_rgba(16,50,36,0.22)] md:text-5xl">
                    Graduate to paper trading
                  </h2>
                  <p className="mt-4 font-bricolage text-base leading-relaxed text-[#103224]/80">
                    Wire up risk checks, order tagging, and signal routing to the simulated trading API once your backtests meet your targets. The flow mirrors how pros ship strategies to production—minus the stress.
                  </p>

                  <div className="mt-10 grid gap-6 sm:grid-cols-2">
                    {WORKFLOW_STEPS.map((step) => (
                      <div
                        key={step.heading}
                        className="rounded-3xl border border-emerald-500/10 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-[0_18px_36px_rgba(12,38,26,0.08)]"
                      >
                        <h3 className="font-bricolage text-lg font-semibold text-[#0f3224]">
                          {step.heading}
                        </h3>
                        <p className="mt-3 font-bricolage text-sm leading-relaxed text-[#0f3224]/75">
                          {step.copy}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="resources" className="bg-[var(--surface-base)] py-24">
            <div className="mx-auto max-w-6xl px-4 text-center">
              <span className="font-bricolage text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700/80">
                Keep building
              </span>
              <h2 className="mt-4 font-ruigslay text-4xl leading-tight text-[#103224] drop-shadow-[0_18px_38px_rgba(16,50,36,0.2)] md:text-5xl">
                Resources for the next milestone
              </h2>
              <p className="mx-auto mt-4 max-w-3xl font-bricolage text-base leading-relaxed text-[#103224]/80">
                Keep momentum with curated kits, community scripts, and a trading API reference ready for your first paper fills.
              </p>

              <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {RESOURCE_CARDS.map((card) => (
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

              <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/learn" className="cta-primary px-8 text-lg tracking-[-0.04em]">
                  Continue the curriculum
                </Link>
                <Link href="/api/trading" className="cta-pill px-8 text-lg tracking-[-0.04em]">
                  Inspect the trading API
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
