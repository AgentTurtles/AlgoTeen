'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DEFAULT_STRATEGY_CODE, STRATEGY_TEMPLATES, STARTING_CAPITAL, runBacktest } from '../../lib/backtester';
import loadMonaco from '../../lib/monacoLoader';

const templateList = Object.values(STRATEGY_TEMPLATES);

const EXPERIENCE_OPTIONS = [
  {
    id: 'editor',
    title: 'Code editor',
    description: 'Launch Monaco with live brokerage data beside your script.'
  },
  {
    id: 'strategy',
    title: 'Strategy tester',
    description: 'Adjust parameters, run quick backtests, and read the metrics.'
  },
  {
    id: 'paper',
    title: 'Paper trading',
    description: 'Route simulated orders, monitor PnL, and cancel targets in real time.'
  }
];

const ASSET_UNIVERSES = {
  stocks: {
    label: 'Stocks & ETFs',
    defaultSymbol: 'SPY',
    defaultTimeframe: '1Day',
    symbols: [
      { symbol: 'SPY', label: 'SPDR S&P 500 (SPY)' },
      { symbol: 'QQQ', label: 'NASDAQ 100 (QQQ)' },
      { symbol: 'TSLA', label: 'Tesla (TSLA)' }
    ],
    timeframes: ['1Day', '4Hour', '1Hour']
  },
  forex: {
    label: 'Forex Pairs',
    defaultSymbol: 'EUR/USD',
    defaultTimeframe: '1Hour',
    symbols: [
      { symbol: 'EUR/USD', label: 'Euro / US Dollar' },
      { symbol: 'GBP/USD', label: 'British Pound / US Dollar' },
      { symbol: 'USD/JPY', label: 'US Dollar / Japanese Yen' }
    ],
    timeframes: ['4Hour', '1Hour', '15Min']
  },
  crypto: {
    label: 'Crypto Pairs',
    defaultSymbol: 'BTC/USD',
    defaultTimeframe: '1Hour',
    symbols: [
      { symbol: 'BTC/USD', label: 'Bitcoin / US Dollar' },
      { symbol: 'ETH/USD', label: 'Ethereum / US Dollar' },
      { symbol: 'SOL/USD', label: 'Solana / US Dollar' }
    ],
    timeframes: ['4Hour', '1Hour', '15Min']
  }
};

function ExperienceModal({ open, onSelect }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#03140b]/70 backdrop-blur" role="dialog" aria-modal="true">
      <div className="mx-4 w-full max-w-3xl rounded-3xl border border-emerald-500/30 bg-white p-8 shadow-[0_40px_120px_rgba(4,20,12,0.6)] sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-900/60">Tailor your session</p>
        <h2 className="mt-4 font-ruigslay text-4xl text-[#0f3224] sm:text-5xl">Where should we start?</h2>
        <p className="mt-3 font-bricolage text-sm leading-relaxed text-[#0f3224]/70">
          Pick a focus for this visit. We will drop you into the right section—switch anytime using the navigation.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {EXPERIENCE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className="group flex h-full flex-col rounded-2xl border border-emerald-500/30 bg-emerald-50/60 p-5 text-left transition hover:border-emerald-500/70 hover:bg-emerald-50 shadow-[0_22px_44px_rgba(12,38,26,0.12)]"
            >
              <span className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-900/60">{option.title}</span>
              <span className="mt-3 font-ruigslay text-2xl text-[#0f3224] group-hover:text-emerald-700">{option.title}</span>
              <span className="mt-2 font-bricolage text-sm leading-relaxed text-[#0f3224]/70">{option.description}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onSelect('editor')}
          className="mt-6 inline-flex items-center justify-center rounded-full border border-emerald-500/30 px-6 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-emerald-700 transition hover:border-emerald-500/70 hover:bg-emerald-50"
        >
          Explore everything
        </button>
      </div>
    </div>
  );
}

