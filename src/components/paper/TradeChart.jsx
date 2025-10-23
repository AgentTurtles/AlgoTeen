 'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
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
    if (!containerRef.current) return;

    let mounted = true;
    let retryTimeout = null;

  const buildChart = async () => {
      try {

        // if this container was already initialized (dataset flag), skip creating another chart
        try {
          if (containerRef.current && containerRef.current.dataset && containerRef.current.dataset._chartInit === '1') {
            // eslint-disable-next-line no-console
            console.debug('TradeChart: container already initialized via dataset flag; skipping create.');
            return () => {};
          }
        } catch (e) {}

        // defensive: remove any existing children (avoid duplicate canvases) before creating
        try {
          if (containerRef.current && containerRef.current.firstChild) {
            while (containerRef.current.firstChild) {
              containerRef.current.removeChild(containerRef.current.firstChild);
            }
          }
        } catch (e) {
          // ignore DOM cleanup errors
        }

  // wait for next animation frame so container is definitely in the DOM/layout
  await new Promise((resolve) => requestAnimationFrame(resolve));

  // runtime import to avoid bundler interop issues
  // import the package entry and detect API shape at runtime
  const module = await import('lightweight-charts').catch(() => null);
        // resolve createChart function across different module shapes
        const createChartFn = module.createChart ?? (module.default && (module.default.createChart ?? (typeof module.default === 'function' ? module.default : undefined)));
        const crosshairEnum = module.CrosshairMode ?? (module.default && module.default.CrosshairMode) ?? CrosshairMode;
        // debug info to help diagnose wrong returns from createChart
        try {
          // eslint-disable-next-line no-console
          console.debug('TradeChart: resolved createChart type', typeof createChartFn);
          // eslint-disable-next-line no-console
          console.debug('TradeChart: container element', containerRef.current && containerRef.current.nodeName);
        } catch (e) {}

        if (typeof createChartFn !== 'function') {
          console.error('TradeChart: unable to resolve createChart function from lightweight-charts module', module);
          return null;
        }

        let chart = createChartFn(containerRef.current, {
          layout: { backgroundColor: '#ffffff', textColor: '#0f172a' },
          rightPriceScale: { visible: true },
          timeScale: { timeVisible: true, rightOffset: 12 },
          crosshair: { mode: crosshairEnum ? crosshairEnum.Normal : CrosshairMode.Normal }
        });

        // Debug the returned chart object shape
        try {
          // eslint-disable-next-line no-console
          console.debug('TradeChart: created chart', chart);
          // eslint-disable-next-line no-console
          console.debug('TradeChart: chart keys', chart && Object.keys(chart));
          // eslint-disable-next-line no-console
          console.debug('TradeChart: chart proto keys', chart && Object.getOwnPropertyNames(Object.getPrototypeOf(chart || {})));
        } catch (e) {}

        // Validate that the chart API looks correct before using it
        const findApiOnPrototypeChain = (obj) => {
          try {
            if (!obj) return null;
            if (typeof obj.addCandlestickSeries === 'function') return obj;
            let proto = Object.getPrototypeOf(obj);
            const visited = new Set();
            while (proto && proto !== Object.prototype && !visited.has(proto)) {
              visited.add(proto);
              try {
                if (typeof proto.addCandlestickSeries === 'function') return obj;
                const names = Object.getOwnPropertyNames(proto || {});
                if (names.includes('addCandlestickSeries')) return obj;
              } catch (e) {}
              proto = Object.getPrototypeOf(proto);
            }
          } catch (e) {}
          return null;
        };

        if (!findApiOnPrototypeChain(chart)) {
          try {
            // eslint-disable-next-line no-console
            console.error('TradeChart: createChart did not return a valid chart API. Received:', chart);
            // eslint-disable-next-line no-console
            console.error('TradeChart: container child count', containerRef.current ? containerRef.current.childNodes.length : 0);
            // eslint-disable-next-line no-console
            console.error('TradeChart: container html snippet', containerRef.current ? containerRef.current.innerHTML.slice(0, 300) : '');

            // Try to locate a chart API attached to the DOM tree (some runtimes attach the API as a property)
            const findChartApiOnNode = (node, depth = 0, maxDepth = 3, visited = new Set()) => {
              if (!node || depth > maxDepth) return null;
              if (visited.has(node)) return null;
              visited.add(node);
              try {
                // check a few likely property names first
                const candidateNames = ['_chart', '__chart', 'chart', '_lightweightChart', '_tv_chart', 'tvChart'];
                for (const name of candidateNames) {
                  try {
                    const v = node[name];
                    if (v && typeof v.addCandlestickSeries === 'function') return v;
                  } catch (e) {}
                }

                // inspect own property values (safe-guarded)
                const props = Object.getOwnPropertyNames(node || {});
                for (const p of props) {
                  try {
                    const val = node[p];
                    if (val && typeof val.addCandlestickSeries === 'function') return val;
                  } catch (e) {}
                }
              } catch (e) {}

              // traverse children
              try {
                if (node.childNodes && node.childNodes.length) {
                  for (let i = 0; i < node.childNodes.length; i += 1) {
                    try {
                      const found = findChartApiOnNode(node.childNodes[i], depth + 1, maxDepth, visited);
                      if (found) return found;
                    } catch (e) {}
                  }
                }
              } catch (e) {}
              return null;
            };

            let discovered = null;
            try {
              discovered = findChartApiOnNode(containerRef.current, 0, 4);
            } catch (e) { discovered = null; }

            if (discovered) {
              // eslint-disable-next-line no-console
              console.debug('TradeChart: discovered chart API on DOM via search', discovered);
              chart = discovered;
            } else {
              try {
                setDebugInfo({
                  error: 'createChartInvalid',
                  received: chart && typeof chart === 'object' ? Object.keys(chart) : String(chart),
                  containerChildren: containerRef.current ? containerRef.current.childNodes.length : 0,
                  containerHtmlSnippet: containerRef.current ? containerRef.current.innerHTML.slice(0, 300) : ''
                });
              } catch (e) {}
              try { setUseFallback(true); } catch (e) {}
              return null;
            }
          } catch (e) {
            // if anything goes wrong during discovery, fall back
            try { setUseFallback(true); } catch (err) {}
            return null;
          }
  }

    // mark container as initialized so subsequent mounts don't recreate
    try { if (containerRef.current && containerRef.current.dataset) containerRef.current.dataset._chartInit = '1'; } catch (e) {}

  // assign the chart API to the ref
        chartRef.current = chart;

        // Create series defensively — some runtimes may throw during series creation
        try {
          candleSeriesRef.current = chart.addCandlestickSeries({
          upColor: '#0F9D58',
          borderUpColor: '#0F9D58',
          wickUpColor: '#0F9D58',
          downColor: '#DC2626',
          borderDownColor: '#DC2626',
          wickDownColor: '#DC2626'
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('TradeChart: failed to create candlestick series', e);
          try { setUseFallback(true); } catch (err) {}
          return null;
        }

        try {
          volumeSeriesRef.current = chart.addHistogramSeries({
          scaleMargins: { top: 0.8, bottom: 0 },
          priceFormat: { type: 'volume' },
          color: '#8b98c9',
          priceLineVisible: false
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('TradeChart: failed to create volume series', e);
        }

        try {
          smaSeriesRef.current = chart.addLineSeries({
          color: '#1D4ED8',
          lineWidth: 2
          });
        } catch (e) {
          // ignore
        }
        try {
          vwapSeriesRef.current = chart.addLineSeries({
          color: '#0F766E',
          lineWidth: 2
          });
        } catch (e) {
          // ignore
        }

        const handleResize = () => chartRef.current && chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
        window.addEventListener('resize', handleResize);
        handleResize();

        try {
          setDebugInfo({ initialized: true });
        } catch (e) {}

        return () => {
          window.removeEventListener('resize', handleResize);
          if (chartRef.current) {
            try { chartRef.current.remove(); } catch (e) {}
            chartRef.current = null;
          }
          try { if (containerRef.current && containerRef.current.dataset) delete containerRef.current.dataset._chartInit; } catch (e) {}
        };
      } catch (err) {
        console.error('TradeChart: error creating chart', err);
        return null;
      }
    };

    let cleanupFn = null;

    (async () => {
      // First attempt
      cleanupFn = await buildChart();

      // If the first attempt didn't produce a valid chart, retry once on next tick
      if (!cleanupFn) {
        retryTimeout = window.setTimeout(async () => {
          if (!mounted) return;
          cleanupFn = await buildChart();
          if (!cleanupFn) {
            console.error('TradeChart: failed to initialize chart after retry. Chart features will be disabled.');
          }
        }, 0);
      }
    })();

    return () => {
      mounted = false;
      if (retryTimeout) {
        window.clearTimeout(retryTimeout);
      }
      if (typeof cleanupFn === 'function') cleanupFn();
    };
  }, []);

  // small on-page debug area when developer appends ?chartdebug=1 to URL
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      if (!params.has('chartdebug')) return;
      const info = {
        typeofCreateChart: typeof createChart,
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
    volumeSeriesRef.current.setData(volumes);

    // price lines are managed in a separate effect (markers/activeSide)

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
  }, [onChartClick]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (ev) => {
      const last = data[data.length - 1];
      if (last) onChartDoubleClick && onChartDoubleClick(last.close);
    };
    el.addEventListener('dblclick', handler);
    return () => el.removeEventListener('dblclick', handler);
  }, [data, onChartDoubleClick]);


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
