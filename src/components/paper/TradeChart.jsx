import { useEffect, useMemo, useRef, useState } from 'react';

import { computeRSI, computeSMA, formatNumber, roundTo } from './utils';

const MIN_VISIBLE_BARS = 32;

function ChartOverlayToggle({ label, active, onToggle, hotkey }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
        active
          ? 'border-blue-700 bg-blue-700 text-white shadow-sm'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
      }`}
    >
      <span>{label}</span>
      {hotkey ? <span className="ml-2 text-[10px] text-white/80">{hotkey}</span> : null}
    </button>
  );
}

function MarkerHandle({ label, description, y, color, onPointerDown }) {
  return (
    <div
      role="presentation"
      onPointerDown={onPointerDown}
      className="absolute right-0 flex translate-x-1/2 items-center gap-2"
      style={{ top: y }}
    >
      <div className="flex flex-col items-end gap-1">
        <div className="rounded bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow">{label}</div>
        {description ? <div className="text-[10px] font-medium text-slate-500">{description}</div> : null}
      </div>
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
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [crosshair, setCrosshair] = useState(null);
  const [dragging, setDragging] = useState(null);
  const chartPadding = useMemo(() => ({ left: 56, right: 56, top: 24, bottom: 120 }), []);
  const [viewport, setViewport] = useState(() => {
    const preset = timeframeOptions?.find((option) => option.id === timeframe);
    const baseLength = Math.max(
      MIN_VISIBLE_BARS,
      Math.min(data.length || MIN_VISIBLE_BARS, preset?.bars ?? MIN_VISIBLE_BARS)
    );
    const start = Math.max(0, (data.length || baseLength) - baseLength);
    return { start, length: baseLength };
  });
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

  useEffect(() => {
    if (!data.length) {
      setViewport({ start: 0, length: 0 });
      return;
    }

    setViewport((prev) => {
      const preset = timeframeOptions?.find((option) => option.id === timeframe);
      const desired = preset ? preset.bars : prev.length;
      const length = Math.max(MIN_VISIBLE_BARS, Math.min(data.length, desired));
      const maxStart = Math.max(0, data.length - length);
      const start = preset ? maxStart : Math.min(prev.start, maxStart);
      return { start, length };
    });
  }, [data.length, timeframe, timeframeOptions]);

  const visibleData = useMemo(() => {
    if (!data.length) return [];
    const maxStart = Math.max(0, data.length - viewport.length);
    const start = Math.max(0, Math.min(viewport.start, maxStart));
    const length = Math.min(viewport.length || data.length, data.length);
    return data.slice(start, start + length);
  }, [data, viewport]);

  const priceStats = useMemo(() => {
    if (!visibleData.length) {
      return { priceMin: 0, priceMax: 1, maxVolume: 1 };
    }
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let maxVolume = 0;
    visibleData.forEach((candle) => {
      if (candle.low < min) min = candle.low;
      if (candle.high > max) max = candle.high;
      if (candle.volume > maxVolume) maxVolume = candle.volume;
    });
    if (min === max) {
      min -= 1;
      max += 1;
    }
    return { priceMin: min, priceMax: max, maxVolume: maxVolume || 1 };
  }, [visibleData]);

  const sma = useMemo(() => computeSMA(data, 20), [data]);
  const rsi = useMemo(() => computeRSI(data, 14), [data]);

  const scales = useMemo(() => {
    if (!dimensions.width || !dimensions.height || !visibleData.length) {
      return null;
    }
    const chartWidth = dimensions.width - chartPadding.left - chartPadding.right;
    const chartHeight = dimensions.height - chartPadding.top - chartPadding.bottom;
    const volumeHeight = 120;
    const rsiHeight = 80;
    const priceHeight = chartHeight - volumeHeight - rsiHeight - 24;
    const visibleStartIndex = visibleData[0].index;
    const visibleEndIndex = visibleData[visibleData.length - 1].index;
    const indexRange = Math.max(1, visibleEndIndex - visibleStartIndex);
    const priceRange = Math.max(1e-6, priceStats.priceMax - priceStats.priceMin);
    const scaleXIndex = (index) =>
      chartPadding.left + ((index - visibleStartIndex) / indexRange) * chartWidth;
    const scaleYPrice = (price) =>
      chartPadding.top + ((priceStats.priceMax - price) / priceRange) * priceHeight;
    return {
      chartWidth,
      priceHeight,
      volumeHeight,
      rsiHeight,
      scaleXIndex,
      scaleYPrice,
      priceRange,
      visibleStartIndex,
      visibleEndIndex
    };
  }, [chartPadding, dimensions, priceStats.priceMax, priceStats.priceMin, visibleData]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !scales) return;
    const { width, height } = dimensions;
    if (!width || !height) return;

    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    if (!visibleData.length) {
      return;
    }

    const {
      chartWidth,
      priceHeight,
      volumeHeight,
      rsiHeight,
      scaleXIndex,
      scaleYPrice,
      visibleStartIndex,
      visibleEndIndex
    } = scales;
    const priceRange = Math.max(1e-6, priceStats.priceMax - priceStats.priceMin);

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

    const candleWidth = Math.max(2, chartWidth / Math.max(visibleData.length, 1) - 2);
    visibleData.forEach((candle) => {
      const x = scaleXIndex(candle.index);
      const yOpen = scaleYPrice(candle.open);
      const yClose = scaleYPrice(candle.close);
      const yHigh = scaleYPrice(candle.high);
      const yLow = scaleYPrice(candle.low);
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
      const filtered = sma.filter((point) => point.index >= visibleStartIndex && point.index <= visibleEndIndex);
      if (filtered.length) {
        ctx.strokeStyle = '#1D4ED8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        filtered.forEach((point, idx) => {
          const x = scaleXIndex(point.index);
          const y = scaleYPrice(point.value);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
    }

    if (overlays.vwap) {
      let cumulativePV = 0;
      let cumulativeVolume = 0;
      let began = false;
      ctx.strokeStyle = '#0F766E';
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.forEach((candle) => {
        cumulativePV += candle.close * candle.volume;
        cumulativeVolume += candle.volume;
        if (!cumulativeVolume) return;
        if (candle.index < visibleStartIndex || candle.index > visibleEndIndex) return;
        const vwap = cumulativePV / cumulativeVolume;
        const x = scaleXIndex(candle.index);
        const y = scaleYPrice(vwap);
        if (!began) {
          ctx.moveTo(x, y);
          began = true;
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }

    const volumeTop = chartPadding.top + priceHeight + 16;
    ctx.fillStyle = '#CBD5F5';
    visibleData.forEach((candle) => {
      const x = scaleXIndex(candle.index);
      const volumeRatio = candle.volume / priceStats.maxVolume;
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
      const filteredRsi = rsi.filter((point) => point.index >= visibleStartIndex && point.index <= visibleEndIndex);
      if (filteredRsi.length) {
        ctx.strokeStyle = '#F97316';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        filteredRsi.forEach((point, idx) => {
          const x = scaleXIndex(point.index);
          const y = rsiTop + (1 - point.value / 100) * (rsiHeight - 20) + 10;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
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
      const entryY = scaleYPrice(markers.entry);
      ctx.strokeStyle = activeSide === 'buy' ? '#2563EB' : '#DC2626';
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(chartPadding.left, entryY);
      ctx.lineTo(width - chartPadding.right, entryY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (markers.entry && markers.stop) {
      const entryY = scaleYPrice(markers.entry);
      const stopY = scaleYPrice(markers.stop);
      ctx.fillStyle = 'rgba(220, 38, 38, 0.08)';
      ctx.fillRect(chartPadding.left, Math.min(entryY, stopY), chartWidth, Math.abs(stopY - entryY));
    }

    if (markers.entry && markers.target) {
      const entryY = scaleYPrice(markers.entry);
      const targetY = scaleYPrice(markers.target);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.08)';
      ctx.fillRect(chartPadding.left, Math.min(entryY, targetY), chartWidth, Math.abs(targetY - entryY));
    }

    filledOrders
      .filter((order) => order.price != null && Number.isFinite(order.price))
      .forEach((order) => {
        const resolvedIndex =
          order.index != null && Number.isFinite(order.index) ? order.index : visibleEndIndex;
        if (resolvedIndex < visibleStartIndex || resolvedIndex > visibleEndIndex) {
          return;
        }
        const orderY = scaleYPrice(order.price);
        const orderX = scaleXIndex(resolvedIndex);
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
    chartPadding,
    data,
    dimensions,
    filledOrders,
    markers,
    overlays,
    priceStats,
    rsi,
    scales,
    sma,
    visibleData
  ]);
  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!dragging || !scales || !containerRef.current) return;
      const bounds = containerRef.current.getBoundingClientRect();
      const y = event.clientY - bounds.top;
      const maxY = chartPadding.top + scales.priceHeight;
      const clampedY = Math.max(chartPadding.top, Math.min(maxY, y));
      const priceRange = priceStats.priceMax - priceStats.priceMin;
      const rawPrice =
        priceStats.priceMax - ((clampedY - chartPadding.top) / scales.priceHeight) * priceRange;
      const snapped = event.shiftKey || dragging.shift ? Math.round(rawPrice * 2) / 2 : rawPrice;
      onMarkerChange(dragging.marker, roundTo(snapped, 2));
    };

    const handlePointerUp = () => setDragging(null);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [chartPadding.top, dragging, onMarkerChange, priceStats.priceMax, priceStats.priceMin, scales]);

  const handleMouseMove = (event) => {
    if (!containerRef.current || !scales || !visibleData.length) return;
    const bounds = containerRef.current.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    if (x < chartPadding.left || x > bounds.width - chartPadding.right) {
      setCrosshair(null);
      return;
    }
    const relative = Math.round(
      ((x - chartPadding.left) / scales.chartWidth) * Math.max(visibleData.length - 1, 0)
    );
    const index = Math.min(visibleData.length - 1, Math.max(0, relative));
    const candle = visibleData[index];
    if (!candle) return;
    const y = scales.scaleYPrice(candle.close);
    setCrosshair({ x: scales.scaleXIndex(candle.index), y, data: candle });
  };

  const handleMouseLeave = () => setCrosshair(null);

  const handleClick = () => {
    if (!crosshair) return;
    onChartClick(crosshair.data.close);
  };

  const handleDoubleClick = () => {
    if (crosshair && onChartDoubleClick) {
      onChartDoubleClick(crosshair.data.close);
    }
  };

  const handleMarkerPointerDown = (marker) => (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging({ marker, shift: event.shiftKey });
  };

  const handleViewportSlider = (event) => {
    const next = Number(event.target.value);
    if (Number.isNaN(next)) return;
    setViewport((prev) => ({ ...prev, start: next }));
  };

  const handleZoom = (direction) => {
    setViewport((prev) => {
      if (!data.length) return prev;
      const delta = Math.max(1, Math.round(prev.length * 0.2));
      const nextLength = Math.max(
        MIN_VISIBLE_BARS,
        Math.min(data.length, prev.length + direction * delta)
      );
      const maxStart = Math.max(0, data.length - nextLength);
      const nextStart = Math.min(maxStart, prev.start);
      return { start: nextStart, length: nextLength };
    });
  };

  const handleScrollViewport = (direction) => {
    setViewport((prev) => {
      if (!data.length) return prev;
      const step = Math.max(1, Math.round(prev.length * 0.25));
      const maxStart = Math.max(0, data.length - prev.length);
      const nextStart = Math.min(maxStart, Math.max(0, prev.start + direction * step));
      return { ...prev, start: nextStart };
    });
  };

  const handleWheel = (event) => {
    if (!data.length) return;
    if (!scales) return;
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      handleZoom(event.deltaY > 0 ? 1 : -1);
    } else {
      handleScrollViewport(event.deltaY > 0 ? 1 : -1);
    }
  };

  const handleResetOverlays = () => {
    onToggleOverlay('sma', true);
    onToggleOverlay('vwap', true);
    onToggleOverlay('rsi', true);
  };

  const riskDistance = useMemo(() => {
    if (!markers.entry || !markers.stop) return null;
    return Math.abs(markers.entry - markers.stop);
  }, [markers.entry, markers.stop]);

  const rewardDistance = useMemo(() => {
    if (!markers.entry || !markers.target) return null;
    return Math.abs(markers.target - markers.entry);
  }, [markers.entry, markers.target]);

  const rMultiple = useMemo(() => {
    if (!riskDistance || !rewardDistance) return null;
    if (riskDistance === 0) return null;
    return rewardDistance / riskDistance;
  }, [rewardDistance, riskDistance]);

  const maxViewportStart = Math.max(0, data.length - viewport.length);
  const sliderValue = Math.max(0, Math.min(viewport.start, maxViewportStart));
  const timeframeList = timeframeOptions ?? [];

  const riskDescription = riskDistance ? `Risk ${roundTo(riskDistance, 2)} pts` : undefined;
  const rewardDescription = rewardDistance
    ? `Reward ${roundTo(rewardDistance, 2)} pts${rMultiple ? ` · ${rMultiple.toFixed(2)}R` : ''}`
    : undefined;
  const markerY = (price) => {
    if (!scales || price == null) return null;
    return scales.scaleYPrice(price);
  };

  const entryY = markerY(markers.entry);
  const stopY = markerY(markers.stop);
  const targetY = markerY(markers.target);

  return (
    <section
      id="paper-chart"
      ref={reference}
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
          <p className="text-sm text-slate-500">
            Click to prefill the ticket. Drag ghost lines for stop and target.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
            {timeframeList.map((option) => {
              const isActive = option.id === timeframe;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onTimeframeChange(option.id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <ChartOverlayToggle label="MA20" hotkey="M" active={overlays.sma} onToggle={() => onToggleOverlay('sma')} />
          <ChartOverlayToggle label="VWAP" hotkey="V" active={overlays.vwap} onToggle={() => onToggleOverlay('vwap')} />
          <ChartOverlayToggle label="RSI" hotkey="R" active={overlays.rsi} onToggle={() => onToggleOverlay('rsi')} />
          <button
            type="button"
            onClick={handleResetOverlays}
            aria-label="Reset overlays"
            className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <polyline points="23 20 23 14 17 14" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L21 8" />
              <path d="M20.49 15a9 9 0 01-14.85 3.36L3 16" />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-2 text-xs text-slate-500">
        <span>{rMultiple ? `Risk/reward: ${rMultiple.toFixed(2)}R` : 'Add stop & target to see risk/reward.'}</span>
        <span>
          {visibleData.length
            ? `Showing ${visibleData.length} of ${data.length} bars`
            : 'No data loaded yet.'}
        </span>
      </div>
      <div
        ref={containerRef}
        className="relative flex-1"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
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
            description={null}
            y={entryY}
            color="#1D4ED8"
            onPointerDown={handleMarkerPointerDown('entry')}
          />
        ) : null}
        {stopY != null ? (
          <MarkerHandle
            label={`Stop ${markers.stop.toFixed(2)}`}
            description={riskDescription}
            y={stopY}
            color="#DC2626"
            onPointerDown={handleMarkerPointerDown('stop')}
          />
        ) : null}
        {targetY != null ? (
          <MarkerHandle
            label={`Target ${markers.target.toFixed(2)}`}
            description={rewardDescription}
            y={targetY}
            color="#16A34A"
            onPointerDown={handleMarkerPointerDown('target')}
          />
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleZoom(-1)}
            className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            Zoom in
          </button>
          <button
            type="button"
            onClick={() => handleZoom(1)}
            className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            Zoom out
          </button>
        </div>
        <div className="flex flex-1 items-center gap-3">
          <span>History</span>
          <input
            type="range"
            min={0}
            max={maxViewportStart}
            value={sliderValue}
            onChange={handleViewportSlider}
            className="flex-1"
            aria-label="Scroll price history"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleScrollViewport(-1)}
              className="rounded-full border border-slate-200 px-2 py-1 text-slate-600 hover:border-slate-300 hover:text-slate-900"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={() => handleScrollViewport(1)}
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
