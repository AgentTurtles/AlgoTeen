export default function SiteFooter() {
  return (
    <footer id="footer" className="relative overflow-hidden" style={{ background: '#14C262', minHeight: '500px', paddingBottom: '80px' }}>
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-start gap-12">
          <div className="flex-1 pr-8 border-r-2" style={{ borderColor: 'rgba(30, 30, 30, 0.25)' }}>
            <p
              className="font-normal"
              style={{ fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '20px', lineHeight: '140%', letterSpacing: '-0.4px', color: '#1E1E1E' }}
            >
              Educational platform, not a broker. Simulated trading. Data may be delayed. Do your own research.
            </p>
          </div>

          <div className="flex-1 grid grid-cols-3 gap-12">
            <div className="text-center">
              <h4
                className="font-normal mb-6"
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

            <div className="text-center">
              <h4
                className="font-normal mb-6"
                style={{ fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '18px', lineHeight: '140%', color: '#1E1E1E', textShadow: '0 8px 18px rgba(20, 40, 30, 0.22)' }}
              >
                Contact ME
              </h4>
              <ul className="space-y-3" style={{ listStyle: 'none', padding: 0 }}>
                <li>
                  <a
                    href="#"
                    className="font-normal hover:underline transition-colors"
                    style={{ fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '16px', lineHeight: '140%', color: 'rgba(30, 30, 30, 0.82)', textDecoration: 'none' }}
                  >
                    Github
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="font-normal hover:underline transition-colors"
                    style={{ fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '16px', lineHeight: '140%', letterSpacing: '-0.32px', color: 'rgba(30, 30, 30, 0.82)', textDecoration: 'none' }}
                  >
                    Linkedin
                  </a>
                </li>
              </ul>
            </div>

            <div className="text-center">
              <h4
                className="font-normal"
                style={{ fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '18px', lineHeight: '140%', color: '#1E1E1E', textShadow: '0 8px 18px rgba(20, 40, 30, 0.22)' }}
              >
                About Us
              </h4>
            </div>
          </div>
        </div>

        <div className="w-full h-px mt-16 mb-8" style={{ backgroundColor: '#1E1E1E' }}></div>
      </div>

      <div className="absolute bottom-0 left-0 right-0">
        <h1
          className="text-center w-full"
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
