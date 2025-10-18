'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  DEFAULT_STRATEGY_CODE,
  STRATEGY_TEMPLATES,
  STARTING_CAPITAL,
  runBacktest
} from '../../lib/backtester';
import loadMonaco from '../../lib/monacoLoader';

const templateList = Object.values(STRATEGY_TEMPLATES);

const EXPERIENCE_OPTIONS = [
  {
    id: 'editor',
    title: 'Code editor',
    description: 'Launch Monaco with brokerage context and run instant backtests.'
  },
  {
    id: 'strategy',
    title: 'Strategy tester',
    description: 'Drag logic blocks, tune presets, and preview performance.'
  },
  {
    id: 'paper',
    title: 'Paper trading',
    description: 'Practise orders on a pro desk with watchlists, charts, and PnL.'
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

const BLOCK_LIBRARY = [
  {
    category: 'Data',
    blocks: ['Price (OHLCV)', 'Indicator (RSI)', 'Indicator (EMA)', 'Macro & Fundamentals', 'Alternative data']
  },
  {
    category: 'Logic',
    blocks: ['If / Then', 'Compare', 'CrossOver', 'Time Window', 'And / Or Combiner']
  },
  {
    category: 'Risk',
    blocks: ['Position sizing', 'Max exposure', 'Stop / Take-profit', 'Trailing stop']
  },
  {
    category: 'Orders',
    blocks: ['Market', 'Limit', 'Stop', 'Bracket', 'OCO']
  },
  {
    category: 'Portfolio',
    blocks: ['Rebalance', 'Sector caps', 'Beta hedge', 'Pairs trade']
  }
];

function ExperienceModal({ open, onSelect }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#03140b]/70 backdrop-blur" role="dialog" aria-modal="true">
      <div className="mx-4 w-full max-w-3xl rounded-3xl border border-emerald-500/40 bg-white p-8 shadow-[0_40px_120px_rgba(4,20,12,0.6)] sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-900/60">Tailor your session</p>
        <h2 className="mt-4 font-ruigslay text-4xl text-[#0f3224] sm:text-5xl">Where should we start?</h2>
        <p className="mt-3 font-bricolage text-sm leading-relaxed text-[#0f3224]/70">
          Choose the desk that matches your goal. You can always jump across sections using the sticky navigation.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {EXPERIENCE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className="group flex h-full flex-col rounded-2xl border border-emerald-500/40 bg-emerald-50/70 p-5 text-left transition hover:border-emerald-500/70 hover:bg-emerald-50 shadow-[0_22px_44px_rgba(12,38,26,0.12)]"
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
          className="mt-6 inline-flex items-center justify-center rounded-full border border-emerald-500/40 px-6 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-emerald-700 transition hover:border-emerald-500/70 hover:bg-emerald-50"
        >
          Explore everything
        </button>
      </div>
    </div>
  );
}

function EditorRunnerPanel({ status, onRun, onStop, progress, metrics, logs, onResetLogs, error }) {
  const running = status === 'running';
  const hasResults = Boolean(metrics);

  return (
    <div className="rounded-3xl border border-emerald-500/25 bg-white/95 p-5 shadow-[0_28px_64px_rgba(12,38,26,0.12)] sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-900/60">Runner panel</p>
          <h3 className="mt-2 font-ruigslay text-3xl leading-tight text-[#0f3224]">Backtest controls</h3>
          <p className="mt-2 max-w-lg font-bricolage text-sm leading-relaxed text-[#0f3224]/70">
            Launch your script against the latest brokerage dataset, review real-time metrics, and monitor log output as the simulation progresses.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={running ? onStop : onRun}
            className={`rounded-xl px-4 py-2 text-sm font-semibold tracking-[-0.02em] transition ${
              running
                ? 'border border-emerald-500/40 bg-emerald-50/70 text-emerald-700 hover:border-emerald-500/70'
                : 'cta-primary px-6'
            }`}
          >
            {running ? 'Stop run' : 'Play backtest'}
          </button>
          <button
            type="button"
            onClick={onResetLogs}
            className="rounded-xl border border-emerald-500/30 px-4 py-2 text-sm font-bricolage text-[#0f3224] transition hover:border-emerald-500/60 hover:bg-emerald-50/70"
          >
            Clear logs
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-emerald-900/10">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: 'CAGR', value: hasResults ? `${metrics.cagr.toFixed(2)}%` : '—' },
            { label: 'Sharpe', value: hasResults ? metrics.sharpe.toFixed(2) : '—' },
            { label: 'Sortino', value: hasResults ? metrics.sortino.toFixed(2) : '—' },
            { label: 'Max DD', value: hasResults ? `${metrics.maxDrawdown.toFixed(2)}%` : '—' },
            { label: 'Win rate', value: hasResults ? `${metrics.winRate.toFixed(2)}%` : '—' },
            { label: 'Exposure', value: hasResults ? `${metrics.exposure.toFixed(2)}%` : '—' }
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-white via-emerald-50/60 to-white px-4 py-3 text-sm font-bricolage text-[#0f3224]"
            >
              <span className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-emerald-900/60">{item.label}</span>
              <span className="mt-2 block text-xl font-semibold">{running ? '…' : item.value}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Logs</span>
            <span className="text-xs font-bricolage text-[#0f3224]/60">INFO · WARN · ERROR</span>
          </div>
          <div className="max-h-48 overflow-y-auto rounded-2xl border border-emerald-500/20 bg-[#07110c] p-4 font-mono text-xs text-emerald-100">
            {logs.length === 0 ? (
              <p className="font-bricolage text-sm text-emerald-100/70">Run a backtest to populate live logs.</p>
            ) : (
              <ul className="space-y-2">
                {logs.map((log, index) => (
                  <li key={`${log.timestamp}-${index}`} className={`flex items-start gap-3 ${
                    log.level === 'error'
                      ? 'text-rose-300'
                      : log.level === 'warn'
                      ? 'text-amber-300'
                      : 'text-emerald-200'
                  }`}>
                    <span className="shrink-0 font-semibold">[{log.level.toUpperCase()}]</span>
                    <span className="whitespace-pre-wrap text-left">{log.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-400/50 bg-rose-50/80 px-4 py-3 text-sm font-bricolage text-rose-700">{error}</div>
        ) : null}
      </div>
    </div>
  );
}

function DataSidePanel({
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
  dataset
}) {
  const syncing = status === 'loading';
  const hasError = status === 'error';
  const universe = universes[assetClass];
  const symbolOptions = universe?.symbols ?? [];
  const timeframeOptions = universe?.timeframes ?? ['1Day'];

  const previewBars = useMemo(() => dataset?.slice(-6) ?? [], [dataset]);
  const closes = previewBars.map((bar) => bar.close);
  const min = closes.length > 0 ? Math.min(...closes) : null;
  const max = closes.length > 0 ? Math.max(...closes) : null;
  const normalized = closes.map((value) => ((value - min) / (max - min || 1)) * 100);

  const lastSyncedLabel = lastSyncedAt
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }).format(lastSyncedAt)
    : '—';

  return (
    <div className="space-y-6 rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-white via-emerald-50/70 to-white p-5 shadow-[0_28px_60px_rgba(12,38,26,0.1)] sm:p-6">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-900/60">Data side panel</p>
          <h3 className="mt-2 font-ruigslay text-3xl leading-tight text-[#0f3224]">
            {metadata.symbol} · {metadata.timeframe}
          </h3>
          <p className="mt-2 font-bricolage text-sm leading-relaxed text-[#0f3224]/70">
            Choose the market universe, inspect the latest rows, and confirm the source before you hit run.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col text-sm font-bricolage text-[#0f3224]">
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Market</span>
            <select
              value={assetClass}
              onChange={(event) => onAssetChange(event.target.value)}
              className="mt-2 rounded-xl border border-emerald-500/30 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
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
              className="mt-2 rounded-xl border border-emerald-500/30 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
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
              className="mt-2 rounded-xl border border-emerald-500/30 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
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
            className={`rounded-xl border px-4 py-2 text-sm font-bricolage transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 ${
              syncing
                ? 'cursor-not-allowed border-emerald-500/20 bg-emerald-50/60 text-emerald-900/40'
                : 'border-emerald-500/40 bg-white text-emerald-900 hover:border-emerald-500/70 hover:bg-emerald-50/80'
            }`}
          >
            {syncing ? 'Refreshing…' : 'Refresh data'}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-emerald-900/5 p-3">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Rows</p>
          <p className="mt-2 text-sm font-semibold text-[#0f3224]">{barsCount ?? '—'}</p>
        </div>
        <div className="rounded-2xl bg-emerald-900/5 p-3">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Source</p>
          <p className="mt-2 text-sm font-semibold text-[#0f3224]">{metadata.source}</p>
        </div>
        <div className="rounded-2xl bg-emerald-900/5 p-3">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Last synced</p>
          <p className="mt-2 text-sm font-semibold text-[#0f3224]">{lastSyncedLabel}</p>
        </div>
      </div>

      <div>
        <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Data preview</span>
        <div className="mt-3 max-h-56 overflow-hidden rounded-2xl border border-emerald-500/20 bg-white/95">
          <table className="min-w-full divide-y divide-emerald-500/10 text-left text-xs font-bricolage text-[#0f3224]">
            <thead className="bg-emerald-500/10 uppercase tracking-[0.2em] text-emerald-900/70">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Open</th>
                <th className="px-3 py-2">High</th>
                <th className="px-3 py-2">Low</th>
                <th className="px-3 py-2">Close</th>
                <th className="px-3 py-2">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-500/10">
              {previewBars.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-sm text-[#0f3224]/70">
                    Load brokerage data to inspect the latest bars.
                  </td>
                </tr>
              ) : (
                previewBars.map((bar) => (
                  <tr key={`${bar.date}-${bar.close}`}>
                    <td className="px-3 py-2">{bar.date}</td>
                    <td className="px-3 py-2">${bar.open.toFixed(2)}</td>
                    <td className="px-3 py-2">${bar.high.toFixed(2)}</td>
                    <td className="px-3 py-2">${bar.low.toFixed(2)}</td>
                    <td className="px-3 py-2 font-semibold text-emerald-700">${bar.close.toFixed(2)}</td>
                    <td className="px-3 py-2">{bar.volume.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Mini chart</span>
        <div className="mt-3 h-32 rounded-2xl border border-emerald-500/20 bg-[#04140c] p-4">
          {previewBars.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-emerald-500/30 text-xs font-bricolage text-emerald-100/70">
              Awaiting market data…
            </div>
          ) : (
            <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="h-full w-full">
              <defs>
                <linearGradient id="miniChartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              <polyline
                fill="none"
                stroke="url(#miniChartGradient)"
                strokeWidth="2.4"
                strokeLinecap="round"
                points={normalized
                  .map((value, index) => `${(index / (normalized.length - 1 || 1)) * 200},${100 - value}`)
                  .join(' ')}
              />
            </svg>
          )}
        </div>
      </div>

      {hasError ? (
        <p className="rounded-2xl border border-rose-500/30 bg-rose-50/80 p-4 text-sm font-bricolage text-rose-700">{error}</p>
      ) : null}
    </div>
  );
}

function EditorParameterPanel({ params, onChange, onPresetSelect, activePreset, gridSearchEnabled, onToggleGridSearch }) {
  return (
    <div className="rounded-3xl border border-emerald-500/20 bg-white/95 p-5 shadow-[0_24px_52px_rgba(12,38,26,0.1)] sm:p-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-900/60">Parameter panel</p>
            <h3 className="font-ruigslay text-3xl leading-tight text-[#0f3224]">Strategy hyperparameters</h3>
            <p className="mt-2 font-bricolage text-sm leading-relaxed text-[#0f3224]/70">
              Tune core values and decide whether to enable grid search sweeps. Presets help beginners explore battle-tested combinations.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-emerald-500/60 text-emerald-600 focus:ring-emerald-500"
              checked={gridSearchEnabled}
              onChange={(event) => onToggleGridSearch(event.target.checked)}
            />
            Grid search
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { key: 'fast', label: 'Fast length', hint: 'EMA lookback for entries' },
            { key: 'slow', label: 'Slow length', hint: 'Longer trend filter' },
            { key: 'exit', label: 'RSI exit', hint: 'Overbought trigger' },
            { key: 'risk', label: 'Stop loss %', hint: 'Capital at risk per trade' },
            { key: 'target', label: 'Take profit %', hint: 'Capture winners' },
            { key: 'size', label: 'Position size', hint: 'Units per order' }
          ].map((field) => (
            <label key={field.key} className="flex flex-col text-sm font-bricolage text-[#0f3224]">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">
                {field.label}
              </span>
              <input
                type="number"
                className="mt-2 rounded-xl border border-emerald-500/30 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                value={params[field.key]}
                onChange={(event) => onChange(field.key, Number(event.target.value))}
              />
              <span className="mt-1 text-xs text-[#0f3224]/60">{field.hint}</span>
            </label>
          ))}
        </div>

        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Presets</span>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {templateList.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => onPresetSelect(template)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-bricolage transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 ${
                  activePreset === template.id
                    ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900'
                    : 'border-emerald-500/30 bg-white/90 text-[#0f3224] hover:border-emerald-500/60 hover:bg-emerald-50/60'
                }`}
              >
                <span className="block text-base font-semibold">{template.name}</span>
                <span className="mt-1 block text-xs text-[#0f3224]/70">{template.description}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function UnitTestsPanel({ results }) {
  const tests = [
    {
      id: 'defines-strategy',
      label: 'strategy() exported',
      passed: results ? true : false
    },
    {
      id: 'generates-trades',
      label: 'At least one trade',
      passed: (results?.trades?.length ?? 0) > 0
    },
    {
      id: 'positive-return',
      label: 'Non-zero total return',
      passed: results ? results.metrics.totalReturn !== 0 : false
    }
  ];

  return (
    <div className="rounded-3xl border border-emerald-500/25 bg-white/95 p-5 shadow-[0_22px_48px_rgba(12,38,26,0.1)] sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-900/60">Unit tests</p>
      <h3 className="mt-2 font-ruigslay text-3xl text-[#0f3224]">Signal coverage</h3>
      <ul className="mt-4 space-y-3">
        {tests.map((test) => (
          <li
            key={test.id}
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-bricolage ${
              test.passed ? 'border-emerald-500/40 bg-emerald-50/70 text-emerald-800' : 'border-emerald-500/20 bg-white/80 text-[#0f3224]'
            }`}
          >
            <span>{test.label}</span>
            <span className={`text-xs font-semibold uppercase tracking-[0.28em] ${test.passed ? 'text-emerald-700' : 'text-rose-600'}`}>
              {test.passed ? 'PASS' : 'FAIL'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DocsPanel({ source }) {
  return (
    <div className="rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-white via-emerald-50/80 to-white p-5 shadow-[0_20px_44px_rgba(12,38,26,0.1)] sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-900/60">Docs & SDK</p>
      <h3 className="mt-2 font-ruigslay text-3xl text-[#0f3224]">In-app reference</h3>
      <div className="mt-4 space-y-4 text-sm font-bricolage text-[#0f3224]/75">
        <div>
          <p className="font-semibold uppercase tracking-[0.22em] text-emerald-800">Events</p>
          <p className="mt-1">Use <code>strategy({`{ data, index, price, bar, state, helpers }`})</code> with helpers like <code>ema</code>, <code>rsi</code>, and <code>percentChange</code>.</p>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-[0.22em] text-emerald-800">Order API</p>
          <p className="mt-1">Return actions: <code>buy</code>, <code>sell</code>, or <code>exit</code> with optional <code>size</code> and <code>note</code>.</p>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-[0.22em] text-emerald-800">Indicators</p>
          <p className="mt-1">Built-ins include <code>ema</code>, <code>sma</code>, <code>highest</code>, <code>lowest</code>, and <code>rsi</code>.</p>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-white/90 p-4 text-xs text-[#0f3224]/60">
        Data provenance · {source}
      </div>
    </div>
  );
}

function LiveMarketChart({ dataset, status, symbol, timeframe }) {
  const points = dataset?.slice(-180) ?? [];
  const hasData = points.length > 0;
  const closes = points.map((bar) => bar.close);
  const min = hasData ? Math.min(...closes) : 0;
  const max = hasData ? Math.max(...closes) : 0;
  const normalized = hasData ? closes.map((value) => ((value - min) / (max - min || 1)) * 100) : [];

  const statusCopy =
    status === 'loading'
      ? 'Syncing Alpaca bars…'
      : hasData
      ? `${symbol} · ${timeframe} · Close range $${min.toFixed(2)} → $${max.toFixed(2)}`
      : 'Load brokerage data to render the live tape.';

  return (
    <section className="space-y-6 rounded-4xl border border-emerald-500/25 bg-[#03150d] p-6 text-emerald-50 shadow-[0_40px_120px_rgba(3,21,13,0.6)] sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-200/70">Live market chart</span>
          <h2 className="mt-2 font-ruigslay text-[clamp(2.5rem,6vw,4rem)] leading-[0.95] text-white">Intraday tape</h2>
          <p className="mt-3 max-w-2xl font-bricolage text-sm text-emerald-100/80">{statusCopy}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-[#042516] px-4 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/80">
          Powered by Alpaca Market Data
        </div>
      </div>

      <div className="h-72 w-full rounded-3xl border border-emerald-500/20 bg-[#020b07] p-4 sm:h-80">
        {hasData ? (
          <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="h-full w-full">
            <defs>
              <linearGradient id="liveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <polyline
              fill="none"
              stroke="url(#liveGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              points={normalized
                .map((value, index) => `${(index / (normalized.length - 1 || 1)) * 200},${100 - value}`)
                .join(' ')}
            />
          </svg>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-emerald-500/30 font-bricolage text-sm text-emerald-100/70">
            {status === 'loading' ? 'Loading latest candles…' : 'Load bars to view live action.'}
          </div>
        )}
      </div>
    </section>
  );
}

function BacktestMetrics({ metrics, status }) {
  const items = [
    { label: 'Ending equity', value: metrics ? `$${metrics.endingCapital.toFixed(2)}` : '—', emphasis: true },
    { label: 'Total return', value: metrics ? `${metrics.totalReturn.toFixed(2)}%` : '—' },
    { label: 'Trades', value: metrics ? metrics.totalTrades : '—' },
    { label: 'Win rate', value: metrics ? `${metrics.winRate.toFixed(2)}%` : '—' },
    { label: 'Avg trade', value: metrics ? `${metrics.averageReturn.toFixed(2)}%` : '—' },
    { label: 'Max drawdown', value: metrics ? `${metrics.maxDrawdown.toFixed(2)}%` : '—' }
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
      <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Equity curve</span>
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
            points={normalized
              .map((value, index) => `${(index / (normalized.length - 1 || 1)) * 200},${100 - value}`)
              .join(' ')}
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

function StrategyBlocksCanvas({ activeTemplate }) {
  return (
    <div className="rounded-4xl border border-emerald-500/25 bg-white/95 p-6 shadow-[0_30px_80px_rgba(12,38,26,0.12)] sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-900/60">Visual builder</span>
          <h3 className="mt-2 font-ruigslay text-4xl leading-tight text-[#0f3224]">Canvas & logic blocks</h3>
          <p className="mt-2 max-w-3xl font-bricolage text-sm leading-relaxed text-[#0f3224]/70">
            Drag blocks to craft a signal. AlgoTeen compiles the flow into a read-only preview so you can confirm the generated code.
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/80 px-4 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-800">
          Active preset · {STRATEGY_TEMPLATES[activeTemplate]?.name ?? 'Momentum Pulse'}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4 rounded-3xl border border-emerald-500/20 bg-emerald-900/5 p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-900/60">Blocks</span>
            <span className="text-xs font-bricolage text-[#0f3224]/60">Drag & drop</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {BLOCK_LIBRARY.map((group) => (
              <div key={group.category} className="space-y-3 rounded-2xl border border-emerald-500/20 bg-white/90 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">{group.category}</p>
                <ul className="space-y-2 text-sm font-bricolage text-[#0f3224]">
                  {group.blocks.map((block) => (
                    <li key={block} className="flex items-center justify-between rounded-xl bg-emerald-900/5 px-3 py-2">
                      <span>{block}</span>
                      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-emerald-700">Block</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex h-full flex-col gap-4 rounded-3xl border border-emerald-500/20 bg-white/95 p-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-900/60">Compiled strategy</span>
            <p className="mt-2 font-bricolage text-sm leading-relaxed text-[#0f3224]/70">
              Read-only output refreshed as you connect blocks. Export directly to the editor to fine-tune with JavaScript.
            </p>
          </div>
          <pre className="flex-1 overflow-auto rounded-2xl border border-emerald-500/20 bg-[#07110c] p-4 font-mono text-xs text-emerald-100">
{STRATEGY_TEMPLATES[activeTemplate]?.code ?? DEFAULT_STRATEGY_CODE}
          </pre>
          <button
            type="button"
            className="rounded-xl border border-emerald-500/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700 transition hover:border-emerald-500/60 hover:bg-emerald-50/70"
          >
            Send to editor
          </button>
        </div>
      </div>
    </div>
  );
}

function BacktestResearchPanel() {
  const sections = [
    {
      title: 'Engines',
      bullets: [
        'Event-driven bar/tick simulation with deterministic seeding',
        'Plugin slots for slippage, commission, borrow fees'
      ]
    },
    {
      title: 'Metrics',
      bullets: ['Equity & drawdown', 'Rolling Sharpe and Sortino', 'Turnover, exposure, Kelly fraction']
    },
    {
      title: 'Trade analysis',
      bullets: ['Trade distribution and holding time', 'Per-symbol and setup breakdowns', 'Heatmaps & factor returns']
    },
    {
      title: 'Robustness',
      bullets: ['Walk-forward and train/test splits', 'Monte-Carlo paths', 'Parameter stability charts']
    },
    {
      title: 'Data management',
      bullets: ['Ingest & resample with corporate actions', 'Timezone handling and caching', 'Snapshot datasets per run']
    }
  ];

  return (
    <div className="rounded-4xl border border-emerald-500/25 bg-white/95 p-6 shadow-[0_30px_80px_rgba(12,38,26,0.12)] sm:p-8">
      <span className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-900/60">Research suite</span>
      <h3 className="mt-2 font-ruigslay text-4xl leading-tight text-[#0f3224]">Backtesting & analytics</h3>
      <p className="mt-3 max-w-3xl font-bricolage text-sm leading-relaxed text-[#0f3224]/70">
        AlgoTeen ships with professional analytics so beginners can understand every run. Review the highlights below to learn what the desk tracks automatically.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <div key={section.title} className="space-y-3 rounded-3xl border border-emerald-500/20 bg-emerald-900/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">{section.title}</p>
            <ul className="space-y-2 text-sm font-bricolage text-[#0f3224]">
              {section.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaperPerformanceChart({ history }) {
  const points = history.slice(-80);
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
            points={normalized
              .map((value, index) => `${(index / (normalized.length - 1 || 1)) * 200},${100 - value}`)
              .join(' ')}
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

function PaperTradingDashboard({
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
  history,
  watchlist,
  onWatchlistToggle
}) {
  const [side, setSide] = useState('buy');
  const [symbol, setSymbol] = useState(defaultSymbol || 'SPY');
  const [quantity, setQuantity] = useState(10);
  const [orderType, setOrderType] = useState('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [takeProfit, setTakeProfit] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      symbol,
      side,
      quantity: Number(quantity),
      orderType,
      limitPrice: orderType === 'limit' ? Number(limitPrice) : undefined,
      takeProfit: takeProfit ? Number(takeProfit) : undefined,
      strategyId
    };
    await onSubmitOrder(payload);
  };

  const latestOrders = orders.slice(0, 6);
  const metricsSummary = metrics
    ? [
        { label: 'Ending equity', value: `$${metrics.endingCapital.toFixed(2)}` },
        { label: 'Total return', value: `${metrics.totalReturn.toFixed(2)}%` },
        { label: 'Win rate', value: `${metrics.winRate.toFixed(2)}%` }
      ]
    : [];

  return (
    <div className="rounded-4xl border border-emerald-500/25 bg-white/95 p-6 shadow-[0_40px_120px_rgba(12,38,26,0.12)] sm:p-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-900/60">Paper trading desk</span>
            <h3 className="mt-2 font-ruigslay text-[clamp(2.5rem,6vw,4rem)] leading-[0.95] text-[#0f3224]">Execution dashboard</h3>
            <p className="mt-2 max-w-2xl font-bricolage text-sm leading-relaxed text-[#0f3224]/70">
              Search tickers, review live tape, and practise sending orders. Everything mirrors a professional workstation, complete with watchlists, logs, and account health.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {metricsSummary.map((item) => (
              <div key={item.label} className="rounded-2xl border border-emerald-500/20 bg-emerald-900/5 px-4 py-3 text-xs font-bricolage text-[#0f3224]/80">
                <p className="font-semibold uppercase tracking-[0.22em] text-emerald-900/60">{item.label}</p>
                <p className="mt-1 text-lg font-semibold text-[#0f3224]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1.5fr)]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-emerald-500/20 bg-white/95 p-5 shadow-[0_24px_52px_rgba(12,38,26,0.1)] sm:p-6">
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                  <label className="flex flex-1 flex-col text-sm font-bricolage text-[#0f3224]">
                    <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Search / Symbol</span>
                    <input
                      type="text"
                      value={symbol}
                      onChange={(event) => setSymbol(event.target.value.toUpperCase())}
                      className="mt-2 rounded-xl border border-emerald-500/30 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      placeholder="SPY"
                    />
                  </label>
                  <div className="flex gap-2 rounded-xl border border-emerald-500/30 bg-emerald-900/5 p-1 text-sm">
                    {['buy', 'sell'].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSide(value)}
                        className={`flex-1 rounded-lg px-3 py-2 font-semibold capitalize transition ${
                          side === value ? 'bg-emerald-500 text-white shadow-[0_10px_30px_rgba(16,185,129,0.35)]' : 'text-[#0f3224]'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <label className="flex flex-col text-sm font-bricolage text-[#0f3224]">
                    <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Quantity</span>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      className="mt-2 rounded-xl border border-emerald-500/30 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="flex flex-col text-sm font-bricolage text-[#0f3224]">
                    <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Order type</span>
                    <select
                      value={orderType}
                      onChange={(event) => setOrderType(event.target.value)}
                      className="mt-2 rounded-xl border border-emerald-500/30 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    >
                      <option value="market">Market</option>
                      <option value="limit">Limit</option>
                      <option value="stop">Stop</option>
                    </select>
                  </label>
                  <label className="flex flex-col text-sm font-bricolage text-[#0f3224]">
                    <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Limit / trigger</span>
                    <input
                      type="number"
                      value={limitPrice}
                      onChange={(event) => setLimitPrice(event.target.value)}
                      placeholder="Optional"
                      className="mt-2 rounded-xl border border-emerald-500/30 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </label>
                  <label className="flex flex-col text-sm font-bricolage text-[#0f3224]">
                    <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Take profit</span>
                    <input
                      type="number"
                      value={takeProfit}
                      onChange={(event) => setTakeProfit(event.target.value)}
                      placeholder="Optional"
                      className="mt-2 rounded-xl border border-emerald-500/30 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="cta-primary w-full justify-center px-6 py-3 text-sm tracking-[-0.03em] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? 'Routing order…' : `${side === 'buy' ? 'Buy' : 'Sell'} ${symbol}`}
                </button>
              </form>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <div className="space-y-4 rounded-3xl border border-emerald-500/20 bg-white/95 p-6 shadow-[0_24px_52px_rgba(12,38,26,0.1)]">
                <div className="flex items-center justify-between">
                  <h4 className="font-ruigslay text-3xl text-[#0f3224]">Order history</h4>
                  <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Latest 6</span>
                </div>
                <div className="space-y-3">
                  {latestOrders.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-50/60 px-4 py-4 text-sm font-bricolage text-[#0f3224]/70">
                      Submit a paper order to start the log.
                    </p>
                  ) : (
                    latestOrders.map((order) => (
                      <div key={order.orderId} className="rounded-2xl border border-emerald-500/20 bg-white/80 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-bricolage text-[#0f3224]">
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] ${
                              order.side === 'buy' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700'
                            }`}
                            >
                              {order.side}
                            </span>
                            <span className="font-semibold">{order.symbol}</span>
                            <span>· {order.orderType}</span>
                          </div>
                          <span className="text-xs text-[#0f3224]/60">
                            {new Date(order.submittedAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          <div className="text-xs text-[#0f3224]/70">Qty · {order.filledQuantity ?? order.quantity}</div>
                          <div className="text-xs text-[#0f3224]/70">Avg price · ${Number(order.averagePrice ?? order.limitPrice ?? 0).toFixed(2)}</div>
                          <div className="text-xs text-[#0f3224]/70">Status · {order.status}</div>
                        </div>
                        {order.message && <p className="mt-2 text-xs text-[#0f3224]/60">{order.message}</p>}
                        {order.takeProfit && !order.takeProfitCanceled && (
                          <p className="text-xs text-emerald-700/80">Take profit at ${Number(order.takeProfit).toFixed(2)}</p>
                        )}
                        {order.takeProfitCanceled && (
                          <p className="text-xs text-rose-600/80">Take-profit target cancelled</p>
                        )}
                        {order.canceledAt && (
                          <p className="text-xs text-rose-600/80">Cancelled at {new Date(order.canceledAt).toLocaleString()}</p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
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

              <div className="space-y-4">
                <div className="rounded-3xl border border-emerald-500/20 bg-white/95 p-5 shadow-[0_24px_52px_rgba(12,38,26,0.1)]">
                  <div className="flex items-center justify-between">
                    <h4 className="font-ruigslay text-3xl text-[#0f3224]">Account & wallet</h4>
                    <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Balance</span>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm font-bricolage text-[#0f3224]">
                    <div className="flex items-center justify-between rounded-2xl bg-emerald-900/5 px-4 py-3">
                      <span>Total balance</span>
                      <span className="font-semibold">${(STARTING_CAPITAL + performance.realizedPnl).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-emerald-900/5 px-4 py-3">
                      <span>Invested</span>
                      <span className="font-semibold">${(performance.position * performance.averagePrice).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-emerald-900/5 px-4 py-3">
                      <span>Realized PnL</span>
                      <span className={`font-semibold ${performance.realizedPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ${performance.realizedPnl.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-emerald-900/5 px-4 py-3">
                      <span>Cash available</span>
                      <span className="font-semibold">${(STARTING_CAPITAL - performance.position * performance.averagePrice + performance.realizedPnl).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <PaperPerformanceChart history={history} />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-emerald-500/20 bg-[#04140c] p-6 text-emerald-100 shadow-[0_24px_52px_rgba(4,20,12,0.5)]">
              <div className="flex items-center justify-between">
                <h4 className="font-ruigslay text-3xl text-white">Watchlist</h4>
                <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/70">Toggle favourites</span>
              </div>
              <ul className="mt-4 space-y-3 text-sm font-bricolage">
                {watchlist.map((item) => (
                  <li key={item.symbol} className="flex items-center justify-between rounded-2xl bg-[#020b07] px-4 py-3">
                    <div>
                      <p className="font-semibold text-white">{item.symbol}</p>
                      <p className="text-xs text-emerald-100/70">{item.label}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onWatchlistToggle(item.symbol)}
                      className={`rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] transition ${
                        item.active
                          ? 'border-emerald-400 bg-emerald-500 text-[#03150d]'
                          : 'border-emerald-400/50 text-emerald-100 hover:border-emerald-300'
                      }`}
                    >
                      {item.active ? 'Tracking' : 'Watch'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-white/95 p-6 shadow-[0_24px_52px_rgba(12,38,26,0.1)]">
              <h4 className="font-ruigslay text-3xl text-[#0f3224]">Data provenance</h4>
              <p className="mt-2 text-sm font-bricolage text-[#0f3224]/70">
                Quotes refresh from Alpaca and mirror the symbol you select above. Keep this panel open while you practise so you always see the latest feed and checklist of open orders.
              </p>
              <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-900/5 px-4 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/70">
                Real-time feed · {symbol}
              </div>
            </div>
          </div>
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
  const liveSectionRef = useRef(null);
  const strategySectionRef = useRef(null);
  const paperSectionRef = useRef(null);

  const [experienceOpen, setExperienceOpen] = useState(true);
  const [selectedExperience, setSelectedExperience] = useState(null);

  const [monacoStatus, setMonacoStatus] = useState('loading');
  const [loadError, setLoadError] = useState(null);
  const [editorCode, setEditorCode] = useState(DEFAULT_STRATEGY_CODE);
  const [activeTemplate, setActiveTemplate] = useState(STRATEGY_TEMPLATES.momentumPulse.id);

  const [editorParams, setEditorParams] = useState({ fast: 8, slow: 21, exit: 68, risk: 3, target: 6, size: 1 });
  const [gridSearchEnabled, setGridSearchEnabled] = useState(false);
  const [editorLogs, setEditorLogs] = useState([]);
  const [editorProgress, setEditorProgress] = useState(0);

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

  const [watchlist, setWatchlist] = useState([
    { symbol: 'SPY', label: 'SPDR S&P 500', active: true },
    { symbol: 'QQQ', label: 'NASDAQ 100', active: true },
    { symbol: 'EUR/USD', label: 'Euro / USD', active: false },
    { symbol: 'BTC/USD', label: 'Bitcoin / USD', active: false },
    { symbol: 'TSLA', label: 'Tesla', active: false }
  ]);

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

  const loadBrokerageData = useCallback(async () => {
    setMarketDataStatus('loading');
    setMarketDataError(null);

    try {
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
          // ignore parsing error
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

      setMarketData(normalizedBars);
      setMarketMetadata({
        symbol: payload?.symbol ?? symbol,
        timeframe: payload?.timeframe ?? timeframe,
        source: payload?.source ?? 'ALPACA'
      });
      setLastSyncedAt(new Date());
      setMarketDataStatus('ready');
    } catch (error) {
      setMarketDataStatus('error');
      setMarketDataError(error.message);
    }
  }, [assetClass, limit, symbol, timeframe]);

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

  const resetCode = () => {
    const template = STRATEGY_TEMPLATES[activeTemplate] || STRATEGY_TEMPLATES.momentumPulse;
    setEditorCode(template.code);
    if (editorRef.current) {
      editorRef.current.setValue(template.code);
      editorRef.current.focus();
    }
  };

  const pushLog = useCallback((log) => {
    setEditorLogs((previous) => [
      ...previous.slice(-40),
      {
        timestamp: Date.now(),
        level: log.level,
        message: log.message
      }
    ]);
  }, []);

  const runEditorStrategy = useCallback(() => {
    if (!marketData || marketData.length === 0) {
      setEditorBacktestStatus('error');
      setEditorError('Brokerage data is unavailable. Load bars before running a backtest.');
      pushLog({ level: 'error', message: 'Cannot run backtest—no brokerage data loaded.' });
      return;
    }

    setEditorBacktestStatus('running');
    setEditorError(null);
    setEditorProgress(12);
    pushLog({ level: 'info', message: `Starting backtest on ${marketMetadata.symbol} (${marketMetadata.timeframe})…` });
    if (gridSearchEnabled) {
      pushLog({ level: 'info', message: 'Grid search enabled—sampling presets before final pass.' });
    }

    try {
      const results = runBacktest(editorCode, {
        initialCapital: STARTING_CAPITAL,
        dataset: marketData
      });
      setEditorBacktestResults(results);
      setEditorBacktestStatus('success');
      setEditorProgress(100);
      pushLog({ level: 'info', message: `Backtest finished with total return ${results.metrics.totalReturn.toFixed(2)}%.` });
    } catch (error) {
      setEditorBacktestStatus('error');
      setEditorError(error.message);
      setEditorProgress(0);
      pushLog({ level: 'error', message: error.message });
    }
  }, [editorCode, gridSearchEnabled, marketData, marketMetadata.symbol, marketMetadata.timeframe, pushLog]);

  const stopEditorRun = () => {
    setEditorBacktestStatus('idle');
    setEditorProgress(0);
    pushLog({ level: 'warn', message: 'Backtest interrupted manually.' });
  };

  useEffect(() => {
    if (marketDataStatus === 'ready' && marketData.length > 0 && !editorBacktestResults && editorBacktestStatus !== 'running') {
      runEditorStrategy();
    }
  }, [marketDataStatus, marketData, editorBacktestResults, editorBacktestStatus, runEditorStrategy]);

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
      const parameterisedCode = buildParameterisedStrategy(testerParams);
      const results = runBacktest(parameterisedCode, {
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

  const handleSubmitOrder = async (payload) => {
    setOrderSubmitting(true);
    try {
      const res = await fetch('/api/trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', ...payload })
      });

      const response = await res.json();
      if (!res.ok) {
        throw new Error(response.error || 'Unable to submit order.');
      }

      setPaperPerformance((prev) => {
        const updated = { ...prev };
        if (response.side === 'buy') {
          const totalCost = prev.averagePrice * prev.position + response.averagePrice * response.filledQuantity;
          const newPosition = prev.position + response.filledQuantity;
          updated.position = newPosition;
          updated.averagePrice = newPosition === 0 ? 0 : totalCost / newPosition;
        } else {
          const newPosition = prev.position - response.filledQuantity;
          const pnl = (response.averagePrice - prev.averagePrice) * response.filledQuantity * (response.side === 'sell' ? 1 : -1);
          updated.position = newPosition;
          updated.averagePrice = newPosition <= 0 ? 0 : prev.averagePrice;
          updated.realizedPnl = Number((prev.realizedPnl + pnl).toFixed(2));
        }
        return updated;
      });

      setPaperHistory((prev) => [
        ...prev,
        { timestamp: response.submittedAt, value: response.realizedPnl ?? paperPerformance.realizedPnl }
      ]);

      setOrders((prev) => [
        {
          ...response,
          takeProfit: response.takeProfit,
          takeProfitCanceled: false
        },
        ...prev
      ]);

      return { success: true, order: response };
    } catch (error) {
      setEditorError(error.message);
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
    setOrders((prev) => prev.map((order) => (order.orderId === orderId ? { ...order, takeProfitCanceled: true } : order)));
  };

  const handleEditorParamChange = (key, value) => {
    setEditorParams((prev) => ({ ...prev, [key]: value }));
  };

  const handlePresetSelect = (template) => {
    handleTemplateSelect(template);
    setEditorParams({ fast: 8, slow: 21, exit: 68, risk: 3, target: 6, size: 1 });
  };

  const handleWatchlistToggle = (ticker) => {
    setWatchlist((prev) =>
      prev.map((item) => (item.symbol === ticker ? { ...item, active: !item.active } : item))
    );
  };

  const datasetForCharts = editorBacktestResults?.dataset ?? marketData;
  const testerMetrics = testerResults?.metrics || null;

  return (
    <div className="space-y-20 sm:space-y-24">
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
            <h2 className="mt-3 font-ruigslay text-[clamp(3rem,7vw,5rem)] text-[#0f3224]">Code editor</h2>
            <p className="mt-3 max-w-2xl font-bricolage text-sm leading-relaxed text-[#0f3224]/75">
              Write strategies inside Monaco, stream brokerage context on the side, and trigger detailed runs with pro-grade metrics.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-white/80 px-4 py-3 text-xs font-bricolage uppercase tracking-[0.32em] text-emerald-800">
            Active template · {STRATEGY_TEMPLATES[activeTemplate]?.name}
          </div>
        </div>

        <div className="grid gap-8 2xl:grid-cols-[minmax(0,3.2fr)_minmax(320px,2fr)]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-emerald-500/20 bg-white/95 p-5 shadow-[0_28px_64px_rgba(12,38,26,0.12)] sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <h3 className="font-ruigslay text-3xl leading-tight text-[#0f3224]">Script editor</h3>
                  <p className="font-bricolage text-sm leading-relaxed text-[#0f3224]/70">
                    Update your strategy and rerun backtests whenever brokerage data refreshes. Reset to reload the current preset.
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
                  <div ref={containerRef} className="h-full min-h-[360px] w-full sm:min-h-[460px]" />
                ) : (
                  <textarea
                    value={editorCode}
                    onChange={(event) => setEditorCode(event.target.value)}
                    className="h-full min-h-[360px] w-full resize-none bg-[#07110c] p-4 font-mono text-sm text-emerald-50 outline-none sm:min-h-[460px]"
                    spellCheck={false}
                  />
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-emerald-900/5 p-3">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Starting capital</p>
                  <p className="mt-2 text-sm font-semibold text-[#0f3224]">${STARTING_CAPITAL.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl bg-emerald-900/5 p-3">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Latest closes</p>
                  <p className="mt-2 text-sm font-semibold text-[#0f3224]">
                    {datasetForCharts && datasetForCharts.length > 0
                      ? datasetForCharts
                          .slice(-3)
                          .map((bar) => `$${bar.close.toFixed(2)}`)
                          .join(' · ')
                      : 'Load data to preview prices.'}
                  </p>
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

            <EditorRunnerPanel
              status={editorBacktestStatus}
              onRun={runEditorStrategy}
              onStop={stopEditorRun}
              progress={editorProgress}
              metrics={editorBacktestResults?.metrics}
              logs={editorLogs}
              onResetLogs={() => setEditorLogs([])}
              error={editorError}
            />
          </div>

          <div className="space-y-6">
            <DataSidePanel
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
              dataset={marketData}
            />

            <EditorParameterPanel
              params={editorParams}
              onChange={handleEditorParamChange}
              onPresetSelect={handlePresetSelect}
              activePreset={activeTemplate}
              gridSearchEnabled={gridSearchEnabled}
              onToggleGridSearch={setGridSearchEnabled}
            />

            <UnitTestsPanel results={editorBacktestResults} />
            <DocsPanel source={marketMetadata.source} />
          </div>
        </div>
      </section>

      <div id="live" ref={liveSectionRef}>
        <LiveMarketChart dataset={datasetForCharts} status={marketDataStatus} symbol={marketMetadata.symbol} timeframe={marketMetadata.timeframe} />
      </div>

      <section id="strategy" ref={strategySectionRef} className="space-y-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-700/80">Strategy tester</span>
            <h2 className="mt-3 font-ruigslay text-[clamp(3rem,7vw,5rem)] text-[#0f3224]">Parameter lab</h2>
            <p className="mt-3 max-w-2xl font-bricolage text-sm leading-relaxed text-[#0f3224]/75">
              Adjust beginner-friendly parameters, drop logic blocks, and inspect the auto-generated code before you export back to the editor.
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

        <StrategyBlocksCanvas activeTemplate={activeTemplate} />

        <BacktestMetrics metrics={testerResults?.metrics} status={testerStatus} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <TradesTable trades={testerResults?.trades} />
          <EquitySparkline equityCurve={testerResults?.equityCurve} />
        </div>

        <BacktestResearchPanel />
      </section>

      <section id="paper" ref={paperSectionRef} className="space-y-10">
        <PaperTradingDashboard
          strategyId={activeTemplate}
          defaultSymbol={symbol}
          metrics={testerMetrics || editorBacktestResults?.metrics}
          orders={orders}
          onSubmitOrder={handleSubmitOrder}
          onCancelOrder={handleCancelOrder}
          onCancelTarget={handleCancelTarget}
          submitting={orderSubmitting}
          cancelingId={cancelingId}
          performance={paperPerformance}
          history={paperHistory}
          watchlist={watchlist}
          onWatchlistToggle={handleWatchlistToggle}
        />
      </section>
    </div>
  );
}
