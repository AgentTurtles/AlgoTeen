export default function SiteFooter() {
  return (
    <footer id="footer" className="relative overflow-hidden footer-shell" style={{ background: '#14C262', minHeight: '500px', paddingBottom: '80px' }}>
      <div className="max-w-7xl mx-auto px-4 py-12 footer-inner">
        <div className="flex items-start gap-12 footer-main">
          <div className="flex-1 pr-8 border-r-2 footer-note" style={{ borderColor: 'rgba(30, 30, 30, 0.25)' }}>
            <p
              className="font-normal footer-note-text"
              style={{ fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '20px', lineHeight: '140%', letterSpacing: '-0.4px', color: '#1E1E1E' }}
            >
              Educational platform, not a broker. Simulated trading. Data may be delayed. Do your own research.
            </p>
          </div>

          <div className="flex-1 grid grid-cols-3 gap-12 footer-links">
            <div className="text-center footer-links-column">
              <h4
                className="font-normal mb-6 footer-heading"
                style={{ fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '18px', lineHeight: '140%', color: '#1E1E1E', textShadow: '0 8px 18px rgba(20, 40, 30, 0.22)' }}
              >
                Terms & Conditions
              </h4>
              <ul className="space-y-3" style={{ listStyle: 'none', padding: 0 }}>
                <li>
                  <a
                    href="#"
                    className="font-normal hover:underline transition-colors"
                    style={{ fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '16px', lineHeight: '140%', color: 'rgba(30, 30, 30, 0.82)', textDecoration: 'none' }}
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="font-normal hover:underline transition-colors"
                    style={{ fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '16px', lineHeight: '140%', color: 'rgba(30, 30, 30, 0.82)', textDecoration: 'none' }}
                  >
                    Cookie Policy
                  </a>
                </li>
              </ul>
            </div>

            <div className="text-center footer-links-column">
              <h4
                className="font-normal mb-6 footer-heading"
                style={{ fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '18px', lineHeight: '140%', color: '#1E1E1E', textShadow: '0 8px 18px rgba(20, 40, 30, 0.22)' }}
              >
                Contact ME
              </h4>
              <ul className="space-y-3" style={{ listStyle: 'none', padding: 0 }}>
                <li>
                  <a
                    href="https://github.com/AgentTurtles"
                    target="_blank"
                    rel="noreferrer"
                    className="font-normal hover:underline transition-colors flex items-center justify-center gap-2"
                    style={{ fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '16px', lineHeight: '140%', color: 'rgba(30, 30, 30, 0.82)', textDecoration: 'none' }}
                    aria-label="GitHub profile"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 .5C5.649.5.5 5.649.5 12c0 5.084 3.292 9.394 7.863 10.913.575.106.785-.25.785-.556 0-.274-.01-1-.015-1.962-3.199.695-3.875-1.54-3.875-1.54-.524-1.333-1.279-1.688-1.279-1.688-1.046-.715.08-.7.08-.7 1.157.081 1.766 1.188 1.766 1.188 1.028 1.76 2.697 1.252 3.353.957.104-.744.402-1.252.732-1.54-2.553-.29-5.236-1.276-5.236-5.678 0-1.255.448-2.281 1.183-3.086-.119-.29-.512-1.457.112-3.038 0 0 .964-.309 3.158 1.178.915-.254 1.899-.381 2.876-.386.977.005 1.961.132 2.879.386 2.192-1.487 3.155-1.178 3.155-1.178.627 1.581.235 2.748.116 3.038.737.805 1.181 1.831 1.181 3.086 0 4.412-2.688 5.385-5.25 5.667.413.356.781 1.059.781 2.136 0 1.541-.014 2.783-.014 3.162 0 .308.208.667.79.554C20.71 21.386 24 17.083 24 12c0-6.351-5.149-11.5-12-11.5z" fill="currentColor" />
                    </svg>
                    <span>GitHub</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.linkedin.com/in/shayan-ejaz-61888925b"
                    target="_blank"
                    rel="noreferrer"
                    className="font-normal hover:underline transition-colors flex items-center justify-center gap-2"
                    style={{ fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '16px', lineHeight: '140%', letterSpacing: '-0.32px', color: 'rgba(30, 30, 30, 0.82)', textDecoration: 'none' }}
                    aria-label="LinkedIn profile"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.36 8.1h4.28V24H.36zM8.02 8.1h4.11v2.16h.06c.57-1.08 1.96-2.22 4.03-2.22C22.57 8.04 24 10.15 24 14.22V24h-4.28v-8.1c0-1.93-.03-4.42-2.69-4.42-2.69 0-3.1 2.1-3.1 4.28V24H8.02V8.1z" fill="currentColor" />
                    </svg>
                    <span>LinkedIn</span>
                  </a>
                </li>
              </ul>
            </div>

            <div className="text-center footer-links-column">
              <h4
                className="font-normal footer-heading"
                style={{ fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '18px', lineHeight: '140%', color: '#1E1E1E', textShadow: '0 8px 18px rgba(20, 40, 30, 0.22)' }}
              >
                About Us
              </h4>
            </div>
          </div>
        </div>

        <div className="w-full h-px mt-16 mb-8" style={{ backgroundColor: '#1E1E1E' }}></div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 footer-wordmark-wrap">
        <h1
          className="text-center w-full footer-wordmark"
          style={{
            fontFamily: '"Ruigslay"',
            fontSize: 'clamp(72px, 18vw, 320px)',
            fontWeight: 400,
            letterSpacing: '-5.12px',
            opacity: 1,
            lineHeight: '77%',
            textAlign: 'center',
            margin: 0,
            padding: '0 20px 5px 20px',
            color: '#1E1E1E',
            textShadow: '0 18px 40px rgba(0, 0, 0, 0.32)',
            transform: 'translateY(18%)'
          }}
        >
          ALGOTEEN
        </h1>
      </div>
    </footer>
  );
}
