"use client";

export default function GlobalStyles() {
  return (
    <style jsx global>{`
        :root {
          --green-base: #14C262;
          --green-dark: #0ea351;
          --green-light: #69e2a3;
          --surface-base: #e7ede7;
          --surface-white: #eaf1ea;
          --surface-muted: #dde7de;
          --surface-ink: #1e1e1e;
          --shadow-soft: 0 6px 18px rgba(0, 0, 0, 0.08);
          --shadow-medium: 0 14px 32px rgba(0, 0, 0, 0.16);
          --shadow-strong: 0 22px 45px rgba(20, 194, 98, 0.22);
          --radius-md: 16px;
          --radius-lg: 24px;
          --radius-xl: 32px;
          --gradient-green: linear-gradient(135deg, #14C262 0%, #20d978 100%);
          --gradient-soft: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0));
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(36px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideLeft {
          from { opacity: 0; transform: translateX(-32px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes slideRight {
          from { opacity: 0; transform: translateX(32px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }

        @keyframes simpleFadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in { animation: fadeIn 0.9s ease-out both; }
        .animate-slide-up { animation: slideUp 0.9s ease-out both; }
        .animate-slide-down { animation: slideDown 0.6s ease-out both; }
        .animate-slide-left { animation: slideLeft 0.9s ease-out both; }
        .animate-slide-right { animation: slideRight 0.9s ease-out both; }
        .animate-fade-in-delay { animation: fadeIn 0.9s ease-out 0.2s both; }
        .animate-slide-up-delay { animation: slideUp 0.9s ease-out 0.3s both; }
        .animate-fade-in-delay-2 { animation: fadeIn 0.9s ease-out 0.45s both; }

        body {
          background: var(--surface-base);
          color: var(--surface-ink);
          overflow-x: hidden;
        }

        .nav-shell {
          background: var(--surface-white);
          border-radius: 999px;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .nav-sticky {
          animation: simpleFadeIn 0.3s ease-out;
          background: rgba(255, 255, 255, 0.98);
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(0, 0, 0, 0.08);
        }

        .nav-link {
          transition: transform 0.2s ease-out, box-shadow 0.2s ease-out, background 0.2s ease-out, color 0.2s ease-out;
          outline: 2px solid transparent;
          outline-offset: 2px;
          color: #1f1f1f;
        }

        .nav-link:focus {
          outline: 2px solid rgba(0, 0, 0, 0.3);
        }

        .nav-link:hover {
          transform: translateY(-2px);
          background: rgba(0, 0, 0, 0.06);
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
        }

        .nav-link.active {
          background: rgba(0, 0, 0, 0.1) !important;
          color: #111111 !important;
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.14);
        }

        .nav-link.active:hover {
          background: rgba(0, 0, 0, 0.16) !important;
        }

        .mobile-menu { animation: fadeIn 0.4s ease-out; }

        .hamburger {
          width: 24px;
          height: 24px;
          position: relative;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .hamburger span {
          display: block;
          height: 2px;
          width: 100%;
          background: white;
          border-radius: 999px;
          transition: all 0.3s ease-out;
          transform-origin: center;
        }

        .hamburger.open span:nth-child(1) { transform: rotate(45deg) translate(6px, 6px); }
        .hamburger.open span:nth-child(2) { opacity: 0; }
        .hamburger.open span:nth-child(3) { transform: rotate(-45deg) translate(6px, -6px); }

        .glass-card {
          background: rgba(255, 255, 255, 0.22);
          border: 1px solid rgba(255, 255, 255, 0.28);
          backdrop-filter: blur(18px);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-soft);
        }

        .depth-card {
          background: var(--surface-white);
          border-radius: var(--radius-lg);
          box-shadow: 0 24px 50px rgba(20, 30, 25, 0.2);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .depth-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 34px 64px rgba(20, 30, 25, 0.28);
        }

        .section-shell {
          background: rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-xl);
          box-shadow: 0 22px 45px rgba(0, 0, 0, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.18);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 999px;
          padding: 14px 28px;
          font-family: 'Bricolage Grotesque', -apple-system, Roboto, Helvetica, sans-serif;
          font-weight: 600;
          letter-spacing: -0.02em;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .btn-secondary:hover {
          transform: translateY(-3px);
          background: rgba(255, 255, 255, 0.25);
          box-shadow: var(--shadow-soft);
        }

        .cta-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.85rem 1.9rem;
          border-radius: 999px;
          background: #ffffff;
          color: #0a0a0a;
          font-weight: 600;
          font-size: 1.02rem;
          letter-spacing: -0.02em;
          border: 1px solid rgba(0, 0, 0, 0.14);
          box-shadow: 0 18px 34px rgba(0, 0, 0, 0.16);
          transition: transform 0.22s ease, box-shadow 0.22s ease, background-color 0.22s ease, color 0.22s ease, border-color 0.22s ease;
          text-decoration: none;
        }

        .cta-primary:hover {
          transform: translateY(-3px);
          background: #f5f5f5;
          color: #000000;
          border-color: rgba(0, 0, 0, 0.22);
          box-shadow: 0 26px 52px rgba(0, 0, 0, 0.2);
        }

        .btn-neutral {
          background: rgba(255, 255, 255, 0.92);
          color: var(--surface-ink);
          border: none;
          border-radius: 999px;
          padding: 14px 28px;
          font-family: 'Bricolage Grotesque', -apple-system, Roboto, Helvetica, sans-serif;
          font-weight: 600;
          letter-spacing: -0.02em;
          box-shadow: var(--shadow-soft);
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .btn-neutral:hover {
          transform: translateY(-3px);
          background: rgba(255, 255, 255, 1);
          box-shadow: var(--shadow-medium);
        }

        .section-frame {
          border-radius: 32px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow: 0 32px 68px rgba(15, 30, 20, 0.18);
          background: rgba(255, 255, 255, 0.96);
        }

        .section-frame.section-wide {
          margin-left: auto;
          margin-right: auto;
          width: min(100%, clamp(960px, 78vw, 1200px));
        }

        .section-frame.section-ultra {
          margin-left: auto;
          margin-right: auto;
          width: min(100%, clamp(1080px, 88vw, 1360px));
        }

        .learn-roadmap-title {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          text-align: center;
        }

        .learn-roadmap-subhead {
          text-align: center;
        }

        @media (min-width: 1024px) {
          .learn-roadmap-title {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            top: clamp(-400px, -18vw, -140px);
          }

          .learn-roadmap-subhead {
            text-align: left;
          }
        }

        .learn-roadmap-title {
          top: clamp(-400px, -18vw, -140px);
        }

        .learn-roadmap-subhead {
          text-align: left;
        }

        .section-frame.section-ultra .section-frame-content {
          padding: clamp(2.4rem, 6vw, 4.8rem);
        }

        .section-frame.section-mega {
          margin-left: auto;
          margin-right: auto;
          width: min(100%, clamp(1280px, 94vw, 1580px));
          border-radius: clamp(34px, 4.6vw, 56px);
        }

        /* Paper trading specific frame: allow wider max width without changing global 'section-wide' */
        .section-frame.paper-frame {
          margin-left: auto;
          margin-right: auto;
          width: min(100%, 1800px);
        }

        .section-frame.section-mega .section-frame-content {
          padding: clamp(2.8rem, 6.5vw, 5.2rem);
        }

        .section-frame.soft-green {
          background: rgba(239, 249, 243, 0.96);
          border-color: rgba(20, 194, 98, 0.16);
        }

        .section-frame.translucent-light {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.24);
          backdrop-filter: blur(14px);
        }

        .section-frame-content {
          padding: clamp(1.5rem, 4vw, 3rem);
        }

        .section-frame.section-wide .section-frame-content {
          padding: clamp(1.65rem, 4.2vw, 3.2rem);
        }

        .section-frame.translucent-light {
          position: relative;
          overflow: hidden;
        }

        .section-frame .pattern-mask {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image: radial-gradient(rgba(255, 255, 255, 0.14) 1px, transparent 1px);
          background-size: 32px 32px;
          opacity: 0.32;
        }

        .section-label {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 1.2rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.22);
          color: #0a2919;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          margin-bottom: 1.5rem;
        }

        .section-label::before {
          content: '';
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #69e2a3;
        }

        .strategy-grid {
          display: grid;
          gap: 1.4rem;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          margin-top: -1rem;
          width: 100%;
          max-width: 780px;
        }

        @media (min-width: 768px) {
          .strategy-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (min-width: 1200px) {
          .strategy-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        .strategy-layout {
          display: grid;
          gap: clamp(1.8rem, 3.2vw, 2.6rem);
          align-items: start;
          justify-content: space-between;
        }

        @media (min-width: 1024px) {
          .strategy-layout {
            grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
          }
        }

        @media (min-width: 1440px) {
          .strategy-layout {
            grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.75fr);
          }
        }

        .strategy-card {
          position: relative;
          background: linear-gradient(145deg, rgba(10, 48, 29, 0.82), rgba(25, 96, 55, 0.68));
          border: 1px solid rgba(105, 226, 163, 0.26);
          border-radius: 18px;
          padding: 0.95rem 1.15rem 1.05rem;
          color: #f6fff6;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          box-shadow: 0 20px 40px rgba(4, 20, 12, 0.28);
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
          overflow: hidden;
          backdrop-filter: blur(9px);
        }

        .strategy-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(130deg, rgba(105, 226, 163, 0.08), rgba(20, 194, 98, 0));
          opacity: 0;
          transition: opacity 0.25s ease;
          pointer-events: none;
          z-index: 0;
        }

        .strategy-card::after {
          content: '';
          position: absolute;
          inset: 1px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          pointer-events: none;
          z-index: 0;
        }

        .strategy-card > * {
          position: relative;
          z-index: 1;
        }

        .strategy-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 24px 48px rgba(4, 20, 12, 0.32);
          border-color: rgba(105, 226, 163, 0.38);
        }

        .strategy-card:hover::before {
          opacity: 1;
        }

        .strategy-card h4 {
          margin: 0;
          font-size: 0.96rem;
          font-weight: 600;
          letter-spacing: -0.01em;
          font-family: 'Bricolage Grotesque', -apple-system, Roboto, Helvetica, sans-serif;
          color: #fafffa;
          text-shadow: 0 8px 18px rgba(0, 0, 0, 0.28);
        }

        .strategy-card h4::after {
          content: '';
          display: inline-block;
          margin-left: 0.45rem;
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: #69e2a3;
          box-shadow: 0 0 0 3px rgba(105, 226, 163, 0.18);
        }

        .strategy-card p {
          margin: 0;
          font-size: 0.88rem;
          line-height: 1.35;
          font-family: 'Bricolage Grotesque', -apple-system, Roboto, Helvetica, sans-serif;
          color: rgba(240, 255, 246, 0.8);
        }

        .cta-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1.6rem;
          border-radius: 999px;
          background: #ffffff;
          color: #0a0a0a;
          font-weight: 600;
          font-size: 0.98rem;
          letter-spacing: -0.01em;
          border: 1px solid rgba(0, 0, 0, 0.12);
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.14);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;
          text-decoration: none;
        }

        .cta-pill:hover {
          transform: translateY(-2px);
          background: rgba(245, 245, 245, 0.95);
          border-color: rgba(0, 0, 0, 0.2);
          box-shadow: 0 20px 36px rgba(0, 0, 0, 0.2);
        }

        .strategy-visual {
          position: relative;
          width: 100%;
          max-width: clamp(320px, 70vw, 780px);
          margin: 0 auto;
        }

        .strategy-visual-image {
          width: 100%;
          height: auto;
          transform: none;
          padding: 0;
        }

        @media (min-width: 1024px) {
          .strategy-visual-image {
            transform: scale(1.25);
            padding-top: 60px;
            padding-right: 24px;
          }
        }

        .strategy-visual-shell {
          display: flex;
          justify-content: center;
          width: 100%;
        }

        @media (min-width: 1024px) {
          .strategy-visual-shell {
            justify-content: flex-end;
          }
        }

        .strategy-stack {
          max-width: 640px;
          width: 100%;
          justify-self: flex-start;
          display: flex;
          flex-direction: column;
          gap: 1.6rem;
        }

        @media (min-width: 1024px) {
          .strategy-visual {
            margin-left: auto;
            margin-right: 0;
          }

          .strategy-stack {
            margin-left: 0;
          }
        }

        .support-grid {
          display: grid;
          gap: clamp(1.5rem, 3vw, 2.5rem);
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          margin-top: clamp(2rem, 5vw, 3.5rem);
        }

        .code-snippet-card {
          width: 100%;
        }

        .support-card {
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(15, 47, 31, 0.12);
          border-radius: 28px;
          padding: clamp(1.8rem, 4vw, 2.4rem);
          box-shadow: 0 28px 48px rgba(10, 40, 27, 0.2);
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }

        .footer-wordmark-wrap {
          pointer-events: none;
        }

        .support-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 36px 62px rgba(10, 40, 27, 0.28);
          border-color: rgba(15, 47, 31, 0.24);
        }

        .support-card h3 {
          margin: 0;
          font-family: 'Ruigslay';
          font-size: clamp(28px, 3vw, 34px);
          letter-spacing: -1.1px;
          color: #103224;
          text-shadow: 0 10px 24px rgba(10, 40, 27, 0.28);
        }

        .support-card p {
          margin: 0;
          font-family: 'Bricolage Grotesque', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 1rem;
          line-height: 1.6;
          color: rgba(16, 50, 36, 0.78);
        }

        .support-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          justify-content: center;
        }

        .cta-pill svg {
          width: 18px;
          height: 18px;
        }

        .support-card .support-actions {
          justify-content: flex-start;
        }

        .pricing-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.45rem 1rem;
          border-radius: 999px;
          background: rgba(20, 194, 98, 0.12);
          color: #0f2f1f;
          font-family: 'Bricolage Grotesque', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          margin-bottom: 1.5rem;
        }

        .container-shell {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.25rem;
        }

        @media (min-width: 768px) {
          .container-shell { padding: 0 2rem; }
        }

        .hero-shell { position: relative; }
        .hero-layout { position: relative; }

        @media (max-width: 1023px) {
          .hero-inner { padding: 3.5rem 1.5rem !important; }
          .hero-layout {
            min-height: auto !important;
            display: flex;
            flex-direction: column-reverse;
            align-items: center;
            gap: 2.5rem;
          }
          .hero-copy {
            position: static !important;
            right: auto !important;
            top: auto !important;
            width: 100%;
            max-width: 520px;
            margin: 0 auto;
            text-align: center !important;
          }
          .hero-title {
            font-size: clamp(40px, 11.5vw, 58px) !important;
            line-height: 1.08 !important;
            letter-spacing: -1.6px !important;
          }
          .hero-subtitle {
            font-size: clamp(16px, 5vw, 20px) !important;
            line-height: 1.55 !important;
            letter-spacing: -0.8px !important;
            max-width: 480px;
          }
          .hero-copy > * {
            text-align: center !important;
          }
          .hero-figure {
            position: relative !important;
            right: auto !important;
            top: auto !important;
            display: flex;
            width: 100%;
            justify-content: center;
            margin-top: 0.5rem;
          }
          .hero-figure .hero-image {
            width: min(100%, 320px) !important;
            height: auto !important;
            max-height: 340px;
            object-position: center;
          }
          .hero-figure > div {
            width: 100%;
            display: flex;
            justify-content: center;
          }
          .hero-figure .text-white {
            text-align: center !important;
            margin-right: 0 !important;
            margin-top: 0.75rem;
          }
          .hero-shell .cta-primary,
          .hero-shell .cta-pill {
            width: 100%;
            max-width: 340px;
            font-size: clamp(18px, 4.6vw, 20px) !important;
            min-height: 52px;
          }
          .hero-cta-group {
            width: 100%;
            max-width: 360px;
            margin-left: auto;
            margin-right: auto;
          }

          .learn-hero {
            padding-top: 5rem;
            padding-bottom: 4rem;
          }
          .learn-hero-content {
            padding-top: 3.5rem !important;
            padding-bottom: 3.5rem !important;
          }
          .learn-hero-content h1 {
            font-size: clamp(64px, 22vw, 120px) !important;
          }
          .learn-hero-content p {
            font-size: 1rem !important;
            line-height: 1.6 !important;
          }
          .learn-hero-content .cta-primary,
          .learn-hero-content .cta-pill {
            width: 100%;
            max-width: 260px;
          }

          .learn-roadmap-shell {
            padding-top: 4rem;
          }
          .learn-roadmap-diagram {
            overflow-x: auto;
            padding-bottom: 1.5rem;
          }
          .learn-roadmap-diagram > * {
            min-width: 760px;
          }
          .learn-roadmap-title {
            position: static !important;
            transform: none !important;
            top: auto !important;
            text-align: center !important;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            align-items: center;
            padding: 0 1rem;
          }
          .learn-roadmap-title span {
            font-size: clamp(48px, 18vw, 112px) !important;
          }
          .learn-roadmap-title p {
            font-size: clamp(20px, 6vw, 28px) !important;
            text-align: center !important;
          }

          .strategy-layout {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2.25rem;
          }
          .strategy-stack {
            margin-top: 0 !important;
            align-items: center;
            text-align: center;
          }
          .strategy-stack h3 {
            font-size: clamp(24px, 6.4vw, 30px) !important;
            text-align: center;
          }
          .strategy-stack p {
            font-size: clamp(15px, 4.3vw, 17px) !important;
            max-width: 520px;
          }
          .strategy-grid {
            margin-top: 0;
            width: 100%;
            max-width: 520px;
            grid-template-columns: minmax(0, 1fr);
          }
          .strategy-card {
            padding: 1.1rem 1.25rem;
          }
          .strategy-card h4 {
            font-size: clamp(0.95rem, 4vw, 1.05rem) !important;
          }
          .strategy-card p {
            font-size: clamp(0.85rem, 3.8vw, 0.95rem) !important;
          }
          .strategy-visual-shell {
            margin-top: 1.5rem;
            width: 100%;
          }
          .strategy-visual {
            max-width: 520px;
          }
          .strategy-cta-wrap {
            display: flex;
            justify-content: center;
          }
          .strategy-cta-wrap .cta-pill {
            width: 100%;
            max-width: 340px;
          }

          .code-cta-group {
            width: 100%;
            max-width: 420px;
            margin-left: auto;
            margin-right: auto;
          }
          .code-cta-group .cta-primary,
          .code-cta-group .cta-pill {
            width: 100%;
            min-height: 52px;
            font-size: clamp(17px, 4.2vw, 18px) !important;
          }

          .learn-layout {
            display: flex;
            flex-direction: column;
            gap: 2.2rem;
          }
          .learn-copy {
            text-align: center !important;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.4rem;
          }
          .learn-heading {
            font-size: clamp(52px, 17vw, 88px) !important;
            line-height: 0.9 !important;
            text-align: center !important;
            letter-spacing: -1.8px !important;
          }
          .learn-cta-group {
            width: 100%;
            justify-content: center;
          }
          .learn-cta-group .cta-primary,
          .learn-cta-group .cta-pill {
            width: 100%;
            max-width: 320px;
          }
          .learn-visual {
            width: 100%;
          }
          .learn-visual img {
            transform: none !important;
          }

          .code-layout {
            display: flex;
            flex-direction: column;
            gap: 2.2rem;
          }
          .code-copy {
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.2rem;
          }
          .code-heading {
            text-align: center;
            font-size: clamp(54px, 15vw, 82px) !important;
            letter-spacing: -2.2px !important;
          }
          .code-subhead {
            max-width: 520px;
            text-align: center !important;
          }

          .section-frame.section-wide,
          .section-frame.section-ultra,
          .section-frame.section-mega {
            width: 100% !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
          .section-frame.section-mega {
            border-radius: clamp(24px, 5vw, 36px);
          }
          .section-frame.section-ultra .section-frame-content,
          .section-frame.section-mega .section-frame-content,
          .section-frame.section-wide .section-frame-content {
            padding: clamp(1.6rem, 6vw, 2.8rem) !important;
          }

          .learn-roadmap-title {
            top: 0;
            transform: none;
            left: auto;
            right: auto;
          }
          .learn-roadmap-subhead {
            font-size: clamp(22px, 7vw, 30px) !important;
          }

          .code-snippet-card {
            max-width: min(100%, 520px);
            padding: clamp(1.4rem, 5.5vw, 2rem) !important;
            margin-left: auto;
            margin-right: auto;
          }
          .code-snippet-card pre {
            padding: clamp(1rem, 4.8vw, 1.4rem) !important;
            font-size: clamp(12px, 3.6vw, 14px) !important;
            line-height: 1.6 !important;
            white-space: pre-wrap !important;
            word-break: break-word !important;
          }
          .code-snippet-header,
          .code-snippet-stats {
            flex-direction: column;
            gap: 0.75rem;
            align-items: center;
          }
          .code-snippet-header span,
          .code-snippet-stats span {
            width: 100%;
            text-align: center;
          }

          .footer-main {
            flex-direction: column;
            gap: 2.5rem;
            align-items: center;
          }
          .footer-note {
            border: none !important;
            padding-right: 0 !important;
            text-align: center;
          }
          .footer-note-text {
            font-size: clamp(16px, 4.6vw, 18px) !important;
            max-width: 520px;
            margin: 0 auto;
          }
          .footer-links {
            width: 100%;
            grid-template-columns: minmax(0, 1fr);
            gap: 1.5rem;
            text-align: center;
          }
          .footer-links-column {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
          }
          .footer-heading {
            font-size: clamp(16px, 5vw, 20px) !important;
          }
          .footer-wordmark-wrap {
            position: static !important;
            margin-top: 3rem;
          }
          .footer-wordmark {
            font-size: clamp(36px, 18vw, 110px) !important;
            transform: none !important;
            line-height: 1 !important;
            padding: 0 !important;
            letter-spacing: clamp(-2px, -0.6vw, -4px) !important;
          }
        }

        html { scroll-behavior: smooth; }

        ::-webkit-scrollbar { width: 12px; }
        ::-webkit-scrollbar-track {
          background: linear-gradient(180deg, rgba(231, 237, 231, 0.95), rgba(210, 225, 214, 0.95));
          border-radius: 999px;
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #0ea351, #14C262);
          border-radius: 999px;
          box-shadow: inset 0 0 0 2px rgba(231, 237, 231, 0.8);
        }
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #0b7f3a, #11a349);
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
    `}</style>
  );
}
