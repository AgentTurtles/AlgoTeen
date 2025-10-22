import Link from 'next/link';
import Image from 'next/image';
import { getServerSession } from 'next-auth';

import GlobalStyles from '../components/GlobalStyles';
import SiteFooter from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';
import SITE_SEARCH_INDEX from '../data/searchIndex';
import { authOptions } from '../lib/auth';

const NAV_SECTIONS = [
  { id: 'home', label: 'HOME' },
  { id: 'learn', label: 'LEARN' },
  { id: 'trade', label: 'TRADE' },
  { id: 'code', label: 'CODE' },
  { id: 'paper', label: 'PAPER TRADING' },
  { id: 'support', label: 'SUPPORT' }
];

export default async function Home() {
  const session = await getServerSession(authOptions);
  const isAuthenticated = Boolean(session);
  const guard = (path) => (isAuthenticated ? path : `/auth/signup?callbackUrl=${encodeURIComponent(path)}`);

  return (
    <>
      <GlobalStyles />

      <div className="min-h-screen" style={{ scrollBehavior: 'smooth', backgroundColor: 'var(--surface-base)' }}>
  <SiteHeader navItems={NAV_SECTIONS} searchItems={SITE_SEARCH_INDEX} />

      {/* Hero Section */}
      <section id="home" className="relative overflow-hidden w-full animate-fade-in hero-shell" style={{backgroundColor: '#14C262'}}>
        <div className="relative w-full px-4 py-16 hero-inner">
          <div className="relative w-full max-w-7xl mx-auto hero-layout" style={{minHeight: '713px'}}>
            {/* Text Content - Left side with freedom to expand */}
            <div className="relative right-20 top-32 z-10 w-190 hero-copy">
              <div className="hero-title text-white font-medium mb-6"
                   style={{fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '64px', lineHeight: 'normal', letterSpacing: '-2.88px', textShadow: '0 4px 4px rgba(0, 0, 0, 0.25)', textAlign: 'center'}}>
                Master trading, one lesson at a time.
              </div>
              <p className="hero-subtitle text-white font-normal mb-8 w-190 mx-auto"
                 style={{fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '24px', lineHeight: 'normal', letterSpacing: '-1.44px', textAlign: 'center', fontWeight: '400'}}>
                Learn markets the safe way: code strategies, backtest with real data, and paper-trade. Roadmaps, challenges, and zero real money.
              </p>
              <div className="hero-cta-group flex flex-col sm:flex-row gap-4 items-center justify-center mb-6">
                <Link
                  href={isAuthenticated ? '/codelab' : '/auth/signup'}
                  className="cta-primary min-h-[52px] px-7"
                  style={{fontSize: '20px', letterSpacing: '-0.4px'}}
                >
                  {isAuthenticated ? 'Enter CodeLab' : 'Sign Up'}
                </Link>
                <Link
                  href="#learn"
                  className="cta-pill min-h-[52px] px-7"
                  style={{fontSize: '20px', letterSpacing: '-0.4px'}}
                >
                  Learn More
                </Link>
              </div>
              <p className="text-white font-light text-center"
                 style={{fontFamily: 'Bricolage Grotesque', fontSize: '16px', lineHeight: 'normal', letterSpacing: '0px'}}>
                Paper trading only · No real money · For ages 13+
              </p>
            </div>

            {/* Image - Right side with freedom to position */}
            <div className="absolute z-10 hero-figure" style={{right: '-70px', top: '55px'}}>
              <div className="relative">
                <Image
                  src="/image1.png"
                  alt="Trading chart interface"
                  width={900}
                  height={720}
                  className="rounded-3xl shadow-lg hero-image"
                  style={{
                    width: '610px',
                    height: '500px',
                    borderRadius: '20px', 
                    boxShadow: '0 4px 4px 0 rgba(0, 0, 0, 0.25)',
                    objectFit: 'cover'
                  }}
                  priority
                  sizes="(min-width: 1024px) 610px, 90vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Learn Trade Code Section */}
  <section id="learn" className="py-40 animate-fade-in" style={{ backgroundColor: 'var(--surface-white)' }}>
        <div className="mx-auto px-4 max-w-[1640px]">
          <div className="section-frame section-ultra section-mega">
            <div className="section-frame-content">
              <div className="learn-layout grid lg:grid-cols-[1.05fr_0.95fr] gap-16 xl:gap-24 items-center">
                {/* Left Side - Learn Trade Code */}
                <div className="text-left learn-copy">
          <h2 className="learn-heading font-normal leading-none mb-8"
            style={{fontFamily: '"Ruigslay"', letterSpacing: '0px', fontWeight: 600, fontSize: 'clamp(80px, 10vw, 138px)', color: '#1E1E1E', textShadow: '0 18px 36px rgba(16, 32, 24, 0.28)'}}>
                    LEARN
                    <br />
                    TRADE
                    <br />
                    CODE
                  </h2>
                  <div className="flex gap-4 mt-8 flex-wrap learn-cta-group">
                    <Link
                      href={guard('/learn')}
                      className="cta-primary px-7"
                      style={{ fontSize: '18px', letterSpacing: '-0.4px' }}
                    >
                      Get Started
                    </Link>
                    <Link
                      href={guard('/paper-trading')}
                      className="cta-pill px-7"
                      style={{ fontSize: '18px', letterSpacing: '-0.4px' }}
                    >
                      Learn More
                    </Link>
                  </div>
                </div>

                {/* Right Side - Roadmap Image */}
                <div className="flex justify-center lg:justify-end learn-visual">
                  <div className="relative" style={{ maxWidth: '780px' }}>
                    <Image
                      src="/image.png"
                      alt="Roadmap flowchart with connecting arrows"
                      width={780}
                      height={520}
                      className="w-full h-full object-contain"
                      sizes="(min-width: 1024px) 680px, 90vw"
                      style={{ width: '100%', height: 'auto', transform: 'scale(1.25)' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Learn Strategies Section */}
      <section id="trade" style={{backgroundColor: '#14C262'}}>
        <div className="mx-auto px-4 py-20 max-w-[1480px]">
          <div className="section-frame section-wide section-ultra translucent-light">
            <div className="section-frame-content">
              <div className="pattern-mask" aria-hidden="true"></div>
              <span className="section-label">Skill Tracks</span>
              <div className="text-center mb-16">
        <h2 className="text-white font-medium mb-8"
          style={{fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '45px', lineHeight: 'normal', letterSpacing: '-2.7px', textShadow: '0 18px 36px rgba(5, 15, 10, 0.42)'}}>
                  Learn Strategies And Apply Them in Real Time Through Paper Trading
                </h2>
              </div>

              <div className="strategy-layout">
                <div className="strategy-stack mt-[-50px]">
          <h3 className="text-white font-semibold mb-[-20px]"
            style={{fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '28px', letterSpacing: '-1.2px', textShadow: '0 12px 28px rgba(5, 15, 10, 0.4)'}}>
                    Choose your playstyle
                  </h3>
                  <p className="text-white/80 text-base mb-6"
                     style={{fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', letterSpacing: '-0.3px', lineHeight: '1.6'}}>
                    Hero-led roadmaps and live sessions keep you focused. Pick a lane below and work through drills before putting ideas into motion on the paper desk.
                  </p>
                  <div className="strategy-grid">
                    <div className="strategy-card">
                      <h4>Scalping</h4>
                      <p>Quick in-and-out trades, tight risk rules, and momentum cues built for fast movers.</p>
                    </div>
                    <div className="strategy-card">
                      <h4>Momentum</h4>
                      <p>Ride strength with confirmation signals, trailing exits, and structured journal prompts.</p>
                    </div>
                    <div className="strategy-card">
                      <h4>Breakouts</h4>
                      <p>Spot consolidation ranges, plan entries ahead of time, and validate every breakout thesis.</p>
                    </div>
                    <div className="strategy-card">
                      <h4>Range</h4>
                      <p>Mean-reversion setups with auto alerts for extremes plus scripts to manage position sizing.</p>
                    </div>
                    <div className="strategy-card">
                      <h4>Trend</h4>
                      <p>Macro and swing frameworks, complete with multi-timeframe scans and weekly review loops.</p>
                    </div>
                    <div className="strategy-card">
                      <h4>Fundamental</h4>
                      <p>Combine macro stories with earnings beats, valuation metrics, and long-horizon trade plans.</p>
                    </div>
                  </div>
                  <div className="mt-8 strategy-cta-wrap">
                    <button className="cta-pill" type="button">
                      View progression map
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M5 12H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M13 6L19 12L13 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="strategy-visual-shell">
                  <div className="strategy-visual">
                    <Image
                      src="/image2.png"
                      alt="Laptop showing trading interface"
                      width={900}
                      height={580}
                      className="strategy-visual-image"
                      sizes="(min-width: 1700px) 840px, (min-width: 1400px) 760px, (min-width: 1100px) 660px, 90vw"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Code Lab Section */}
  <section id="code" className="pt-22 pb-20" style={{ backgroundColor: 'var(--surface-white)' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="section-frame section-wide soft-green">
            <div className="section-frame-content">
              <div className="code-layout grid lg:grid-cols-[1.05fr_0.95fr] gap-16 items-center">
                <div className="code-copy">
    <h2 className="code-heading mb-2 leading-[0.88]"
            style={{fontFamily: '"Ruigslay"', fontWeight: 600, fontSize: 'clamp(60px, 8vw, 96px)', color: '#1E1E1E', letterSpacing: '-3px', textShadow: '0 18px 36px rgba(20, 40, 30, 0.32)'}}>
                    BUILD
                    CODE
                  </h2>
      <p className="code-subhead text-gray-700 text-lg mb-6 max-w-xl"
                     style={{fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', letterSpacing: '-0.3px'}}>
                    Spin up algorithms in our browser editor, run historical tests, and track performance dashboards without leaving the safe practice environment.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 code-cta-group">
                    <Link
                      href={guard('/codelab')}
                      className="cta-primary px-7"
                      style={{fontSize: '18px', letterSpacing: '-0.4px'}}
                    >
                      Launch Code Lab
                    </Link>
                    <button className="cta-pill px-7" style={{fontSize: '18px', letterSpacing: '-0.4px'}}>
                      Explore Docs
                    </button>
                  </div>
                </div>
                <div className="rounded-[28px] shadow-lg border border-[#CDEBD9] p-8 code-snippet-card" style={{ backgroundColor: 'var(--surface-white)' }}>
                  <div className="flex items-center justify-between mb-6 code-snippet-header">
                    <span className="uppercase tracking-[0.35em] text-xs text-[#0ea351]" style={{fontFamily: 'Bricolage Grotesque'}}>Strategy.js</span>
                    <div className="flex gap-2">
                      <span className="w-3 h-3 rounded-full bg-[#ff5f5f]"></span>
                      <span className="w-3 h-3 rounded-full bg-[#febb2a]"></span>
                      <span className="w-3 h-3 rounded-full bg-[#27c46b]"></span>
                    </div>
                  </div>
                  <pre className="text-sm leading-7 overflow-x-auto" style={{fontFamily: '"Fira Code", "Courier New", monospace', backgroundColor: '#0A281B', color: '#E9FFE9', borderRadius: '18px', padding: '24px', boxShadow: 'inset 0 0 0 1px rgba(233, 255, 233, 0.15)'}}>{`const crossover = createStrategy({
  timeframe: '1h',
  inputs: [ema(9), ema(21)],
  onSignal: ({ enterLong, exit }) => {
    if (ema(9).crossesAbove(ema(21))) enterLong();
    if (ema(9).crossesBelow(ema(21))) exit();
  }
});

backtest(crossover).run('AAPL');`}</pre>
                  <div className="mt-6 flex items-center justify-between text-xs text-[#0ea351] code-snippet-stats">
                    <span style={{fontFamily: 'Bricolage Grotesque'}}>Sharpe 1.6</span>
                    <span style={{fontFamily: 'Bricolage Grotesque'}}>Win Rate 62%</span>
                    <span style={{fontFamily: 'Bricolage Grotesque'}}>Max DD -4.2%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="paper"
        className="py-24"
        style={{ backgroundColor: 'var(--surface-base)' }}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div
            className="section-frame section-wide"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderColor: 'rgba(15, 47, 31, 0.12)',
              boxShadow: '0 32px 72px rgba(8, 35, 20, 0.2)'
            }}
          >
            <div className="section-frame-content">
              <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] items-center">
                <div className="space-y-6">
                  <span className="section-label">Paper trading</span>
                  <h2
                    className="text-emerald-950 font-medium"
                    style={{
                      fontFamily: '"Ruigslay"',
                      fontSize: 'clamp(48px, 6vw, 72px)',
                      letterSpacing: '-2px',
                      textShadow: '0 18px 40px rgba(10, 40, 27, 0.28)'
                    }}
                  >
                    Run the desk without risking real cash.
                  </h2>
                  <p
                    className="text-lg text-emerald-900/80 max-w-xl"
                    style={{ fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', letterSpacing: '-0.2px', lineHeight: '1.7' }}
                  >
                    Build confidence on the simulated trading floor. Monitor watchlists, work orders straight from the chart, and log every practice trade with automatic screenshots and P&amp;L tracking.
                  </p>
                  <ul className="space-y-3">
                    {[
                      {
                        title: 'Guided flow',
                        description: 'Left-to-right layout keeps watchlist, chart, ticket, and positions within reach.'
                      },
                      {
                        title: 'Risk guardrails',
                        description: 'Buying power checks, loss limits, and quick fixes prevent accidental over-sizing.'
                      },
                      {
                        title: 'Performance insights',
                        description: 'Equity, heatmaps, and journaling snapshots make reviews fast for teens and mentors.'
                      }
                    ].map((item) => (
                      <li
                        key={item.title}
                        className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4"
                      >
                        <span
                          className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-emerald-600 text-white"
                          style={{ fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '18px', fontWeight: 600 }}
                        >
                          ✓
                        </span>
                        <div>
                          <p className="text-base font-semibold text-emerald-950">{item.title}</p>
                          <p className="text-sm text-emerald-900/75">{item.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-4">
                    <Link
                      href={guard('/paper-trading')}
                      className="cta-primary px-7"
                      style={{ fontSize: '18px', letterSpacing: '-0.4px' }}
                    >
                      Launch paper desk
                    </Link>
                    <Link
                      href={guard('/paper-trading#desk')}
                      className="cta-pill px-7"
                      style={{ fontSize: '18px', letterSpacing: '-0.4px' }}
                    >
                      Explore the layout
                    </Link>
                  </div>
                </div>
                <div className="relative">
                  <div
                    className="rounded-[28px] border border-emerald-900/15 bg-[#04160c] p-6 shadow-[0_24px_60px_rgba(4,22,12,0.45)]"
                    aria-hidden="true"
                  >
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/80">Watchlist</p>
                          <div className="mt-3 space-y-3 text-sm text-emerald-50/90">
                            <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                              <span>AAPL</span>
                              <span className="text-emerald-300">+1.8%</span>
                            </div>
                            <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                              <span>TSLA</span>
                              <span className="text-rose-300">-0.6%</span>
                            </div>
                            <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                              <span>BTC</span>
                              <span className="text-emerald-300">+3.4%</span>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/80">Open ticket</p>
                          <p className="mt-3 text-sm text-emerald-50/90">Buy 1 @ 132.40 · Risk 1.5%</p>
                          <div className="mt-4 flex items-center gap-2">
                            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/80 px-3 py-1 text-xs font-semibold text-white">
                              Place order
                            </span>
                            <span className="text-xs text-emerald-200/70">Simulated</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col justify-between gap-4">
                        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-emerald-500/20 via-emerald-400/10 to-transparent p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/80">Chart</p>
                          <div className="mt-3 h-40 rounded-xl bg-[#0b2516]">
                            <div className="h-full w-full rounded-xl bg-[radial-gradient(circle_at_top,#34d39955,transparent_65%)]"></div>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/80">P&amp;L</p>
                          <p className="mt-2 text-emerald-50/90">Day +$128 · Week +$402</p>
                          <p className="text-xs text-emerald-200/60">Daily loss guardrail: $250</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24" style={{ backgroundColor: '#14C262' }}>
        <div className="container-shell">
          <div
            className="section-shell px-6 py-14 lg:px-16"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(15, 47, 31, 0.12)',
              boxShadow: '0 28px 60px rgba(10, 40, 27, 0.2)',
              backdropFilter: 'blur(6px)'
            }}
          >
            <div className="text-center mb-12">
        <h2 className="font-normal"
          style={{fontFamily: '"Ruigslay"', fontWeight: 600, fontSize: 'clamp(48px, 6vw, 72px)', color: '#103224', letterSpacing: '-2px', textShadow: '0 8px 24px rgba(16, 50, 36, 0.2)'}}>
                Pricing Plan
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto mt-4"
            style={{fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', letterSpacing: '-0.3px', color: 'rgba(16, 50, 36, 0.7)'}}>
                Start free, then unlock deeper analytics, guided challenges, and code-ready trading scripts when you’re ready for more.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
              {/* Basic Plan */}
              <div
                className="depth-card h-full flex flex-col p-8"
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(15, 47, 31, 0.16)',
                  boxShadow: '0 32px 62px rgba(8, 35, 20, 0.28)'
                }}
              >
                <div className="mb-6">
                  <h3 className="font-normal" style={{fontFamily: 'Ruigslay', fontWeight: 400, fontSize: '40px', lineHeight: '32px', letterSpacing: '-0.17px', color: '#103224', textShadow: '0 8px 20px rgba(16, 50, 36, 0.18)'}}>
                    Basic
                  </h3>
                  <p className="font-light mt-3" style={{fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '18px', lineHeight: '30px', color: '#3C3C3C'}}>
                    For learning purposes only.
                  </p>
                </div>
                <div className="mb-6 flex items-center gap-3">
                  <span className="font-normal" style={{fontFamily: 'Ruigslay', fontWeight: 400, fontSize: '58px', lineHeight: '48px', color: '#1E1E1E'}}>
                    Free
                  </span>
                </div>
                <div className="w-full h-px mb-6 bg-gray-200"></div>
                <div className="flex-1 mb-8">
                  <p className="font-light mb-4" style={{fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '20px', lineHeight: '32px', color: '#3C3C3C'}}>
                    What’s included:
                  </p>
                  <ul className="font-light space-y-2"
                      style={{fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '20px', lineHeight: '32px', color: '#3C3C3C', listStyle: 'disc', paddingLeft: '24px'}}>
                    <li>Roadmaps</li>
                    <li>Paper Trading</li>
                  </ul>
                </div>
                <button className="cta-pill w-full justify-center" style={{minHeight: '56px'}}>
                  <span className="font-normal" style={{fontFamily: 'Ruigslay', fontWeight: 400, fontSize: '24px', lineHeight: '28px', color: '#0f2f1f', textAlign: 'center'}}>
                    Start with Free
                  </span>
                </button>
              </div>

              {/* Premium Plan */}
              <div
                className="depth-card h-full flex flex-col p-8"
                style={{
                  background: '#f4fbf6',
                  border: '1px solid rgba(20, 194, 98, 0.28)',
                  boxShadow: '0 32px 64px rgba(10, 40, 27, 0.26)'
                }}
              >
                <div className="mb-6">
                  <span className="pricing-badge">Most popular</span>
                  <h3 className="font-normal" style={{fontFamily: 'Ruigslay', fontWeight: 600, fontSize: '40px', lineHeight: '32px', color: '#0f2f1f', textShadow: '0 8px 20px rgba(15, 47, 31, 0.18)'}}>
                    Premium
                  </h3>
                  <p
                    className="font-light mt-3"
                    style={{
                      fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif',
                      fontSize: '18px',
                      lineHeight: '28px',
                      color: 'rgba(15, 47, 31, 0.78)'
                    }}
                  >
                    For advanced peers. Code, trade, and iterate faster.
                  </p>
                </div>
                <div className="mb-6 flex items-end gap-3">
                  <span className="font-normal" style={{fontFamily: 'Ruigslay', fontWeight: 600, fontSize: '58px', lineHeight: '48px', color: '#0f2f1f'}}>
                    $10
                  </span>
                  <span
                    className="text-sm uppercase tracking-[0.3em]"
                    style={{
                      fontFamily: 'Bricolage Grotesque',
                      color: 'rgba(15, 47, 31, 0.64)'
                    }}
                  >
                    per month
                  </span>
                </div>
                <div className="w-full h-px mb-6" style={{backgroundColor: 'rgba(255, 255, 255, 0.35)'}}></div>
                  <div className="flex-1 mb-8">
                  <p className="font-light mb-4" style={{fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '20px', lineHeight: '32px', color: 'rgba(15, 47, 31, 0.75)'}}>
                    What’s included:
                  </p>
                  <ul
                    className="font-light space-y-2"
                    style={{
                      fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif',
                      fontSize: '20px',
                      lineHeight: '32px',
                      color: '#0f2f1f',
                      listStyle: 'disc',
                      paddingLeft: '24px'
                    }}
                  >
                    <li>Roadmaps</li>
                    <li>Paper Trading</li>
                    <li>Code Editor & Backtesting</li>
                    <li>Trading Scripts</li>
                  </ul>
                </div>
                <button className="cta-primary w-full justify-center" style={{minHeight: '56px'}}>
                  <span className="font-normal" style={{fontFamily: 'Ruigslay', fontWeight: 400, fontSize: '24px', lineHeight: '28px', color: '#1E1E1E', textAlign: 'center'}}>
                    Start with Pro
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Support Section */}
  <section id="support" className="py-28" style={{ backgroundColor: 'var(--surface-white)' }}>
        <div className="mx-auto px-4 max-w-[1200px] text-center">
          <div className="section-frame section-wide" style={{ background: 'rgba(255, 255, 255, 0.92)', borderColor: 'rgba(15, 47, 31, 0.08)', boxShadow: '0 25px 60px rgba(10, 40, 27, 0.12)' }}>
            <div className="section-frame-content">
              <span className="section-label">Support</span>
        <h2 className="font-medium mb-4"
          style={{fontFamily: '"Ruigslay"', fontSize: 'clamp(42px, 5vw, 60px)', letterSpacing: '-2.1px', color: '#103224', textShadow: '0 16px 34px rgba(10, 40, 27, 0.26)'}}>
                Build AlgoTeen together.
              </h2>
              <p className="mx-auto"
                 style={{fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', letterSpacing: '-0.2px', lineHeight: '1.7', color: 'rgba(16, 50, 36, 0.68)', maxWidth: '640px'}}>
                We’re evolving the learning desk in the open. Jump into the repo, suggest improvements, or log an issue so the community can collaborate on fixes.
              </p>
              <div className="support-actions mt-8">
                <a className="cta-pill" href="https://github.com/AlgoTeen" target="_blank" rel="noreferrer">
                  View repository
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 12H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M13 6L19 12L13 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
                <a className="cta-pill" href="https://github.com/AlgoTeen/issues/new/choose" target="_blank" rel="noreferrer">
                  Open an issue
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 12H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M13 6L19 12L13 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              </div>
              <div className="support-grid mt-12">
                <div className="support-card">
                  <h3>Contribute code</h3>
                  <p>Browse open tasks, submit pull requests, and review documentation to help shape the roadmap. Every improvement ships faster with another set of eyes.</p>
                  <div className="support-actions">
                    <a className="cta-pill" href="https://github.com/AlgoTeen/pulls" target="_blank" rel="noreferrer">
                      Current PRs
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M5 12H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M13 6L19 12L13 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </a>
                  </div>
                </div>
                <div className="support-card">
                  <h3>Request features</h3>
                  <p>Seen a gap in the curriculum or tooling? File a ticket with steps to reproduce, screenshots, or ideas so we can slot it into the next sprint.</p>
                  <div className="support-actions">
                    <a className="cta-pill" href="https://github.com/AlgoTeen/issues" target="_blank" rel="noreferrer">
                      View issues
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M5 12H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M13 6L19 12L13 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </a>
                    <a className="cta-pill" href="mailto:support@algoteen.dev">
                      Email support
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M4 4H20V20H4V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                        <path d="M4 7L12 13L20 7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

        <SiteFooter />
    </div>
    </>
  );
}
