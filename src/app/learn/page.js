import GlobalStyles from '../../components/GlobalStyles';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import SITE_SEARCH_INDEX from '../../data/searchIndex';
import RoadmapDiagram from '../../components/RoadmapDiagram';

const NAV_ITEMS = [
  { id: 'overview', label: 'OVERVIEW' },
  { id: 'roadmap', label: 'ROADMAP' }
];

export default function LearnPage() {
  return (
    <>
      <GlobalStyles />

      <div className="min-h-screen" style={{ scrollBehavior: 'smooth', backgroundColor: 'var(--surface-base)' }}>
  <SiteHeader navItems={NAV_ITEMS} searchItems={SITE_SEARCH_INDEX} />

        <main>
          <section
            id="overview"
            className="relative overflow-hidden"
            style={{ backgroundColor: '#14C262' }}
          >
            <div className="max-w-6xl mx-auto px-4 pt-24 pb-48 text-center">
              <div
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full mb-6"
                style={{ background: 'rgba(255, 255, 255, 0.18)' }}
              >
                <span
                  style={{
                    fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif',
                    fontSize: '0.82rem',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    color: 'rgba(255, 255, 255, 0.88)'
                  }}
                >
                  Learning Desk
                </span>
              </div>

              <h1
                className="text-white"
                style={{
                  fontFamily: '"Ruigslay"',
                  fontSize: 'clamp(98px, 14vw, 168px)',
                  fontWeight: 600,
                  letterSpacing: '-4.2px',
                  textShadow: '0 22px 48px rgba(0, 0, 0, 0.28)',
                  lineHeight: '0.85'
                }}
              >
                LEARN
              </h1>

              <p
                className="mx-auto mt-8"
                style={{
                  maxWidth: '720px',
                  fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif',
                  fontSize: '22px',
                  lineHeight: '1.6',
                  letterSpacing: '-0.4px',
                  color: 'rgba(255, 255, 255, 0.9)'
                }}
              >
                Move from financial basics to algorithmic execution with a guided progression that blends live workshops,
                interactive drills, and safe paper trading reps.
              </p>

              <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button className="cta-primary px-8" style={{ fontSize: '18px', letterSpacing: '-0.3px' }}>
                  Start the roadmap
                </button>
                <button className="cta-pill px-8" style={{ fontSize: '18px', letterSpacing: '-0.3px' }}>
                  View curriculum
                </button>
              </div>

              <p
                className="mt-6"
                style={{
                  fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif',
                  fontSize: '14px',
                  letterSpacing: '0.24em',
                  textTransform: 'uppercase',
                  color: 'rgba(255, 255, 255, 0.82)'
                }}
              >
                No capital risk · Weekly syncs
              </p>
            </div>
          </section>

          <section id="roadmap" className="relative" style={{ backgroundColor: 'var(--surface-white)' }}>
            <div className="w-full pb-4">
              <div className="relative" style={{ marginTop: 'clamp(16px, 6vw, 120px)' }}>
                <div
                  className="absolute left-1/2 -translate-x-1/2 text-center text-shadow-lg/20"
                  style={{ top: 'clamp(-400px, -18vw, -140px)', alignContent: 'center' }}
                >
                  <span
                    style={{
                      fontFamily: '"Ruigslay"',
                      fontSize: 'clamp(72px, 13vw, 300px)',
                      letterSpacing: '-1.6px',
                      color: '#1E1E1E',
                      textTransform: 'uppercase'
                    }}
                  >
                    Roadmap
                  </span>

                  <p
                    className="mt-4 mx-auto"
                    style={{
                      fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif',
                      fontSize: '40px',
                      lineHeight: '1.6',
                      letterSpacing: '-0.4px',
                      color: '#1E1E1E',
                      textAlign: 'left'
                    }}
                  >
                    MODULE 1: Trading
                  </p>
                </div>
              </div>

              <RoadmapDiagram />
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