function MarketDataPanel({
  universes,
  assetClass,
  onAssetChange,
  symbol,
  onSymbolChange,
  timeframe,
  onTimeframeChange,
  status,
  metadata,
  barsCount,
  lastSyncedAt,
  error,
  onRetry,
  className = ''
}) {
  const syncing = status === 'loading';
  const hasError = status === 'error';
  const universe = universes[assetClass];
  const symbolOptions = universe?.symbols ?? [];
  const timeframeOptions = universe?.timeframes ?? ['1Day'];

  const lastSyncedLabel = lastSyncedAt
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }).format(lastSyncedAt)
    : '—';

  let statusCopy = 'Ready for backtests.';

  if (syncing) {
    statusCopy = 'Loading real brokerage candles…';
  } else if (hasError) {
    statusCopy = 'Unable to load brokerage data. Fix the issue and try again.';
  }

  return (
    <div
      className={`space-y-6 rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-white via-emerald-50/60 to-white p-5 shadow-[0_24px_54px_rgba(12,38,26,0.1)] sm:p-6 ${className}`}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-900/70">Brokerage data feed</p>
          <h3 className="font-ruigslay text-3xl leading-tight text-[#0f3224]">
            {metadata.symbol} · {metadata.timeframe}
          </h3>
          <p className="font-bricolage text-sm leading-relaxed text-[#0f3224]/75">{statusCopy}</p>
        </div>

        <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end sm:justify-end">
          <label className="flex flex-col text-sm font-bricolage text-[#0f3224]">
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Market</span>
            <select
              value={assetClass}
              onChange={(event) => onAssetChange(event.target.value)}
              className="mt-2 w-full rounded-xl border border-emerald-500/30 bg-white px-3 py-2 text-sm text-[#0f3224] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 sm:w-48"
            >
              {Object.entries(universes).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col text-sm font-bricolage text-[#0f3224]">
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Symbol</span>
            <select
              value={symbol}
              onChange={(event) => onSymbolChange(event.target.value)}
              className="mt-2 w-full rounded-xl border border-emerald-500/30 bg-white px-3 py-2 text-sm text-[#0f3224] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 sm:w-48"
            >
              {symbolOptions.map((option) => (
                <option key={option.symbol} value={option.symbol}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col text-sm font-bricolage text-[#0f3224]">
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Timeframe</span>
            <select
              value={timeframe}
              onChange={(event) => onTimeframeChange(event.target.value)}
              className="mt-2 w-full rounded-xl border border-emerald-500/30 bg-white px-3 py-2 text-sm text-[#0f3224] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 sm:w-40"
            >
              {timeframeOptions.map((frame) => (
                <option key={frame} value={frame}>
                  {frame}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={onRetry}
            disabled={syncing}
            className={`w-full rounded-xl border px-4 py-2 text-sm font-bricolage transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 sm:w-auto ${
              syncing
                ? 'cursor-not-allowed border-emerald-500/20 bg-emerald-50/60 text-emerald-900/40'
                : 'border-emerald-500/40 bg-white text-emerald-900 hover:border-emerald-500/70 hover:bg-emerald-50/80'
            }`}
          >
            {syncing ? 'Refreshing…' : 'Refresh data'}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl bg-emerald-900/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Bars loaded</p>
          <p className="mt-2 text-xl font-semibold text-[#0f3224]">{barsCount ?? '—'}</p>
        </div>
        <div className="rounded-2xl bg-emerald-900/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Source</p>
          <p className="mt-2 text-xl font-semibold text-[#0f3224]">{metadata.source}</p>
        </div>
        <div className="rounded-2xl bg-emerald-900/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Last synced</p>
          <p className="mt-2 text-xl font-semibold text-[#0f3224]">{lastSyncedLabel}</p>
        </div>
      </div>

      {hasError ? (
        <p className="rounded-2xl border border-rose-500/30 bg-rose-50/80 p-4 text-sm font-bricolage text-rose-700">{error}</p>
      ) : null}
    </div>
  );
}

function StrategyLibrary({ onSelect, activeId }) {
  return (
    <div className="rounded-3xl border border-emerald-500/20 bg-white/90 p-5 shadow-[0_18px_38px_rgba(12,38,26,0.12)] backdrop-blur sm:p-6">
      <h3 className="font-ruigslay text-3xl leading-tight text-[#0f3224]">Starter strategies</h3>
      <p className="mt-2 font-bricolage text-sm leading-relaxed text-[#0f3224]/75">
        Load a template, tweak the numbers, and re-run. Each script is ready for beginners—comments highlight where to adjust risk and exits.
      </p>

      <ul className="mt-5 space-y-3">
        {templateList.map((template) => (
          <li key={template.id}>
            <button
              type="button"
              onClick={() => onSelect(template)}
              className={`flex w-full flex-col rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 ${
                activeId === template.id
                  ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900'
                  : 'border-emerald-500/20 bg-white/90 text-[#0f3224] hover:border-emerald-500/50 hover:bg-emerald-50/70'
              }`}
            >
              <span className="font-bricolage text-base font-semibold">{template.name}</span>
              <span className="mt-1 text-sm font-bricolage text-[#0f3224]/70">{template.description}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MetricsPanel({ metrics, status }) {
  const items = [
    {
      label: 'Ending Equity',
      value: metrics ? `$${metrics.endingCapital.toFixed(2)}` : '—',
      emphasis: true
    },
    { label: 'Total Return', value: metrics ? `${metrics.totalReturn.toFixed(2)}%` : '—' },
    { label: 'Trades', value: metrics ? metrics.totalTrades : '—' },
    { label: 'Win Rate', value: metrics ? `${metrics.winRate.toFixed(2)}%` : '—' },
    { label: 'Avg Trade', value: metrics ? `${metrics.averageReturn.toFixed(2)}%` : '—' },
    { label: 'Max Drawdown', value: metrics ? `${metrics.maxDrawdown.toFixed(2)}%` : '—' }
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={`${
            item.emphasis
              ? 'bg-gradient-to-br from-emerald-600 to-emerald-500 text-white'
              : 'border border-emerald-500/20 bg-gradient-to-br from-white/80 via-white to-emerald-50/40'
          } rounded-3xl px-6 py-5 text-sm font-bricolage shadow-[0_22px_44px_rgba(12,38,26,0.08)]`}
        >
          <span
            className={`text-xs font-semibold uppercase tracking-[0.28em] ${
              item.emphasis ? 'text-white/75' : 'text-emerald-900/60'
            }`}
          >
            {item.label}
          </span>
          <span className={`mt-3 block text-2xl font-semibold tracking-tight ${item.emphasis ? 'text-white' : 'text-[#0f3224]'}`}>
            {status === 'running' ? 'Calculating…' : item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function TradesTable({ trades }) {
  if (!trades || trades.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-emerald-500/30 bg-white/70 p-6 text-center text-sm font-bricolage text-[#0f3224]/70">
        Run a backtest to populate trade history.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-emerald-500/20 bg-white/95 shadow-[0_24px_52px_rgba(12,38,26,0.1)]">
      <div className="max-h-[420px] w-full overflow-x-auto">
        <table className="min-w-full divide-y divide-emerald-500/10">
          <thead className="bg-emerald-500/10">
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.24em] text-emerald-900/75">
              <th className="px-4 py-3">Entry</th>
              <th className="px-4 py-3">Exit</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">P/L</th>
              <th className="px-4 py-3">Return</th>
              <th className="px-4 py-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-500/10 text-sm font-bricolage text-[#0f3224]">
            {trades.map((trade, index) => (
              <tr key={`${trade.entryDate}-${index}`} className="bg-white/90">
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-semibold">{trade.entryDate}</span>
                    <span className="text-xs text-[#0f3224]/70">${trade.entryPrice.toFixed(2)}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-semibold">{trade.exitDate}</span>
                    <span className="text-xs text-[#0f3224]/70">${trade.exitPrice.toFixed(2)}</span>
                  </div>
                </td>
                <td className="px-4 py-3">{trade.size}</td>
                <td className={`px-4 py-3 font-semibold ${trade.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ${trade.profit.toFixed(2)}
                </td>
                <td className={`px-4 py-3 font-semibold ${trade.returnPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {trade.returnPct.toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-[#0f3224]/70">
                  <div className="flex flex-col gap-1">
                    <span>{trade.entryNote}</span>
                    <span>{trade.exitNote}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EquitySparkline({ equityCurve }) {
  const points = equityCurve?.slice(-120) ?? [];
  if (points.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-3xl border border-dashed border-emerald-500/30 bg-white/70 text-sm font-bricolage text-[#0f3224]/70">
        Run a backtest to generate an equity curve.
      </div>
    );
  }

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const normalized = values.map((value) => ((value - min) / (max - min || 1)) * 100);

  return (
    <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-white via-emerald-50/50 to-emerald-100/40 p-4 shadow-[0_18px_36px_rgba(12,38,26,0.08)] sm:p-5">
      <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Equity Curve</span>
      <div className="mt-3 h-32 w-full rounded-2xl bg-[#0b2217] p-4 sm:h-36">
        <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id="equityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke="url(#equityGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            points={normalized.map((value, index) => `${(index / (normalized.length - 1 || 1)) * 200},${100 - value}`).join(' ')}
          />
        </svg>
      </div>
      <div className="mt-3 flex justify-between text-xs font-bricolage text-[#0f3224]/70">
        <span>${points[0].value.toFixed(2)}</span>
        <span>${points[points.length - 1].value.toFixed(2)}</span>
      </div>
    </div>
  );
}

function PriceChart({ dataset }) {
  const points = dataset?.slice(-180) ?? [];
  const hasData = points.length > 0;

  const closes = hasData ? points.map((bar) => bar.close) : [];
  const min = hasData ? Math.min(...closes) : null;
  const max = hasData ? Math.max(...closes) : null;
  const normalized = hasData ? closes.map((value) => ((value - min) / (max - min || 1)) * 100) : [];

  const rangeLabel = hasData
    ? `Last ${points.length} bars • Close range $${min.toFixed(2)} → $${max.toFixed(2)}`
    : 'Waiting for live bars…';

  return (
    <div className="flex h-full min-h-[320px] flex-col rounded-2xl border border-emerald-500/25 bg-[#04140c] p-5 text-emerald-50 shadow-[0_26px_52px_rgba(4,20,12,0.45)] sm:min-h-[360px] sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-ruigslay text-3xl leading-tight text-white">Live chart</h3>
        <span className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-200/70">Market tape</span>
      </div>
      <p className="mt-2 font-bricolage text-sm text-emerald-100/70">{rangeLabel}</p>

      <div className="mt-4 h-48 w-full rounded-xl border border-emerald-500/20 bg-[#020b07] p-4 sm:h-56 lg:h-60">
        {hasData ? (
          <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="h-full w-full">
            <defs>
              <linearGradient id="priceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            <polyline
              fill="none"
              stroke="url(#priceGradient)"
              strokeWidth="2.6"
              strokeLinecap="round"
              points={normalized.map((value, index) => `${(index / (normalized.length - 1 || 1)) * 200},${100 - value}`).join(' ')}
            />
          </svg>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-emerald-500/30 text-sm font-bricolage text-emerald-100/60">
            Load market data to view recent price action.
          </div>
        )}
      </div>
    </div>
  );
}

function PaperPerformanceChart({ history }) {
  const points = history.slice(-50);
  if (points.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-3xl border border-dashed border-emerald-500/30 bg-white/80 text-sm font-bricolage text-[#0f3224]/70">
        Route a paper trade to start tracking performance.
      </div>
    );
  }

  const values = points.map((entry) => entry.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const normalized = values.map((value) => ((value - min) / (max - min || 1)) * 100);

  return (
    <div className="rounded-3xl border border-emerald-500/25 bg-[#03160d] p-5 text-emerald-100 shadow-[0_30px_60px_rgba(3,22,13,0.6)] sm:p-6">
      <div className="flex items-center justify-between">
        <h4 className="font-ruigslay text-3xl text-white">Paper desk PnL</h4>
        <span className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-200/70">Real-time</span>
      </div>
      <div className="mt-4 h-40 w-full rounded-2xl bg-[#020b07] p-4">
        <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id="paperPnlGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ecfccb" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#bef264" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke="url(#paperPnlGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            points={normalized.map((value, index) => `${(index / (normalized.length - 1 || 1)) * 200},${100 - value}`).join(' ')}
          />
        </svg>
      </div>
      <div className="mt-3 flex justify-between text-xs font-bricolage text-emerald-100/70">
        <span>{new Date(points[0].timestamp).toLocaleTimeString()}</span>
        <span>{new Date(points[points.length - 1].timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

function PaperTradingPanel({
  strategyId,
  defaultSymbol,
  metrics,
  orders,
  onSubmitOrder,
  onCancelOrder,
  onCancelTarget,
  submitting,
  cancelingId,
  performance,
  history
}) {
  const [form, setForm] = useState({ symbol: defaultSymbol, side: 'buy', quantity: 1, takeProfit: '' });
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    setForm((prev) => ({ ...prev, symbol: defaultSymbol }));
  }, [defaultSymbol]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: name === 'quantity' ? Number(value) : value }));
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    setFeedback(null);

    const payload = { ...form, strategyId };
    if (payload.takeProfit === '') {
      delete payload.takeProfit;
    }

    const result = await onSubmitOrder(payload);
    if (result.success) {
      setFeedback({ type: 'success', message: `Order #${result.order.orderId} filled instantly.` });
      setForm((prev) => ({ ...prev, quantity: 1 }));
    } else {
      setFeedback({ type: 'error', message: result.error });
    }
  };

  const openPositionCopy = performance.position === 0 ? 'Flat' : `${performance.position} @ $${performance.averagePrice.toFixed(2)}`;

  return (
    <div className="space-y-6 rounded-3xl border border-emerald-500/20 bg-white/90 p-5 shadow-[0_20px_40px_rgba(12,38,26,0.12)] sm:p-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h3 className="font-ruigslay text-3xl leading-tight text-[#0f3224]">Paper trading desk</h3>
          <p className="mt-1 font-bricolage text-sm leading-relaxed text-[#0f3224]/75">
            Practise routing buy, sell, or cancel actions with instant fills. Targets can be cancelled without leaving this panel.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-emerald-900/5 p-4 text-sm font-bricolage text-[#0f3224]">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Open position</p>
            <p className="mt-2 font-semibold">{openPositionCopy}</p>
          </div>
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Realised PnL</p>
            <p className={`mt-2 font-semibold ${performance.realizedPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              ${performance.realizedPnl.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <PaperPerformanceChart history={history} />

      <div className="rounded-2xl bg-emerald-900/5 p-4 text-sm font-bricolage text-[#0f3224] sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold text-emerald-900/80">Backtest PnL guide</span>
          <span>
            {metrics
              ? `${metrics.totalReturn.toFixed(2)}% · Ending equity $${metrics.endingCapital.toFixed(2)}`
              : 'Run a parameter backtest to see reference metrics.'}
          </span>
        </div>
      </div>

      <form className="space-y-4" onSubmit={submitOrder}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col text-sm font-bricolage text-[#0f3224]">
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Symbol</span>
            <input
              required
              name="symbol"
              value={form.symbol}
              onChange={handleChange}
              className="mt-2 w-full rounded-xl border border-emerald-500/30 bg-white px-3 py-2 text-sm text-[#0f3224] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </label>
          <label className="flex flex-col text-sm font-bricolage text-[#0f3224]">
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Action</span>
            <select
              name="side"
              value={form.side}
              onChange={handleChange}
              className="mt-2 w-full rounded-xl border border-emerald-500/30 bg-white px-3 py-2 text-sm text-[#0f3224] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </label>
          <label className="flex flex-col text-sm font-bricolage text-[#0f3224]">
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Quantity</span>
            <input
              required
              min="1"
              type="number"
              name="quantity"
              value={form.quantity}
              onChange={handleChange}
              className="mt-2 w-full rounded-xl border border-emerald-500/30 bg-white px-3 py-2 text-sm text-[#0f3224] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </label>
          <label className="flex flex-col text-sm font-bricolage text-[#0f3224]">
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Take-profit target (optional)</span>
            <input
              name="takeProfit"
              value={form.takeProfit}
              onChange={handleChange}
              placeholder="$"
              className="mt-2 w-full rounded-xl border border-emerald-500/30 bg-white px-3 py-2 text-sm text-[#0f3224] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="cta-primary w-full justify-center py-3 text-base tracking-[-0.03em] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Routing order…' : 'Send to paper desk'}
        </button>
      </form>

      {feedback && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-bricolage ${
            feedback.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-50/80 text-emerald-900'
              : 'border-rose-400/60 bg-rose-50 text-rose-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="space-y-3">
        <h4 className="font-bricolage text-base font-semibold text-[#0f3224]">Order log</h4>
        <p className="text-sm font-bricolage text-[#0f3224]/70">Review fills, cancel live orders, or remove take-profit targets.</p>
        <div className="mt-3 space-y-3">
          {orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-emerald-500/30 bg-white/70 p-4 text-sm font-bricolage text-[#0f3224]/70">
              Submit a paper order to see it here.
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.orderId}
                className="flex flex-col gap-3 rounded-2xl border border-emerald-500/20 bg-white/95 p-4 text-sm font-bricolage text-[#0f3224] shadow-[0_16px_32px_rgba(12,38,26,0.08)] lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="space-y-1">
                  <p className="font-semibold">
                    {order.symbol} · {order.side.toUpperCase()} × {order.filledQuantity}
                  </p>
                  <p className="text-xs text-[#0f3224]/70">
                    Avg ${order.averagePrice.toFixed(2)} · {new Date(order.submittedAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-[#0f3224]/70">Status: {order.status}</p>
                  {order.message && <p className="text-xs text-[#0f3224]/60">{order.message}</p>}
                  {order.takeProfit && !order.takeProfitCanceled && (
                    <p className="text-xs text-emerald-700/80">Take profit at ${Number(order.takeProfit).toFixed(2)}</p>
                  )}
                  {order.takeProfitCanceled && (
                    <p className="text-xs text-rose-600/80">Take-profit target cancelled</p>
                  )}
                  {order.canceledAt && (
                    <p className="text-xs text-rose-600/80">Cancelled at {new Date(order.canceledAt).toLocaleString()}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  {order.takeProfit && !order.takeProfitCanceled && (
                    <button
                      type="button"
                      onClick={() => onCancelTarget(order.orderId)}
                      className="rounded-xl border border-emerald-500/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 transition hover:border-emerald-500/60 hover:bg-emerald-50/70"
                    >
                      Cancel take profit
                    </button>
                  )}
                  {order.status !== 'canceled' && (
                    <button
                      type="button"
                      onClick={() => onCancelOrder(order.orderId)}
                      disabled={cancelingId === order.orderId}
                      className="rounded-xl border border-emerald-500/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 transition hover:border-emerald-500/60 hover:bg-emerald-50/70 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {cancelingId === order.orderId ? 'Cancelling…' : 'Cancel order'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function buildParameterisedStrategy({ fastLength, slowLength, exitRsi, stopLoss, takeProfit }) {
  return `function strategy({ data, index, price, helpers, state }) {
  const fast = helpers.ema(data, index, ${Math.max(1, fastLength)});
  const slow = helpers.ema(data, index, ${Math.max(1, slowLength)});
  if (fast === null || slow === null) {
    return { action: 'hold' };
  }

  if (fast > slow && state.positionSize === 0) {
    return { action: 'buy', note: 'Momentum crossover entry' };
  }

  if (state.positionSize > 0) {
    const entryPrice = state.entryPrice || price;
    const stop = entryPrice * (1 - ${Number(stopLoss) / 100});
    const target = entryPrice * (1 + ${Number(takeProfit) / 100});
    const rsi = helpers.rsi(data, index, 14);

    if (price <= stop) {
      return { action: 'exit', note: 'Stop loss triggered' };
    }

    if (price >= target) {
      return { action: 'exit', note: 'Target hit' };
    }

    if (rsi !== null && rsi > ${Number(exitRsi)}) {
      return { action: 'exit', note: 'RSI cooling off' };
    }
  }

  return { action: 'hold' };
}`;
}

export default function CodeLabWorkbench() {
  const containerRef = useRef(null);
  const editorRef = useRef(null);

  const editorSectionRef = useRef(null);
  const strategySectionRef = useRef(null);
  const paperSectionRef = useRef(null);

  const [experienceOpen, setExperienceOpen] = useState(true);
  const [selectedExperience, setSelectedExperience] = useState(null);

  const [monacoStatus, setMonacoStatus] = useState('loading');
  const [loadError, setLoadError] = useState(null);
  const [editorCode, setEditorCode] = useState(DEFAULT_STRATEGY_CODE);
  const [activeTemplate, setActiveTemplate] = useState(STRATEGY_TEMPLATES.momentumPulse.id);

  const [assetClass, setAssetClass] = useState('stocks');
  const [symbol, setSymbol] = useState(ASSET_UNIVERSES.stocks.defaultSymbol);
  const [timeframe, setTimeframe] = useState(ASSET_UNIVERSES.stocks.defaultTimeframe);
  const [limit] = useState(500);

  const [marketData, setMarketData] = useState([]);
  const [marketDataStatus, setMarketDataStatus] = useState('loading');
  const [marketDataError, setMarketDataError] = useState(null);
  const [marketMetadata, setMarketMetadata] = useState({ symbol: 'SPY', timeframe: '1Day', source: 'ALPACA' });
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const [editorBacktestStatus, setEditorBacktestStatus] = useState('idle');
  const [editorBacktestResults, setEditorBacktestResults] = useState(null);
  const [editorError, setEditorError] = useState(null);

  const [testerParams, setTesterParams] = useState({ fastLength: 8, slowLength: 21, exitRsi: 68, stopLoss: 3, takeProfit: 6 });
  const [testerStatus, setTesterStatus] = useState('idle');
  const [testerResults, setTesterResults] = useState(null);
  const [testerError, setTesterError] = useState(null);

  const [orders, setOrders] = useState([]);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [cancelingId, setCancelingId] = useState(null);
  const [paperPerformance, setPaperPerformance] = useState({ position: 0, averagePrice: 0, realizedPnl: 0 });
  const [paperHistory, setPaperHistory] = useState([]);

  useEffect(() => {
    if (!experienceOpen && selectedExperience) {
      const map = {
        editor: editorSectionRef,
        strategy: strategySectionRef,
        paper: paperSectionRef
      };
      const ref = map[selectedExperience];
      if (ref?.current) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [experienceOpen, selectedExperience]);

  useEffect(() => {
    let disposed = false;

    loadMonaco()
      .then((monaco) => {
        if (disposed) {
          return;
        }

        if (!monaco || !containerRef.current) {
          setMonacoStatus('unavailable');
          if (!monaco) {
            setLoadError('Monaco editor is unavailable in this environment. Using the fallback text editor instead.');
          }
          return;
        }

        monaco.editor.defineTheme('algoteen-dark', {
          base: 'vs-dark',
          inherit: true,
          rules: [{ background: '07110c' }],
          colors: {
            'editor.background': '#07110c',
            'editorLineNumber.foreground': '#256f50',
            'editorCursor.foreground': '#6ee7b7',
            'editor.selectionBackground': '#34d39930'
          }
        });

        editorRef.current = monaco.editor.create(containerRef.current, {
          value: editorCode,
          language: 'javascript',
          theme: 'algoteen-dark',
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 14,
          lineHeight: 22,
          fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, SFMono, Menlo, Monaco, Consolas'
        });

        editorRef.current.onDidChangeModelContent(() => {
          setEditorCode(editorRef.current.getValue());
        });

        setMonacoStatus('ready');
      })
      .catch(() => {
        if (!disposed) {
          setMonacoStatus('unavailable');
          setLoadError('Failed to load the Monaco editor. Using the fallback text editor instead.');
        }
      });

    return () => {
      disposed = true;
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (monacoStatus === 'ready' && editorRef.current && editorRef.current.getValue() !== editorCode) {
      editorRef.current.setValue(editorCode);
    }
  }, [monacoStatus, editorCode]);

  const fetchMarketData = useCallback(async () => {
    const params = new URLSearchParams({
      assetClass,
      symbol,
      timeframe,
      limit: String(limit)
    });

    const response = await fetch(`/api/market-data?${params.toString()}`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      let message = `Unable to load brokerage data (status ${response.status}).`;
      try {
        const errorPayload = await response.json();
        if (errorPayload?.error) {
          message = errorPayload.error;
        }
      } catch (parseError) {
        // keep fallback
      }

      throw new Error(message);
    }

    const payload = await response.json();
    const bars = Array.isArray(payload?.bars) ? payload.bars : [];

    const normalizedBars = bars
      .map((bar) => ({
        date: bar.date ?? (bar.t ? String(bar.t).slice(0, 10) : ''),
        open: Number(bar.open ?? bar.o),
        high: Number(bar.high ?? bar.h),
        low: Number(bar.low ?? bar.l),
        close: Number(bar.close ?? bar.c),
        volume: Number(bar.volume ?? bar.v)
      }))
      .filter(
        (bar) =>
          bar.date &&
          Number.isFinite(bar.open) &&
          Number.isFinite(bar.high) &&
          Number.isFinite(bar.low) &&
          Number.isFinite(bar.close) &&
          Number.isFinite(bar.volume)
      );

    if (normalizedBars.length === 0) {
      throw new Error('The brokerage returned no market data. Confirm your symbol, asset class, and credentials.');
    }

    return {
      bars: normalizedBars,
      metadata: {
        symbol: payload?.symbol ?? symbol,
        timeframe: payload?.timeframe ?? timeframe,
        source: payload?.source ? String(payload.source).toUpperCase() : 'BROKERAGE'
      }
    };
  }, [assetClass, symbol, timeframe, limit]);

  const loadBrokerageData = useCallback(async () => {
    setMarketDataStatus('loading');
    setMarketDataError(null);

    try {
      const { bars, metadata } = await fetchMarketData();
      setMarketData(bars);
      setMarketMetadata(metadata);
      setLastSyncedAt(new Date());
      setMarketDataStatus('ready');
    } catch (error) {
      setMarketData([]);
      setMarketDataStatus('error');
      setMarketDataError(error.message);
    }
  }, [fetchMarketData]);

  useEffect(() => {
    loadBrokerageData();
  }, [loadBrokerageData]);

  const handleAssetClassChange = (nextAsset) => {
    const config = ASSET_UNIVERSES[nextAsset];
    setAssetClass(nextAsset);
    setSymbol(config.defaultSymbol);
    setTimeframe(config.defaultTimeframe);
  };

  const handleTemplateSelect = (template) => {
    setActiveTemplate(template.id);
    setEditorCode(template.code);
    if (editorRef.current) {
      editorRef.current.setValue(template.code);
      editorRef.current.focus();
    }
  };

  const runEditorStrategy = useCallback(() => {
    if (!marketData || marketData.length === 0) {
      setEditorBacktestStatus('error');
      setEditorError('Brokerage data is unavailable. Load bars before running a backtest.');
      return;
    }

    setEditorBacktestStatus('running');
    setEditorError(null);

    try {
      const results = runBacktest(editorCode, {
        initialCapital: STARTING_CAPITAL,
        dataset: marketData
      });
      setEditorBacktestResults(results);
      setEditorBacktestStatus('success');
    } catch (error) {
      setEditorBacktestStatus('error');
      setEditorError(error.message);
    }
  }, [editorCode, marketData]);

  useEffect(() => {
    if (marketDataStatus === 'ready' && marketData.length > 0 && !editorBacktestResults && editorBacktestStatus !== 'running') {
      runEditorStrategy();
    }
  }, [marketDataStatus, marketData, editorBacktestResults, editorBacktestStatus, runEditorStrategy]);

  const resetCode = () => {
    const template = STRATEGY_TEMPLATES[activeTemplate] || STRATEGY_TEMPLATES.momentumPulse;
    setEditorCode(template.code);
    if (editorRef.current) {
      editorRef.current.setValue(template.code);
      editorRef.current.focus();
    }
  };

  const datasetPreview = useMemo(() => {
    const previewSource = editorBacktestResults?.dataset ?? marketData;

    if (!previewSource || previewSource.length === 0) {
      return null;
    }

    const latest = previewSource.slice(-3);
    return latest.map((bar) => `$${bar.close.toFixed(2)}`).join(' · ');
  }, [editorBacktestResults, marketData]);

  const handleTesterParamChange = (event) => {
    const { name, value } = event.target;
    setTesterParams((prev) => ({ ...prev, [name]: Number(value) }));
  };

  const runTesterBacktest = () => {
    if (!marketData || marketData.length === 0) {
      setTesterStatus('error');
      setTesterError('Load brokerage data before running the strategy tester.');
      return;
    }

    setTesterStatus('running');
    setTesterError(null);

    try {
      const code = buildParameterisedStrategy(testerParams);
      const results = runBacktest(code, {
        initialCapital: STARTING_CAPITAL,
        dataset: marketData
      });
      setTesterResults(results);
      setTesterStatus('success');
    } catch (error) {
      setTesterStatus('error');
      setTesterError(error.message);
    }
  };

  useEffect(() => {
    if (marketDataStatus === 'ready' && marketData.length > 0 && !testerResults && testerStatus !== 'running') {
      runTesterBacktest();
    }
  }, [marketDataStatus, marketData, testerResults, testerStatus]);

  const handleSubmitOrder = async ({ symbol: orderSymbol, side, quantity, strategyId, takeProfit }) => {
    setOrderSubmitting(true);
    try {
      const res = await fetch('/api/trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: orderSymbol, side, quantity, strategyId, takeProfit })
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Paper order failed.');
      }

      let nextPerformance;
      setPaperPerformance((prev) => {
        const updated = { ...prev };
        if (payload.side === 'buy') {
          const totalCost = prev.averagePrice * prev.position + payload.averagePrice * payload.filledQuantity;
          const newPosition = prev.position + payload.filledQuantity;
          updated.position = newPosition;
          updated.averagePrice = newPosition === 0 ? 0 : totalCost / newPosition;
        } else {
          const newPosition = prev.position - payload.filledQuantity;
          const pnl = (payload.averagePrice - prev.averagePrice) * payload.filledQuantity;
          updated.position = newPosition;
          updated.averagePrice = newPosition <= 0 ? 0 : prev.averagePrice;
          updated.realizedPnl = Number((prev.realizedPnl + pnl).toFixed(2));
        }
        nextPerformance = updated;
        return updated;
      });

      if (nextPerformance) {
        setPaperHistory((prevHistory) => [
          ...prevHistory,
          { timestamp: payload.submittedAt, value: nextPerformance.realizedPnl }
        ]);
      }

      setOrders((prev) => [
        {
          ...payload,
          takeProfit: payload.takeProfit,
          takeProfitCanceled: false
        },
        ...prev
      ]);

      return { success: true, order: payload };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    setCancelingId(orderId);
    try {
      const res = await fetch('/api/trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', orderId })
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Cancellation failed.');
      }

      setOrders((prev) =>
        prev.map((order) =>
          order.orderId === orderId
            ? { ...order, status: payload.status, canceledAt: payload.canceledAt, message: payload.message }
            : order
        )
      );
    } catch (error) {
      setEditorError(error.message);
    } finally {
      setCancelingId(null);
    }
  };

  const handleCancelTarget = (orderId) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.orderId === orderId ? { ...order, takeProfitCanceled: true } : order
      )
    );
  };

  const testerMetrics = testerResults?.metrics || null;
  const paperGuideMetrics = testerMetrics || editorBacktestResults?.metrics || null;
  const datasetForCharts = editorBacktestResults?.dataset ?? marketData;
  const activeTemplateMeta = STRATEGY_TEMPLATES[activeTemplate] || STRATEGY_TEMPLATES.momentumPulse;

  return (
    <div className="space-y-16 sm:space-y-20">
      <ExperienceModal
        open={experienceOpen}
        onSelect={(id) => {
          setSelectedExperience(id);
          setExperienceOpen(false);
        }}
      />

      <section id="editor" ref={editorSectionRef} className="space-y-10">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-700/80">Code lab workstation</span>
            <h2 className="mt-3 font-ruigslay text-5xl text-[#0f3224] sm:text-6xl">Code editor</h2>
            <p className="mt-3 max-w-2xl font-bricolage text-sm leading-relaxed text-[#0f3224]/75">
              Write your strategy in Monaco on the left while brokerage data streams on the right. Run a backtest whenever you are ready.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-white/80 px-4 py-3 text-xs font-bricolage uppercase tracking-[0.32em] text-emerald-800">
            Active template · {activeTemplateMeta.name}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-emerald-500/20 bg-white/95 p-5 shadow-[0_28px_64px_rgba(12,38,26,0.12)] sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <h3 className="font-ruigslay text-3xl leading-tight text-[#0f3224]">Script editor</h3>
                  <p className="font-bricolage text-sm leading-relaxed text-[#0f3224]/70">
                    Update the script and re-run it against live bars. Resets load the highlighted template so you can restart quickly.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={resetCode}
                    className="w-full rounded-xl border border-emerald-500/30 px-4 py-2 text-sm font-bricolage text-[#0f3224] transition hover:border-emerald-500/60 hover:bg-emerald-50/70 sm:w-auto"
                  >
                    Reset script
                  </button>
                  <button
                    type="button"
                    onClick={runEditorStrategy}
                    className="cta-primary w-full justify-center px-5 py-2 text-sm tracking-[-0.03em] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                    disabled={editorBacktestStatus === 'running'}
                  >
                    {editorBacktestStatus === 'running' ? 'Running…' : 'Run backtest'}
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-500/20 bg-[#07110c]">
                {monacoStatus === 'ready' ? (
                  <div ref={containerRef} className="h-full min-h-[320px] w-full sm:min-h-[420px]" />
                ) : (
                  <textarea
                    value={editorCode}
                    onChange={(event) => setEditorCode(event.target.value)}
                    className="h-full min-h-[320px] w-full resize-none bg-[#07110c] p-4 font-mono text-sm text-emerald-50 outline-none sm:min-h-[420px]"
                    spellCheck={false}
                  />
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl bg-emerald-900/5 p-3">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Starting capital</p>
                  <p className="mt-2 text-sm font-semibold text-[#0f3224]">${STARTING_CAPITAL.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl bg-emerald-900/5 p-3">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Latest closes</p>
                  <p className="mt-2 text-sm font-semibold text-[#0f3224]">{datasetPreview ?? 'Load data to preview prices.'}</p>
                </div>
                <div className="rounded-2xl bg-emerald-900/5 p-3">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Editor status</p>
                  <p className="mt-2 text-sm font-semibold text-[#0f3224]">
                    {monacoStatus === 'ready' ? 'Monaco loaded' : monacoStatus === 'loading' ? 'Loading Monaco…' : 'Fallback editor active'}
                  </p>
                </div>
              </div>

              {(editorError || loadError) && (
                <div className="mt-4 rounded-2xl border border-rose-400/50 bg-rose-50/80 px-4 py-3 text-sm font-bricolage text-rose-700">
                  {editorError || loadError}
                </div>
              )}
            </div>

            <StrategyLibrary onSelect={handleTemplateSelect} activeId={activeTemplate} />
          </div>

          <div className="space-y-6">
            <MarketDataPanel
              universes={ASSET_UNIVERSES}
              assetClass={assetClass}
              onAssetChange={handleAssetClassChange}
              symbol={symbol}
              onSymbolChange={setSymbol}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              status={marketDataStatus}
              metadata={marketMetadata}
              barsCount={marketData.length}
              lastSyncedAt={lastSyncedAt}
              error={marketDataError}
              onRetry={loadBrokerageData}
            />
            <PriceChart dataset={datasetForCharts} />
          </div>
        </div>
      </section>

      <section id="strategy" ref={strategySectionRef} className="space-y-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-700/80">Strategy tester</span>
            <h2 className="mt-3 font-ruigslay text-5xl text-[#0f3224] sm:text-6xl">Parameter lab</h2>
            <p className="mt-3 max-w-2xl font-bricolage text-sm leading-relaxed text-[#0f3224]/75">
              Adjust a few key parameters and backtest instantly—no code edits required. Perfect for beginners learning what each input controls.
            </p>
          </div>
          <button
            type="button"
            onClick={runTesterBacktest}
            className="cta-primary px-6 py-3 text-sm tracking-[-0.03em] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={testerStatus === 'running'}
          >
            {testerStatus === 'running' ? 'Running…' : 'Run parameter backtest'}
          </button>
        </div>

        <div className="rounded-3xl border border-emerald-500/20 bg-white/95 p-5 shadow-[0_28px_64px_rgba(12,38,26,0.12)] sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <label className="flex flex-col text-sm font-bricolage text-[#0f3224]">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Fast EMA</span>
              <input
                type="number"
                min="1"
                name="fastLength"
                value={testerParams.fastLength}
                onChange={handleTesterParamChange}
                className="mt-2 rounded-xl border border-emerald-500/30 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </label>
            <label className="flex flex-col text-sm font-bricolage text-[#0f3224]">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Slow EMA</span>
              <input
                type="number"
                min="1"
                name="slowLength"
                value={testerParams.slowLength}
                onChange={handleTesterParamChange}
                className="mt-2 rounded-xl border border-emerald-500/30 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </label>
            <label className="flex flex-col text-sm font-bricolage text-[#0f3224]">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">RSI exit</span>
              <input
                type="number"
                min="40"
                max="90"
                name="exitRsi"
                value={testerParams.exitRsi}
                onChange={handleTesterParamChange}
                className="mt-2 rounded-xl border border-emerald-500/30 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </label>
            <label className="flex flex-col text-sm font-bricolage text-[#0f3224]">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Stop loss %</span>
              <input
                type="number"
                min="1"
                max="20"
                name="stopLoss"
                value={testerParams.stopLoss}
                onChange={handleTesterParamChange}
                className="mt-2 rounded-xl border border-emerald-500/30 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </label>
            <label className="flex flex-col text-sm font-bricolage text-[#0f3224]">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Take profit %</span>
              <input
                type="number"
                min="1"
                max="30"
                name="takeProfit"
                value={testerParams.takeProfit}
                onChange={handleTesterParamChange}
                className="mt-2 rounded-xl border border-emerald-500/30 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </label>
          </div>

          {testerError && (
            <p className="mt-4 rounded-2xl border border-rose-400/50 bg-rose-50/80 px-4 py-3 text-sm font-bricolage text-rose-700">{testerError}</p>
          )}
        </div>

        <MetricsPanel metrics={testerResults?.metrics} status={testerStatus} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <TradesTable trades={testerResults?.trades} />
          <EquitySparkline equityCurve={testerResults?.equityCurve} />
        </div>
      </section>

      <section id="paper" ref={paperSectionRef} className="space-y-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-700/80">Paper trading</span>
            <h2 className="mt-3 font-ruigslay text-5xl text-[#0f3224] sm:text-6xl">Execution desk</h2>
            <p className="mt-3 max-w-2xl font-bricolage text-sm leading-relaxed text-[#0f3224]/75">
              Practise placing simulated orders, cancelling targets, and reading your trade log. The desk mirrors AlgoTeen’s theme for a professional, beginner-friendly feel.
            </p>
          </div>
        </div>

        <PaperTradingPanel
          strategyId={activeTemplate}
          defaultSymbol={symbol}
          metrics={paperGuideMetrics}
          orders={orders}
          onSubmitOrder={handleSubmitOrder}
          onCancelOrder={handleCancelOrder}
          onCancelTarget={handleCancelTarget}
          submitting={orderSubmitting}
          cancelingId={cancelingId}
          performance={paperPerformance}
          history={paperHistory}
        />
      </section>
    </div>
  );
}

