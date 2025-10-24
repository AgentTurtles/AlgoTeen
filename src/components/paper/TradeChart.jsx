 'use client';

import { useEffect, useRef, useState } from 'react';
import { computeSMA } from './utils';

export default function TradeChart({
  data,
  symbol,
  overlays,
  onToggleOverlay,
  onChartClick,
  onChartDoubleClick,
  onMarkerChange,
  markers,
  filledOrders,
  activeSide,
  reference,
  timeframe,
  timeframeOptions,
  onTimeframeChange,
  marketStatus
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const smaSeriesRef = useRef(null);
  const vwapSeriesRef = useRef(null);
  const priceLinesRef = useRef([]);
  const volumeSeriesRef = useRef(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let chartInstance = null;
    let resizeObserver = null;
    let disposed = false;

    const reactElementType = typeof Symbol === 'function' ? Symbol.for('react.element') : null;

    const isReactElement = (value) =>
      !!reactElementType &&
      value &&
      typeof value === 'object' &&
      value.$$typeof === reactElementType;

    const resolveChartApi = (entry) => {
      if (!entry) return null;

      const seen = new Set();
      const queue = [entry];
      const candidateKeys = [
        'chart',
        'chartApi',
        'api',
        '_chart',
        '__chart',
        '_lightweightChart',
        'value',
        'current',
        'default',
        'instance'
      ];

      while (queue.length) {
        const value = queue.shift();
        if (!value || seen.has(value)) continue;
        seen.add(value);

        if (typeof value.addCandlestickSeries === 'function') {
          return value;
        }

        const valueType = typeof value;
        if (valueType !== 'object' && valueType !== 'function') {
          continue;
        }

        if (isReactElement(value)) {
          continue;
        }

        const enqueue = (candidate) => {
          if (!candidate || seen.has(candidate)) return;
          queue.push(candidate);
        };

        for (const key of candidateKeys) {
          if (key === 'ref' || key === 'key') continue;
          try {
            enqueue(value[key]);
          } catch (e) {}
        }

        try {
          const ownKeys = [
            ...Object.keys(value),
            ...Object.getOwnPropertyNames(value)
          ];
          for (const key of ownKeys) {
            if (candidateKeys.includes(key) || key === 'ref' || key === 'key') continue;
            enqueue(value[key]);
          }
        } catch (e) {}

        try {
          const symbols = Object.getOwnPropertySymbols(value);
          for (const sym of symbols) {
            enqueue(value[sym]);
          }
        } catch (e) {}

        try {
          const proto = Object.getPrototypeOf(value);
          if (proto && proto !== Object.prototype && proto !== Function.prototype) {
            enqueue(proto);
          }
        } catch (e) {}
      }

      return null;
    };

    const findApiFromDom = (root) => {
      if (!root) return null;
      const visited = new Set();
      const stack = [{ node: root, depth: 0 }];
      const maxDepth = 3;
      const propCandidates = ['_chart', '__chart', 'chart', 'chartApi', '_lightweightChart'];

      while (stack.length) {
        const { node, depth } = stack.pop();
        if (!node || visited.has(node) || depth > maxDepth) continue;
        visited.add(node);

        try {
          for (const key of propCandidates) {
            if (key in node) {
              const resolved = resolveChartApi(node[key]);
              if (resolved) return resolved;
            }
          }
        } catch (e) {}

        try {
          const props = Object.getOwnPropertyNames(node).filter((prop) => prop !== 'ref');
          for (const prop of props) {
            if (propCandidates.includes(prop)) continue;
            const val = node[prop];
            const resolved = resolveChartApi(val);
            if (resolved) return resolved;
          }
        } catch (e) {}

        try {
          if (node.childNodes && node.childNodes.length) {
            node.childNodes.forEach((child) => {
              stack.push({ node: child, depth: depth + 1 });
            });
          }
        } catch (e) {}
      }

      return null;
    };

    const handleResize = () => {
      if (!containerRef.current || !chartRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      chartRef.current.applyOptions({
        width: Math.max(0, Math.floor(width)),
        height: Math.max(0, Math.floor(height))
      });
    };

    const cleanup = () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        try {
          resizeObserver.disconnect();
        } catch (e) {}
        resizeObserver = null;
      }
      if (chartInstance && typeof chartInstance.remove === 'function') {
        try {
          chartInstance.remove();
        } catch (e) {}
      }
      chartInstance = null;
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      smaSeriesRef.current = null;
      vwapSeriesRef.current = null;
      priceLinesRef.current = [];
    };

    try {
      container.innerHTML = '';
    } catch (e) {}

    const waitForNextFrame = () =>
      new Promise((resolve) => {
        try {
          requestAnimationFrame(() => resolve());
        } catch (e) {
          setTimeout(() => resolve(), 16);
        }
      });

    const loadLightweightChartsFromCdn = () => {
      if (typeof window === 'undefined') return Promise.resolve(null);
      if (window.LightweightCharts?.createChart) {
        return Promise.resolve(window.LightweightCharts);
      }

      if (window.__lightweightChartsPromise) {
        return window.__lightweightChartsPromise;
      }

      window.__lightweightChartsPromise = new Promise((resolve, reject) => {
        try {
          const existing = document.querySelector('script[data-lightweight-charts]');
          if (existing) {
            existing.addEventListener('load', () => resolve(window.LightweightCharts ?? null), {
              once: true
            });
            existing.addEventListener(
              'error',
              (event) => reject(event instanceof Event ? new Error('Failed to load lightweight-charts script') : event),
              { once: true }
            );
            return;
          }

          const script = document.createElement('script');
          script.src = 'https://unpkg.com/lightweight-charts@5.0.9/dist/lightweight-charts.standalone.production.js';
          script.async = true;
          script.crossOrigin = 'anonymous';
          script.dataset.lightweightCharts = 'true';
          script.addEventListener('load', () => resolve(window.LightweightCharts ?? null), { once: true });
          script.addEventListener('error', (event) => {
            reject(event instanceof Event ? new Error('Failed to load lightweight-charts script') : event);
          });
          document.head.appendChild(script);
        } catch (error) {
          reject(error);
        }
      }).finally(() => {
        if (!window.LightweightCharts?.createChart) {
          delete window.__lightweightChartsPromise;
        }
      });

      return window.__lightweightChartsPromise;
    };

    const initialiseChart = async () => {
      const chartOptions = {
        layout: { backgroundColor: '#ffffff', textColor: '#0f172a' },
        rightPriceScale: { visible: true },
        timeScale: { timeVisible: true, rightOffset: 12 }
      };

      const attemptLoaders = [
        {
          source: 'module',
          load: async () => {
            let module;
            try {
              module = await import('lightweight-charts');
            } catch (error) {
              throw { type: 'moduleImport', error };
            }

            const createChartFn =
              typeof module?.createChart === 'function'
                ? module.createChart
                : typeof module?.default === 'function'
                  ? module.default
                  : typeof module?.default?.createChart === 'function'
                    ? module.default.createChart
                    : null;

            const crosshairModeNormal =
              module?.CrosshairMode?.Normal ??
              module?.default?.CrosshairMode?.Normal ??
              0;

            if (typeof createChartFn !== 'function') {
              throw { type: 'createChartExport', error: new Error('Invalid createChart export') };
            }

            return {
              createChart: createChartFn,
              crosshairMode: crosshairModeNormal,
              meta: { source: 'module' }
            };
          }
        },
        {
          source: 'cdn',
          load: async () => {
            if (typeof window === 'undefined') {
              return null;
            }

            const globalLib = await loadLightweightChartsFromCdn();
            if (!globalLib?.createChart) {
              throw { type: 'cdnLoad', error: new Error('CDN script did not expose createChart') };
            }

            return {
              createChart: globalLib.createChart.bind(globalLib),
              crosshairMode: globalLib?.CrosshairMode?.Normal ?? 0,
              meta: { source: 'cdn' }
            };
          }
        }
      ];

      let lastError = null;
      let resolutionMeta = null;

      for (const attempt of attemptLoaders) {
        if (disposed) return;

        let payload;
        try {
          payload = await attempt.load();
        } catch (failure) {
          if (disposed) return;
          const failureInfo = failure && failure.type ? failure : { type: 'unknown', error: failure };
          lastError = failureInfo.error ?? failureInfo;
          console.error(`TradeChart: ${failureInfo.type === 'moduleImport' ? 'failed to load lightweight-charts module' : failureInfo.type === 'cdnLoad' ? 'failed to initialise lightweight-charts from CDN' : 'chart loader error'}`, failureInfo.error ?? failureInfo);
          continue;
        }

        if (!payload || typeof payload.createChart !== 'function') {
          lastError = new Error('Chart loader returned no factory');
          continue;
        }

        if (disposed) return;

        try {
          container.innerHTML = '';
        } catch (e) {}

        let created;
        try {
          created = payload.createChart(container, {
            ...chartOptions,
            crosshair: { mode: payload.crosshairMode ?? 0 }
          });
        } catch (error) {
          if (disposed) return;
          lastError = error;
          console.error(`TradeChart: error creating chart via ${payload.meta?.source ?? attempt.source}`, error);
          continue;
        }

        const disposeCreated = () => {
          if (!created) return;
          try {
            if (typeof created.remove === 'function') {
              created.remove();
            }
          } catch (e) {}
        };

        chartInstance = resolveChartApi(created);
        let resolvedVia = 'direct';

        if (!chartInstance) {
          chartInstance = findApiFromDom(container);
          if (chartInstance) {
            resolvedVia = 'dom';
          }
        }

        if (!chartInstance) {
          await waitForNextFrame();
          if (disposed) return;
          chartInstance = resolveChartApi(created) ?? findApiFromDom(container);
          if (chartInstance && resolvedVia !== 'dom') {
            resolvedVia = 'deferred';
          } else if (chartInstance && resolvedVia === 'dom') {
            resolvedVia = 'dom-deferred';
          }
        }

        if (chartInstance && typeof chartInstance.addCandlestickSeries === 'function') {
          resolutionMeta = {
            source: payload.meta?.source ?? attempt.source,
            resolvedVia
          };
          break;
        }

        disposeCreated();
        chartInstance = null;
        lastError = new Error('createChart result did not expose a usable API');
      }

      if (!chartInstance || typeof chartInstance.addCandlestickSeries !== 'function') {
        console.error('TradeChart: could not resolve chart API from createChart result');
        setDebugInfo({
          error: 'chartApi',
          message: 'Failed to resolve chart API',
          details: lastError?.message
        });
        setUseFallback(true);
        cleanup();
        return;
      }

      chartRef.current = chartInstance;

      try {
        candleSeriesRef.current = chartInstance.addCandlestickSeries({
          upColor: '#0F9D58',
          borderUpColor: '#0F9D58',
          wickUpColor: '#0F9D58',
          downColor: '#DC2626',
          borderDownColor: '#DC2626',
          wickDownColor: '#DC2626'
        });
      } catch (error) {
        console.error('TradeChart: failed to create candlestick series', error);
        setDebugInfo({ error: 'candlestickSeries', message: error?.message ?? String(error) });
        setUseFallback(true);
        cleanup();
        return;
      }

      try {
        volumeSeriesRef.current = chartInstance.addHistogramSeries({
          scaleMargins: { top: 0.8, bottom: 0 },
          priceFormat: { type: 'volume' },
          color: '#8b98c9',
          priceLineVisible: false
        });
      } catch (error) {
        console.error('TradeChart: failed to create volume series', error);
        volumeSeriesRef.current = null;
      }

      try {
        smaSeriesRef.current = chartInstance.addLineSeries({
          color: '#1D4ED8',
          lineWidth: 2
        });
      } catch (error) {
        smaSeriesRef.current = null;
      }

      try {
        vwapSeriesRef.current = chartInstance.addLineSeries({
          color: '#0F766E',
          lineWidth: 2
        });
      } catch (error) {
        vwapSeriesRef.current = null;
      }

      if (disposed) return;

      window.addEventListener('resize', handleResize);
      handleResize();
      if (typeof ResizeObserver !== 'undefined') {
        try {
          resizeObserver = new ResizeObserver(() => handleResize());
          resizeObserver.observe(container);
        } catch (e) {
          resizeObserver = null;
        }
      }

      setUseFallback(false);
      setDebugInfo({ initialized: true, ...(resolutionMeta ?? {}) });
    };

    initialiseChart();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  // small on-page debug area when developer appends ?chartdebug=1 to URL
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      if (!params.has('chartdebug')) return;
      const info = {
        typeofCreateChart: 'dynamic-import',
        containerNode: containerRef.current ? containerRef.current.nodeName : null,
        containerChildren: containerRef.current ? containerRef.current.childNodes.length : 0,
        chartRefPresent: !!chartRef.current
      };
      setDebugInfo(info);
    } catch (e) {}
  }, []);

        

  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current) return;
    const candles = data.map((d) => ({
      time: d.time && Number.isFinite(d.time) ? Math.floor(d.time / 1000) : d.index,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close
    }));
    candleSeriesRef.current.setData(candles);

    const volumes = data.map((d) => ({
      time: d.time && Number.isFinite(d.time) ? Math.floor(d.time / 1000) : d.index,
      value: d.volume,
      color: d.close >= d.open ? '#0F9D58' : '#DC2626'
    }));
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData(volumes);
    }

    // price lines are managed in a separate effect (markers/activeSide)

    if (smaSeriesRef.current) {
      if (overlays.sma) {
        const sma = computeSMA(data, 20).map((p) => ({ time: Math.floor(p.index ? p.index : 0), value: p.value }));
        smaSeriesRef.current.setData(
          sma.map((p, i) => ({ time: candles[i]?.time ?? i, value: p.value }))
        );
        smaSeriesRef.current.applyOptions({ visible: true });
      } else {
        smaSeriesRef.current.setData([]);
        smaSeriesRef.current.applyOptions({ visible: false });
      }
    }

    // VWAP overlay (running VWAP across data)
    if (overlays.vwap && vwapSeriesRef.current) {
      let cumulativePV = 0;
      let cumulativeV = 0;
      const vwapPoints = data.map((d, i) => {
        cumulativePV += (d.close || 0) * (d.volume || 0);
        cumulativeV += d.volume || 0;
        const v = cumulativeV ? cumulativePV / cumulativeV : null;
        return { time: candles[i]?.time ?? i, value: v };
      }).filter(p => p.value != null);
      vwapSeriesRef.current.setData(vwapPoints);
      vwapSeriesRef.current.applyOptions({ visible: true });
    } else if (vwapSeriesRef.current) {
      vwapSeriesRef.current.setData([]);
      vwapSeriesRef.current.applyOptions({ visible: false });
    }
  }, [data, overlays, markers, activeSide]);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = chartRef.current;
    const handleClick = (param) => {
      if (!param || !param.time) return;
      const price = param.seriesPrices && param.seriesPrices.get(candleSeriesRef.current);
      const value = price ? price.close ?? price : null;
      if (value != null) onChartClick && onChartClick(Number(value));
    };

    chart.subscribeClick(handleClick);
    return () => chart.unsubscribeClick(handleClick);
  }, [onChartClick, useFallback]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (ev) => {
      const last = data[data.length - 1];
      if (last) onChartDoubleClick && onChartDoubleClick(last.close);
    };
    el.addEventListener('dblclick', handler);
    return () => el.removeEventListener('dblclick', handler);
  }, [data, onChartDoubleClick, useFallback]);


  // Manage price line markers (entry/stop/target)
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    // remove previous lines
    try {
      priceLinesRef.current.forEach((pl) => {
        try { candleSeriesRef.current.removePriceLine(pl); } catch (e) {}
      });
    } catch (e) {}
    priceLinesRef.current = [];

    try {
      const series = candleSeriesRef.current;
      if (series) {
        if (markers?.entry != null) {
          const pl = series.createPriceLine({ price: markers.entry, color: activeSide === 'buy' ? '#2563EB' : '#DC2626', lineWidth: 2, axisLabelVisible: true, title: 'Entry' });
          priceLinesRef.current.push(pl);
        }
        if (markers?.stop != null) {
          const pl = series.createPriceLine({ price: markers.stop, color: '#DC2626', lineWidth: 1, axisLabelVisible: true, title: 'Stop', lineStyle: 2 });
          priceLinesRef.current.push(pl);
        }
        if (markers?.target != null) {
          const pl = series.createPriceLine({ price: markers.target, color: '#16A34A', lineWidth: 1, axisLabelVisible: true, title: 'Target', lineStyle: 1 });
          priceLinesRef.current.push(pl);
        }
      }
    } catch (e) {
      // ignore marker rendering errors
    }
  }, [markers, activeSide]);

  // expose the chart API to a parent-provided ref (if present)
  useEffect(() => {
    if (!reference) return;
    try {
      reference.current = chartRef.current;
    } catch (e) {
      // ignore assignment errors
    }
    return () => {
      try {
        reference.current = null;
      } catch (e) {}
    };
  }, [reference]);

  return (
    <section
      id="paper-chart"
      className="relative flex h-[640px] flex-col rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">{symbol}</h2>
            {marketStatus ? (
              <span
                className={`rounded-full px-2 py-[2px] text-[11px] font-semibold ${
                  marketStatus.isOpen
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {marketStatus.label}
              </span>
            ) : null}
          </div>
          <button type="button" onClick={() => onToggleOverlay('sma')} className="rounded-full border px-3 py-1 text-xs font-semibold">MA20</button>
          <button type="button" onClick={() => onToggleOverlay('vwap')} className="rounded-full border px-3 py-1 text-xs font-semibold">VWAP</button>
          <button type="button" onClick={() => onToggleOverlay('rsi')} className="rounded-full border px-3 py-1 text-xs font-semibold">RSI</button>
        </div>
      </div>
      <div className="flex-1 p-4">
        {useFallback ? (
          <div className="h-[520px] w-full flex items-center justify-center bg-slate-50">
            <svg width="600" height="320" viewBox="0 0 600 320" className="m-auto">
              <rect width="100%" height="100%" fill="#fff" stroke="#e2e8f0" />
              <text x="50%" y="50%" alignmentBaseline="middle" textAnchor="middle" fill="#475569">Chart unavailable — using fallback</text>
            </svg>
          </div>
        ) : (
          <div ref={containerRef} className="h-[520px] w-full" />
        )}
        {debugInfo ? (
          <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            <div className="font-medium">TradeChart debug</div>
            <pre className="whitespace-pre-wrap">{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => chartRef.current && chartRef.current.timeScale().scrollToRealTime()}
            className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            Zoom in
          </button>
          <button
            type="button"
            onClick={() => chartRef.current && chartRef.current.timeScale().zoomOut()}
            className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            Zoom out
          </button>
        </div>
        <div className="flex flex-1 items-center gap-3">
          <span>History</span>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => chartRef.current && chartRef.current.timeScale().scrollToPosition(0)}
              className="rounded-full border border-slate-200 px-2 py-1 text-slate-600 hover:border-slate-300 hover:text-slate-900"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={() => chartRef.current && chartRef.current.timeScale().scrollToRealTime()}
              className="rounded-full border border-slate-200 px-2 py-1 text-slate-600 hover:border-slate-300 hover:text-slate-900"
            >
              ▶
            </button>
          </div>
        </div>
        <div className="text-[11px] text-slate-500">Shift-drag to snap to 0.5 increments.</div>
      </div>
    </section>
  );
}
