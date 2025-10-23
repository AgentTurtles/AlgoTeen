import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const VIEWPORT_PADDING = 24;

export default function GuidedTour({ anchors, onDismiss }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const dismissedRef = useRef(false);
  const cardRef = useRef(null);
  const [position, setPosition] = useState({ top: '50%', left: '50%' });

  const { watchlist, chart, ticket, positions } = anchors ?? {};

  const steps = useMemo(
    () => [
      {
        id: 'watchlist',
        title: 'Watchlist',
        message:
          'Pick a symbol to drive the desk. We remember your last choice so you can jump back in instantly.',
        target: watchlist
      },
      {
        id: 'chart',
        title: 'Interactive chart',
        message:
          'Click to prefill the ticket, drag ghost stop/target lines, and study overlays with live stats.',
        target: chart
      },
      {
        id: 'ticket',
        title: 'Order ticket',
        message: 'Choose side, size, and risk management. The sticky action button keeps trades in reach.',
        target: ticket
      },
      {
        id: 'positions',
        title: 'Positions & performance',
        message: 'Track open risk, journal fills, and export CSV for class—all without leaving the rail.',
        target: positions
      }
    ],
    [watchlist, chart, ticket, positions]
  );

  const safeDismiss = useCallback(() => {
    if (dismissedRef.current) {
      return;
    }
    dismissedRef.current = true;
    setDismissed(true);
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => onDismiss?.());
    } else {
      onDismiss?.();
    }
  }, [onDismiss]);

  const updatePosition = useCallback(() => {
    if (dismissed || typeof window === 'undefined') {
      return;
    }

    const cardEl = cardRef.current;
    if (!cardEl) {
      return;
    }

    const step = steps[currentStep];
    const rect = step?.target?.current?.getBoundingClientRect?.();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    const defaultX = scrollX + viewportWidth / 2;
    const defaultY = scrollY + viewportHeight / 2;

    let centerX = defaultX;
    let centerY = defaultY;

    if (rect) {
      centerX = scrollX + rect.left + rect.width / 2;
      centerY = scrollY + rect.top + rect.height / 2;
    }

    const cardWidth = cardEl.offsetWidth;
    const cardHeight = cardEl.offsetHeight;
    const halfWidth = cardWidth / 2;
    const halfHeight = cardHeight / 2;

    const minX = scrollX + VIEWPORT_PADDING + halfWidth;
    const maxX = scrollX + viewportWidth - VIEWPORT_PADDING - halfWidth;
    const minY = scrollY + VIEWPORT_PADDING + halfHeight;
    const maxY = scrollY + viewportHeight - VIEWPORT_PADDING - halfHeight;

    const clampedX = Math.min(Math.max(centerX, minX), maxX);
    const clampedY = Math.min(Math.max(centerY, minY), maxY);

    setPosition({ top: clampedY, left: clampedX });
  }, [currentStep, dismissed, steps]);

  useEffect(() => {
    if (dismissed || typeof window === 'undefined') {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      safeDismiss();
    }, 60000);
    return () => window.clearTimeout(timer);
  }, [dismissed, safeDismiss]);

  useEffect(() => {
    if (dismissed || typeof window === 'undefined') {
      return undefined;
    }
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        safeDismiss();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dismissed, safeDismiss]);

  useEffect(() => {
    if (dismissed || typeof window === 'undefined') {
      return undefined;
    }
    const raf = window.requestAnimationFrame(updatePosition);
    return () => window.cancelAnimationFrame(raf);
  }, [currentStep, dismissed, updatePosition]);

  useEffect(() => {
    if (dismissed || typeof window === 'undefined') {
      return undefined;
    }
    const handle = () => updatePosition();
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, { passive: true });
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle);
    };
  }, [dismissed, updatePosition]);

  if (dismissed) {
    return null;
  }

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-40 bg-emerald-950/45 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,95,78,0.18),_transparent_65%)]" aria-hidden />
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-live="polite"
        className="absolute w-[min(320px,90vw)] rounded-3xl border border-emerald-500/35 bg-white/95 px-6 py-5 text-sm shadow-[0_28px_80px_rgba(6,24,14,0.22)] backdrop-blur"
        style={{ top: position.top, left: position.left, transform: 'translate(-50%, -50%)' }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600">Paper desk tour</p>
        <h3 className="mt-2 text-lg font-semibold text-emerald-950">{step?.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-emerald-900/70">{step?.message}</p>
        <div className="mt-5 flex items-center justify-between">
          <div className="flex gap-1.5">
            {steps.map((item, index) => (
              <span
                key={item.id}
                className={
                  index === currentStep
                    ? 'h-1.5 w-6 rounded-full bg-emerald-500'
                    : 'h-1.5 w-1.5 rounded-full bg-emerald-200'
                }
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="text-xs font-semibold text-emerald-600 transition hover:text-emerald-700"
              onClick={safeDismiss}
            >
              Skip
            </button>
            <button
              type="button"
              className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
              onClick={() => {
                if (currentStep === steps.length - 1) {
                  safeDismiss();
                  return;
                }
                setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1));
              }}
            >
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
