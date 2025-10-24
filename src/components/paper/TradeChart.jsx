'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

const TV_SCRIPT_SRC = 'https://s3.tradingview.com/tv.js';

function ensureTradingViewScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('TradingView unavailable during SSR'));
  }

  if (window.TradingView?.widget) {
    return Promise.resolve();
  }

  if (window.__tradingViewScriptPromise) {
    return window.__tradingViewScriptPromise;
  }

  window.__tradingViewScriptPromise = new Promise((resolve, reject) => {
    try {
      const existing = document.querySelector(`script[src="${TV_SCRIPT_SRC}"]`);
      if (existing) {
        if (window.TradingView?.widget) {
          resolve();
          return;
        }

        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load TradingView script')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = TV_SCRIPT_SRC;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.addEventListener('load', () => resolve(), { once: true });
      script.addEventListener('error', () => reject(new Error('Failed to load TradingView script')));
      document.head.appendChild(script);
    } catch (error) {
      reject(error);
    }
  }).finally(() => {
    if (!window.TradingView?.widget) {
      delete window.__tradingViewScriptPromise;
    }
  });

  return window.__tradingViewScriptPromise;
}

function normalizeTradingViewSymbol(symbol, assetClass = 'stocks') {
  if (!symbol) {
    return 'NASDAQ:AAPL';
  }

  const trimmed = symbol.trim();
  if (!trimmed) {
    return 'NASDAQ:AAPL';
  }

  if (trimmed.includes(':')) {
    return trimmed;
  }

  if (assetClass === 'crypto') {
    const normalized = trimmed.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (!normalized) {
      return 'BTCUSDT';
    }
    return `BINANCE:${normalized}`;
  }

  if (assetClass === 'forex') {
    const normalized = trimmed.replace(/[^A-Z]/gi, '').toUpperCase();
    if (!normalized) {
      return 'EURUSD';
    }
    return `FX:${normalized}`;
  }

  return trimmed.toUpperCase();
}

function mapPresetToResolution(preset) {
  if (!preset) {
    return 'D';
  }

  if (typeof preset.resolution === 'string' && preset.resolution.trim()) {
    return preset.resolution;
  }

  switch (preset.timeframe) {
    case '1Min':
      return '1';
    case '5Min':
      return '5';
    case '15Min':
      return '15';
    case '30Min':
      return '30';
    case '45Min':
      return '45';
    case '1Hour':
      return '60';
    case '2Hour':
      return '120';
    case '4Hour':
      return '240';
    case '1Week':
      return 'W';
    case '1Month':
      return 'M';
    case '3Month':
      return '3M';
    case '6Month':
      return '6M';
    default:
      return 'D';
  }
}

export default function TradeChart({
  symbol,
  assetClass = 'stocks',
  timeframe,
  timeframeOptions = [],
  onTimeframeChange,
  marketStatus,
  reference
}) {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const sectionRef = useRef(null);
  const [chartReady, setChartReady] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const reactId = useId();
  const containerId = useMemo(() => `tradingview-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`, [reactId]);

  useEffect(() => {
    if (!reference) {
      return undefined;
    }

    reference.current = sectionRef.current;
    return () => {
      reference.current = null;
    };
  }, [reference]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    if (widgetRef.current) {
      return undefined;
    }

    let disposed = false;

    setLoading(true);
    setError(null);
    setChartReady(false);

    const preset = timeframeOptions.find((option) => option.id === timeframe);
    const resolution = mapPresetToResolution(preset);
    const initialSymbol = normalizeTradingViewSymbol(symbol, assetClass);

    ensureTradingViewScript()
      .then(() => {
        if (disposed) {
          return;
        }
        if (!containerRef.current || !window.TradingView?.widget) {
          throw new Error('TradingView widget unavailable');
        }

        const widget = new window.TradingView.widget({
          autosize: true,
          symbol: initialSymbol,
          interval: resolution,
          timezone: 'Etc/UTC',
          theme: 'light',
          style: '1',
          locale: 'en',
          toolbar_bg: '#f1f5f9',
          hide_side_toolbar: false,
          allow_symbol_change: false,
          enable_publishing: false,
          container_id: containerId,
          studies: [],
          withdateranges: true
        });

        widgetRef.current = widget;
        widget.onChartReady(() => {
          if (disposed) {
            return;
          }
          setError(null);
          setLoading(false);
          setChartReady(true);
        });
      })
      .catch((err) => {
        if (disposed) {
          return;
        }
        console.error('TradeChart: unable to initialise TradingView widget', err);
        setError('TradingView chart is unavailable right now.');
        setLoading(false);
      });

    return () => {
      disposed = true;
      try {
        widgetRef.current?.remove?.();
      } catch (e) {
        // ignore cleanup errors
      }
      widgetRef.current = null;
    };
  }, [assetClass, containerId, symbol, timeframe, timeframeOptions]);

  useEffect(() => {
    if (!chartReady || !widgetRef.current) {
      return;
    }
    const preset = timeframeOptions.find((option) => option.id === timeframe);
    const resolution = mapPresetToResolution(preset);
    try {
      widgetRef.current.activeChart?.().setResolution?.(resolution, () => {});
    } catch (e) {
      // ignore resolution errors
    }
  }, [chartReady, timeframe, timeframeOptions]);

  useEffect(() => {
    if (!chartReady || !widgetRef.current) {
      return;
    }
    const formatted = normalizeTradingViewSymbol(symbol, assetClass);
    try {
      widgetRef.current.activeChart?.().setSymbol?.(formatted, () => {});
    } catch (e) {
      // ignore symbol errors
    }
  }, [assetClass, chartReady, symbol]);

  return (
    <section
      ref={sectionRef}
      id="paper-chart"
      className="relative flex h-[640px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">{symbol}</h2>
            {marketStatus ? (
              <span
                className={`rounded-full px-2 py-[2px] text-[11px] font-semibold ${
                  marketStatus.isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {marketStatus.label}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-500">
            Powered by TradingView — analyse price action with full drawing tools and built-in studies.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {timeframeOptions.map((option) => {
            const active = option.id === timeframe;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onTimeframeChange?.(option.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  active
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="relative flex-1 bg-slate-50">
        <div ref={containerRef} id={containerId} className="absolute inset-0" />
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-slate-600">
            Loading TradingView…
          </div>
        ) : null}
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-rose-600">
            {error}
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-600">
        <span>Widget controls in the top bar let you add indicators, adjust drawing tools, and share layouts.</span>
        <span className="font-semibold text-slate-500">TradingView data</span>
      </div>
    </section>
  );
}
