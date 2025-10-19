import { useEffect, useState } from 'react';

export default function GuidedTour({ anchors, onDismiss }) {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = [
    {
      id: 'watchlist',
      title: 'Watchlist',
      message: 'Pick a symbol to drive the entire desk. We cache your last choice so you hop back in instantly.',
      target: anchors.watchlist
    },
    {
      id: 'chart',
      title: 'Trade-able chart',
      message: 'Click to prefill the ticket, drag ghost lines for stop and target, and study overlays with live stats.',
      target: anchors.chart
    },
    {
      id: 'ticket',
      title: 'Order ticket',
      message: 'Everything you need: side, size slider, risk preview, and a sticky “Place order” button.',
      target: anchors.ticket
    },
    {
      id: 'positions',
      title: 'Positions & performance',
      message: 'Track open risk, journal fills, and export CSV for class. Tabs keep it one scroll.',
      target: anchors.positions
    }
  ];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onDismiss();
    }, 60000);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  const step = steps[currentStep];
  const rect = step?.target?.current?.getBoundingClientRect();
  const style = rect
    ? {
        top: rect.top + window.scrollY + rect.height / 2,
        left: rect.left + window.scrollX + rect.width / 2
      }
    : { top: '50%', left: '50%' };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60">
      <div
        className="absolute max-w-sm rounded-3xl border border-blue-400/70 bg-white/90 px-5 py-4 text-sm shadow-xl backdrop-blur"
        style={{ transform: 'translate(-50%, -50%)', ...style }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Welcome tour</p>
        <h3 className="mt-2 text-base font-semibold text-slate-900">{step?.title}</h3>
        <p className="mt-2 text-sm text-slate-600">{step?.message}</p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((item, index) => (
              <span
                key={item.id}
                className={`h-2 w-2 rounded-full ${index === currentStep ? 'bg-blue-600' : 'bg-slate-300'}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" className="text-xs font-semibold text-slate-500" onClick={onDismiss}>
              Skip
            </button>
            <button
              type="button"
              className="rounded-full bg-blue-700 px-4 py-2 text-xs font-semibold text-white"
              onClick={() => {
                if (currentStep === steps.length - 1) {
                  onDismiss();
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
