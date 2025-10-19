import { useEffect, useMemo, useRef, useState } from 'react';

import { computeRSI, computeSMA, formatNumber, roundTo } from './utils';

function ChartOverlayToggle({ label, active, onToggle, hotkey }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? 'border-blue-700 bg-blue-700 text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
      }`}
    >
      <span>{label}</span>
      {hotkey ? <span className="ml-2 text-[10px] text-white/80">{hotkey}</span> : null}
    </button>
  );
}

function MarkerHandle({ label, y, color, onPointerDown }) {
  return (
    <div
      role="presentation"
      onPointerDown={onPointerDown}
      className="absolute right-0 flex translate-x-1/2 items-center gap-2"
      style={{ top: y }}
    >
      <div className="rounded bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow">{label}</div>
      <div className="h-4 w-4 cursor-grab rounded-full" style={{ backgroundColor: color }} />
    </div>
  );
}

export default function TradeChart({
  data,
  symbol,
  overlays,
  onToggleOverlay,
  onChartClick,
  onMarkerChange,
  markers,
  filledOrders,
  activeSide,
  reference
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [crosshair, setCrosshair] = useState(null);
  const [dragging, setDragging] = useState(null);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const chartPadding = { left: 56, right: 56, top: 24, bottom: 120 };

  const { priceMin, priceMax, maxVolume } = useMemo(() => {
    if (!data?.length) return { priceMin: 0, priceMax: 1, maxVolume: 1 };
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let maxVol = 0;
    data.forEach((candle) => {
      if (candle.low < min) min = candle.low;
      if (candle.high > max) max = candle.high;
      if (candle.volume > maxVol) maxVol = candle.volume;
    });
    return { priceMin: min, priceMax: max, maxVolume: maxVol };
  }, [data]);

  const sma = useMemo(() => computeSMA(data, 20), [data]);
  const rsi = useMemo(() => computeRSI(data, 14), [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = dimensions;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    const chartWidth = width - chartPadding.left - chartPadding.right;
    const chartHeight = height - chartPadding.top - chartPadding.bottom;
    const volumeHeight = 120;
    const rsiHeight = 80;
    const priceHeight = chartHeight - volumeHeight - rsiHeight - 24;

    const scaleX = (index) => chartPadding.left + (index / (data.length - 1)) * chartWidth;
    const scaleY = (price) =>
      chartPadding.top + ((priceMax - price) / (priceMax - priceMin)) * priceHeight;

    ctx.fillStyle = '#F6F8F6';
    ctx.fillRect(chartPadding.left, chartPadding.top, chartWidth, priceHeight);

    ctx.strokeStyle = 'rgba(71, 85, 105, 0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i += 1) {
      const y = chartPadding.top + (priceHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(chartPadding.left, y);
      ctx.lineTo(width - chartPadding.right, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const candleWidth = Math.max(2, chartWidth / data.length - 2);
    data.forEach((candle) => {
      const x = scaleX(candle.index);
      const yOpen = scaleY(candle.open);
      const yClose = scaleY(candle.close);
      const yHigh = scaleY(candle.high);
      const yLow = scaleY(candle.low);
      const rising = candle.close >= candle.open;
      ctx.strokeStyle = rising ? '#0F9D58' : '#DC2626';
      ctx.fillStyle = rising ? '#0F9D58' : '#DC2626';

      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      const bodyTop = Math.min(yOpen, yClose);
      const bodyHeight = Math.max(Math.abs(yClose - yOpen), 2);
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    });

    if (overlays.sma) {
      ctx.strokeStyle = '#1D4ED8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      sma.forEach((point, idx) => {
        const x = scaleX(point.index);
        const y = scaleY(point.value);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    if (overlays.vwap) {
      let cumulativePV = 0;
      let cumulativeVolume = 0;
      ctx.strokeStyle = '#0F766E';
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.forEach((candle, idx) => {
        cumulativePV += candle.close * candle.volume;
        cumulativeVolume += candle.volume;
        const vwap = cumulativePV / cumulativeVolume;
        const x = scaleX(candle.index);
        const y = scaleY(vwap);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    const volumeTop = chartPadding.top + priceHeight + 16;
    ctx.fillStyle = '#CBD5F5';
    data.forEach((candle) => {
      const x = scaleX(candle.index);
      const volumeRatio = candle.volume / maxVolume;
      const barHeight = volumeRatio * (volumeHeight - 20);
      ctx.fillRect(x - candleWidth / 2, volumeTop + volumeHeight - barHeight, candleWidth, barHeight);
    });

    ctx.fillStyle = '#0F172A';
    ctx.font = '12px "Inter", system-ui';
    ctx.fillText('Volume', chartPadding.left, volumeTop + 16);

    const rsiTop = volumeTop + volumeHeight + 16;
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.2)';
    ctx.strokeRect(chartPadding.left, rsiTop, chartWidth, rsiHeight);
    ctx.fillStyle = '#0F172A';
    ctx.fillText('RSI 14', chartPadding.left, rsiTop + 16);

    if (overlays.rsi) {
      ctx.strokeStyle = '#F97316';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      rsi.forEach((point, idx) => {
        const x = scaleX(point.index);
        const y = rsiTop + (1 - point.value / 100) * (rsiHeight - 20) + 10;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(15,23,42,0.2)';
    ctx.beginPath();
    ctx.moveTo(chartPadding.left, rsiTop + (1 - 70 / 100) * (rsiHeight - 20) + 10);
    ctx.lineTo(width - chartPadding.right, rsiTop + (1 - 70 / 100) * (rsiHeight - 20) + 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(chartPadding.left, rsiTop + (1 - 30 / 100) * (rsiHeight - 20) + 10);
    ctx.lineTo(width - chartPadding.right, rsiTop + (1 - 30 / 100) * (rsiHeight - 20) + 10);
    ctx.stroke();

    if (markers.entry) {
      const entryY = scaleY(markers.entry);
      ctx.strokeStyle = activeSide === 'buy' ? '#2563EB' : '#DC2626';
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(chartPadding.left, entryY);
      ctx.lineTo(width - chartPadding.right, entryY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (markers.entry && markers.stop) {
      const entryY = scaleY(markers.entry);
      const stopY = scaleY(markers.stop);
      ctx.fillStyle = 'rgba(220, 38, 38, 0.08)';
      ctx.fillRect(chartPadding.left, Math.min(entryY, stopY), chartWidth, Math.abs(stopY - entryY));
    }

    if (markers.entry && markers.target) {
      const entryY = scaleY(markers.entry);
      const targetY = scaleY(markers.target);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.08)';
      ctx.fillRect(chartPadding.left, Math.min(entryY, targetY), chartWidth, Math.abs(targetY - entryY));
    }

    filledOrders.forEach((order) => {
      const orderY = scaleY(order.price);
      const orderX = scaleX(order.index ?? data.length - 1);
      ctx.fillStyle = order.side === 'buy' ? '#2563EB' : '#DC2626';
      ctx.beginPath();
      ctx.arc(orderX, orderY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px "Inter", system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(order.side === 'buy' ? 'B' : 'S', orderX, orderY + 3);
      ctx.textAlign = 'left';
    });
  }, [
    activeSide,
    chartPadding.bottom,
    chartPadding.left,
    chartPadding.right,
    chartPadding.top,
    data,
    dimensions,
    filledOrders,
    markers.entry,
    markers.stop,
    markers.target,
    overlays.rsi,
    overlays.sma,
    overlays.vwap,
    priceMax,
    priceMin,
    rsi,
    sma,
    maxVolume
  ]);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!dragging || !containerRef.current) return;
      const bounds = containerRef.current.getBoundingClientRect();
      const y = event.clientY - bounds.top;
      const clampedY = Math.max(chartPadding.top, Math.min(bounds.height - chartPadding.bottom, y));
      const priceRange = priceMax - priceMin;
      const usableHeight = bounds.height - chartPadding.top - chartPadding.bottom - 120 - 80 - 24;
      const price = priceMax - ((clampedY - chartPadding.top) / usableHeight) * priceRange;
      onMarkerChange(dragging, roundTo(price, 2));
    };

    const handlePointerUp = () => setDragging(null);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragging, onMarkerChange, priceMax, priceMin, chartPadding.bottom, chartPadding.top]);

  const handleMouseMove = (event) => {
    if (!containerRef.current) return;
    const bounds = containerRef.current.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    if (x < chartPadding.left || x > bounds.width - chartPadding.right) {
      setCrosshair(null);
      return;
    }
    const chartWidth = bounds.width - chartPadding.left - chartPadding.right;
    const index = Math.min(
      data.length - 1,
      Math.max(0, Math.round(((x - chartPadding.left) / chartWidth) * (data.length - 1)))
    );
    const candle = data[index];
    if (!candle) return;
    const usableHeight = bounds.height - chartPadding.top - chartPadding.bottom - 120 - 80 - 24;
    const priceRange = priceMax - priceMin;
    const y =
      chartPadding.top + ((priceMax - candle.close) / priceRange) * usableHeight;
    setCrosshair({
      x,
      y,
      data: candle
    });
  };

  const handleMouseLeave = () => setCrosshair(null);

  const handleClick = () => {
    if (!crosshair) return;
    onChartClick(crosshair.data.close);
  };

  const markerY = (price) => {
    if (!price || !containerRef.current) return null;
    const bounds = containerRef.current.getBoundingClientRect();
    const usableHeight = bounds.height - chartPadding.top - chartPadding.bottom - 120 - 80 - 24;
    const priceRange = priceMax - priceMin;
    return chartPadding.top + ((priceMax - price) / priceRange) * usableHeight;
  };

  const entryY = markerY(markers.entry);
  const stopY = markerY(markers.stop);
  const targetY = markerY(markers.target);

  return (
    <section
      id="paper-chart"
      ref={reference}
      className="relative flex h-[680px] flex-col rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{symbol}</h2>
          <p className="text-sm text-slate-500">Click to prefill the ticket. Drag ghost lines for stop and target.</p>
        </div>
        <div className="flex items-center gap-2">
          <ChartOverlayToggle
            label="MA20"
            hotkey="M"
            active={overlays.sma}
            onToggle={() => onToggleOverlay('sma')}
          />
          <ChartOverlayToggle label="VWAP" hotkey="V" active={overlays.vwap} onToggle={() => onToggleOverlay('vwap')} />
          <ChartOverlayToggle label="RSI" hotkey="R" active={overlays.rsi} onToggle={() => onToggleOverlay('rsi')} />
          <button
            type="button"
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
            onClick={() => {
              if (!overlays.sma || !overlays.vwap || !overlays.rsi) {
                onToggleOverlay('sma', true);
                onToggleOverlay('vwap', true);
                onToggleOverlay('rsi', true);
              }
            }}
          >
            Reset overlays
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="relative flex-1"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <canvas ref={canvasRef} className="h-full w-full" />
        {crosshair ? (
          <>
            <div
              className="pointer-events-none absolute top-0 w-px bg-slate-400/60"
              style={{ left: crosshair.x }}
            />
            <div
              className="pointer-events-none absolute left-0 h-px bg-slate-400/60"
              style={{ top: crosshair.y }}
            />
            <div
              className="pointer-events-none absolute rounded-2xl border border-slate-900/10 bg-slate-900 px-3 py-2 text-xs text-white shadow"
              style={{ left: crosshair.x + 12, top: crosshair.y - 40 }}
            >
              <p className="font-semibold">{symbol}</p>
              <p>{`O ${crosshair.data.open.toFixed(2)} H ${crosshair.data.high.toFixed(2)} L ${crosshair.data.low.toFixed(2)} C ${crosshair.data.close.toFixed(2)}`}</p>
              <p className="mt-1 text-[11px] text-white/70">Vol {formatNumber(crosshair.data.volume / 1000, 1)}k</p>
            </div>
          </>
        ) : null}
        {entryY != null ? (
          <MarkerHandle
            label={`Entry ${markers.entry.toFixed(2)}`}
            y={entryY}
            color="#1D4ED8"
            onPointerDown={() => setDragging('entry')}
          />
        ) : null}
        {stopY != null ? (
          <MarkerHandle
            label={`Stop ${markers.stop.toFixed(2)}`}
            y={stopY}
            color="#DC2626"
            onPointerDown={() => setDragging('stop')}
          />
        ) : null}
        {targetY != null ? (
          <MarkerHandle
            label={`Target ${markers.target.toFixed(2)}`}
            y={targetY}
            color="#16A34A"
            onPointerDown={() => setDragging('target')}
          />
        ) : null}
      </div>
    </section>
  );
}
