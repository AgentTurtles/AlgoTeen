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

const PARAMETER_FIELDS = [
  {
    key: 'fastLength',
    label: 'Fast EMA length',
    description: 'Controls how quickly the strategy reacts to new trends.',
    min: 4,
    max: 48,
    step: 1,
    defaultValue: 8,
    type: 'range',
    suffix: 'bars'
  },
  {
    key: 'slowLength',
    label: 'Slow EMA length',
    description: 'Long-term trend confirmation to avoid chop.',
    min: 10,
    max: 120,
    step: 1,
    defaultValue: 21,
    type: 'range',
    suffix: 'bars'
  },
  {
    key: 'exitRsi',
    label: 'RSI exit threshold',
    description: 'Exit once momentum is overbought and cooling off.',
    min: 55,
    max: 90,
    step: 1,
    defaultValue: 68,
    type: 'range'
  },
  {
    key: 'stopLoss',
    label: 'Stop loss (%)',
    description: 'Capital at risk per trade before forcing an exit.',
    min: 1,
    max: 15,
    step: 0.5,
    defaultValue: 3,
    type: 'number',
    suffix: '%'
  },
  {
    key: 'takeProfit',
    label: 'Take profit (%)',
    description: 'Lock gains after a strong move in your favour.',
    min: 2,
    max: 30,
    step: 0.5,
    defaultValue: 6,
    type: 'number',
    suffix: '%'
  },
  {
    key: 'positionSize',
    label: 'Position size',
    description: 'Units per order. Switch to risk-based sizing in controls.',
    min: 1,
    max: 50,
    step: 1,
    defaultValue: 1,
    type: 'number'
  }
];

const PARAMETER_PRESETS = [
  {
    id: 'conservative',
    name: 'Conservative',
    description: 'Longer trends with tight risk.',
    values: { fastLength: 12, slowLength: 34, exitRsi: 62, stopLoss: 2.5, takeProfit: 4, positionSize: 1 }
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Default crossover mix for most markets.',
    values: { fastLength: 8, slowLength: 21, exitRsi: 68, stopLoss: 3, takeProfit: 6, positionSize: 1 }
  },
  {
    id: 'aggro',
    name: 'Aggro',
    description: 'Fast reactions, wider targets for volatile assets.',
    values: { fastLength: 5, slowLength: 13, exitRsi: 72, stopLoss: 4.5, takeProfit: 9, positionSize: 2 }
  }
];

const LOG_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'warn', label: 'Warnings' },
  { id: 'error', label: 'Errors' },
  { id: 'trades', label: 'Trades' }
];

const QUICK_RANGES = [
  { id: '1D', label: '1D', days: 1 },
  { id: '1W', label: '1W', days: 7 },
  { id: '1M', label: '1M', days: 30 },
  { id: '1Y', label: '1Y', days: 365 }
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

const DOCS_SECTIONS = [
  {
    id: 'helpers',
    title: 'Indicator helpers',
    items: [
      {
        term: 'ema(data, index, length)',
        description: 'Returns an exponential moving average. Length must be greater than 0.',
        example: 'const fast = helpers.ema(data, index, 8);'
      },
      {
        term: 'rsi(data, index, length)',
        description: 'Calculates the RSI value using closing prices.',
        example: 'const rsi = helpers.rsi(data, index, 14);'
      },
      {
        term: 'highest(data, index, length, accessor)',
        description: 'Finds the highest value for a window. Accessor defaults to high.',
        example: 'const breakout = helpers.highest(data, index, 30, bar => bar.close);'
      }
    ]
  },
  {
    id: 'actions',
    title: 'Strategy actions',
    items: [
      {
        term: `return { action: 'buy', size, note }`,
        description: 'Open a long position. Size defaults to 1 if omitted.',
        example: `return { action: 'buy', size: 2, note: 'Momentum spike' };`
      },
      {
        term: `return { action: 'exit' }`,
        description: 'Close an open position. Works for both buy and sell positions.',
        example: `return { action: 'exit', note: 'RSI cooled off' };`
      }
    ]
  }
];

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function formatCurrency(value) {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatDuration(ms) {
  if (ms === null || ms === undefined) {
    return '—';
  }
  if (ms <= 0) {
    return 'Done';
  }
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
}

function formatDateInput(date) {
  if (!date) {
    return '';
  }
  return new Date(date).toISOString().slice(0, 10);
}

function parseDateInput(value) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function ScrollShadowContainer({ children, className }) {
  const containerRef = useRef(null);
  const [hasTopShadow, setHasTopShadow] = useState(false);
  const [hasBottomShadow, setHasBottomShadow] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return undefined;
    }

    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = node;
      setHasTopShadow(scrollTop > 0);
      setHasBottomShadow(scrollTop + clientHeight < scrollHeight - 1);
    };

    update();
    node.addEventListener('scroll', update);
    return () => node.removeEventListener('scroll', update);
  }, []);

  return (
    <div className={cx('relative', className)}>
      <div
        className={cx(
          'pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-white to-transparent transition-opacity',
          hasTopShadow ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden="true"
      />
      <div
        className={cx(
          'pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white to-transparent transition-opacity',
          hasBottomShadow ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden="true"
      />
      <div ref={containerRef} className="max-h-[calc(100vh-7rem)] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

function MetricTile({ label, value, delta }) {
  const deltaValue = Number.isFinite(delta) ? delta : null;
  const deltaPositive = deltaValue !== null && deltaValue >= 0;

  return (
    <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-emerald-950">{value}</p>
      {deltaValue !== null ? (
        <p
          className={cx(
            'mt-1 flex items-center gap-1 text-sm font-medium',
            deltaPositive ? 'text-emerald-600' : 'text-rose-600'
          )}
        >
          <span aria-hidden="true">{deltaPositive ? '▲' : '▼'}</span>
          <span>{`${deltaPositive ? '+' : ''}${deltaValue.toFixed(2)} pts vs last`}</span>
        </p>
      ) : null}
    </div>
  );
}

function MetricsHeader({ metrics, previousMetrics }) {
  const metricItems = useMemo(() => {
    if (!metrics) {
      return null;
    }

    const mapDelta = (key) => {
      if (!previousMetrics) {
        return null;
      }
      const previous = previousMetrics[key];
      if (!Number.isFinite(previous)) {
        return null;
      }
      return metrics[key] - previous;
    };

    return [
      { key: 'totalReturn', label: 'Total return', formatter: formatPercent },
      { key: 'cagr', label: 'CAGR', formatter: formatPercent },
      { key: 'maxDrawdown', label: 'Max drawdown', formatter: formatPercent },
      { key: 'sharpe', label: 'Sharpe', formatter: (value) => (Number.isFinite(value) ? value.toFixed(2) : '—') },
      { key: 'winRate', label: 'Win rate', formatter: formatPercent },
      { key: 'totalTrades', label: 'Trades', formatter: (value) => (Number.isFinite(value) ? value : '—') },
      { key: 'avgHoldDays', label: 'Avg hold', formatter: (value) => (Number.isFinite(value) ? `${value.toFixed(1)}d` : '—') },
      { key: 'exposure', label: 'Exposure', formatter: formatPercent }
    ].map((item) => ({
      ...item,
      value: item.formatter(metrics[item.key]),
      delta: mapDelta(item.key)
    }));
  }, [metrics, previousMetrics]);

  if (!metricItems) {
    return null;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metricItems.map((item) => (
        <MetricTile key={item.key} label={item.label} value={item.value} delta={item.delta} />
      ))}
    </div>
  );
}

function ParameterRow({ field, value, onChange }) {
  const id = `${field.key}-input`;
  const handleSliderChange = (event) => {
    const next = Number(event.target.value);
    onChange(field.key, next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <label htmlFor={id} className="block text-sm font-semibold text-emerald-950">
            {field.label}
          </label>
          <p className="mt-1 text-sm text-emerald-900/70">{field.description}</p>
        </div>
        <button
          type="button"
          title={field.description}
          className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-200 text-xs font-semibold text-emerald-700"
          aria-label={`Help for ${field.label}`}
        >
          ?
        </button>
      </div>
      {field.type === 'range' ? (
        <div className="space-y-2">
          <input
            id={id}
            type="range"
            min={field.min}
            max={field.max}
            step={field.step}
            value={value}
            onChange={handleSliderChange}
            className="w-full accent-emerald-600"
          />
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={field.min}
              max={field.max}
              step={field.step}
              value={value}
              onChange={handleSliderChange}
              className="w-24 rounded-lg border border-emerald-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <span className="text-sm text-emerald-900/70">{field.suffix ?? ''}</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <input
            id={id}
            type="number"
            min={field.min}
            max={field.max}
            step={field.step}
            value={value}
            onChange={handleSliderChange}
            className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
          <span className="text-sm text-emerald-900/70">{field.suffix ?? ''}</span>
        </div>
      )}
    </div>
  );
}

function RunHistorySelector({ runs, activeRunId, onSelect }) {
  if (runs.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {runs.map((run) => (
        <button
          key={run.id}
          type="button"
          onClick={() => onSelect(run.id)}
          className={cx(
            'rounded-lg border px-3 py-1.5 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
            activeRunId === run.id
              ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
              : 'border-emerald-200 bg-white text-emerald-900 hover:border-emerald-400'
          )}
        >
          <span className="font-medium">{run.label}</span>
          <span className="ml-2 text-xs text-emerald-900/70">{run.durationLabel}</span>
        </button>
      ))}
    </div>
  );
}

function ConsolePane({ runs, activeRunId, onSelectRun, filter, onFilterChange }) {
  const activeRun = runs.find((run) => run.id === activeRunId) ?? runs[runs.length - 1];
  const logItems = useMemo(() => {
    if (!activeRun) {
      return [];
    }
    if (filter === 'all') {
      return activeRun.logs;
    }
    if (filter === 'trades') {
      return activeRun.logs.filter((log) => log.tag === 'trade');
    }
    return activeRun.logs.filter((log) => log.level === filter);
  }, [activeRun, filter]);

  return (
    <div className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70">Console</p>
          <p className="text-base text-emerald-900/70">Runtime output persists per run with timestamps.</p>
        </div>
        <RunHistorySelector runs={runs} activeRunId={activeRunId} onSelect={onSelectRun} />
      </div>

      <div className="mt-4 flex items-center gap-2">
        {LOG_FILTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onFilterChange(option.id)}
            className={cx(
              'rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition',
              filter === option.id
                ? 'border-emerald-500 bg-emerald-600 text-white'
                : 'border-emerald-200 bg-white text-emerald-900 hover:border-emerald-400'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-4 max-h-64 overflow-y-auto rounded-lg border border-emerald-100 bg-[#04170d] p-4 font-mono text-[14px] leading-relaxed text-emerald-100">
        {logItems.length === 0 ? (
          <p className="font-sans text-sm text-emerald-100/70">No log entries yet. Run a backtest to populate output.</p>
        ) : (
          <ul className="space-y-3">
            {logItems.map((log) => (
              <li key={log.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-emerald-200/70">
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span>{log.level.toUpperCase()}</span>
                </div>
                <pre className="whitespace-pre-wrap text-left text-[13px] leading-snug">{log.message}</pre>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function UnitTestsPanel({ results, onRunTests, running }) {
  const tests = [
    {
      id: 'strategy-export',
      label: 'strategy() exported',
      passed: Boolean(results)
    },
    {
      id: 'at-least-one-trade',
      label: 'At least one trade',
      passed: (results?.trades?.length ?? 0) > 0
    },
    {
      id: 'non-zero-return',
      label: 'Non-zero total return',
      passed: results ? results.metrics.totalReturn !== 0 : false
    }
  ];

  return (
    <div className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70">Unit tests</p>
          <p className="text-base text-emerald-900/70">Run targeted checks before you launch a full backtest.</p>
        </div>
        <button
          type="button"
          onClick={onRunTests}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-900 transition hover:border-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {running ? 'Running…' : 'Run tests'}
        </button>
      </div>
      <ul className="mt-4 space-y-3">
        {tests.map((test) => (
          <li key={test.id} className="flex items-center justify-between rounded-lg border border-emerald-100 px-3 py-2">
            <span className="text-sm text-emerald-950">{test.label}</span>
            <span
              className={cx(
                'inline-flex min-w-[64px] items-center justify-center rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-[0.2em]',
                test.passed ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              )}
            >
              {test.passed ? 'PASS' : 'FAIL'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SignalCoveragePanel({ coverage, onHighlight }) {
  const uncoveredBranches = useMemo(() => {
    if (!coverage) {
      return [];
    }
    return Object.entries(coverage.actions)
      .filter(([, value]) => !value.hit)
      .map(([key]) => key);
  }, [coverage]);

  return (
    <div className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70">Signal coverage</p>
          <p className="text-base text-emerald-900/70">Compare touched branches and highlight gaps in the editor.</p>
        </div>
        <button
          type="button"
          onClick={onHighlight}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-900 transition hover:border-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          Highlight gaps
        </button>
      </div>
      {!coverage ? (
        <p className="mt-4 rounded-lg border border-dashed border-emerald-200 bg-emerald-50/40 px-4 py-3 text-sm text-emerald-900/70">
          Coverage unavailable — run once to generate metrics.
        </p>
      ) : (
        <div className="mt-4 space-y-4 text-sm text-emerald-950">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70">Bars processed</p>
              <p className="mt-1 text-lg font-semibold">{coverage.bars}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70">Signals triggered</p>
              <p className="mt-1 text-lg font-semibold">{coverage.signals}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70">Branches hit</p>
            <ul className="mt-2 space-y-2">
              {Object.entries(coverage.actions).map(([action, value]) => (
                <li key={action} className="flex items-center justify-between rounded-lg border border-emerald-100 px-3 py-2">
                  <span className="capitalize">{action}</span>
                  <span className={value.hit ? 'text-emerald-600' : 'text-rose-600'}>{value.hit ? 'Covered' : 'Missing'}</span>
                </li>
              ))}
            </ul>
          </div>
          {uncoveredBranches.length > 0 ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Missing branches: {uncoveredBranches.join(', ')}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function DocsDrawer({ query, onQueryChange }) {
  const filteredSections = useMemo(() => {
    const lower = query.trim().toLowerCase();
    return DOCS_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.term.toLowerCase().includes(lower) ||
          item.description.toLowerCase().includes(lower) ||
          item.example.toLowerCase().includes(lower)
      )
    })).filter((section) => section.items.length > 0);
  }, [query]);

  return (
    <div className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70">In-app reference</p>
      <p className="mt-2 text-base text-emerald-900/70">Search helpers, actions, and copy ready-made snippets.</p>
      <input
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search docs (Cmd/Ctrl + K)"
        data-docs-search="true"
        className="mt-4 w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
      />
      <div className="mt-4 space-y-4">
        {filteredSections.length === 0 ? (
          <p className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50/40 px-4 py-3 text-sm text-emerald-900/70">
            Nothing found. Try another keyword.
          </p>
        ) : (
          filteredSections.map((section) => (
            <div key={section.id} className="space-y-3">
              <h4 className="text-sm font-semibold text-emerald-950">{section.title}</h4>
              <ul className="space-y-3">
                {section.items.map((item) => (
                  <li key={item.term} className="space-y-2 rounded-lg border border-emerald-100 bg-emerald-50/30 px-3 py-3">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-[14px] text-emerald-950">{item.term}</p>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof navigator !== 'undefined' && navigator.clipboard) {
                            navigator.clipboard.writeText(item.example);
                          }
                        }}
                        className="rounded-md border border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-900 hover:border-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-sm text-emerald-900/70">{item.description}</p>
                    <pre className="rounded-md bg-[#04170d] px-3 py-2 font-mono text-[13px] text-emerald-100">{item.example}</pre>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EquityPreview({ equityCurve }) {
  if (!equityCurve || equityCurve.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 px-4 text-sm text-emerald-900/70">
        No backtest yet — run once to plot the equity curve.
      </div>
    );
  }

  const values = equityCurve.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = equityCurve.map((point, index) => {
    const x = (index / Math.max(1, equityCurve.length - 1)) * 100;
    const normalized = max === min ? 50 : ((point.value - min) / (max - min)) * 100;
    const y = 100 - normalized;
    return `${x},${y}`;
  });

  return (
    <div className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70">Equity & drawdown</p>
        <p className="text-base text-emerald-900/70">Quick glance sparkline for your last run.</p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-900 hover:border-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          View in chart
        </button>
      </div>
      <div className="mt-4 h-36 rounded-lg bg-[#04170d] p-4">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id="equityPreviewGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke="url(#equityPreviewGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            points={points.join(' ')}
          />
        </svg>
      </div>
    </div>
  );
}

function TradesDigest({ trades }) {
  const topTrades = (trades ?? []).slice(0, 5);
  if (topTrades.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 px-4 py-8 text-center text-sm text-emerald-900/70">
        No trades yet — run a backtest to populate trade notes.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {topTrades.map((trade, index) => (
        <div key={`${trade.entryDate}-${index}`} className="rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between text-sm text-emerald-900">
            <span className="font-medium">{trade.entryDate} → {trade.exitDate}</span>
            <span className={trade.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
              {formatCurrency(trade.profit)} ({trade.returnPct.toFixed(2)}%)
            </span>
          </div>
          <p className="mt-2 text-sm text-emerald-900/70">{trade.entryNote}</p>
          {trade.exitNote ? <p className="text-sm text-emerald-900/70">{trade.exitNote}</p> : null}
        </div>
      ))}
    </div>
  );
}

export default function CodeLabWorkbench() {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const uncoveredDecorationsRef = useRef([]);

  const [monacoStatus, setMonacoStatus] = useState('loading');
  const [loadError, setLoadError] = useState(null);

  const [editorCode, setEditorCode] = useState(DEFAULT_STRATEGY_CODE);
  const [activeTemplate, setActiveTemplate] = useState(templateList[0].id);

  const [parameters, setParameters] = useState(() => {
    const defaults = {};
    PARAMETER_FIELDS.forEach((field) => {
      defaults[field.key] = field.defaultValue;
    });
    return defaults;
  });
  const [activePreset, setActivePreset] = useState('balanced');

  const [assetClass, setAssetClass] = useState('stocks');
  const [symbol, setSymbol] = useState(ASSET_UNIVERSES.stocks.defaultSymbol);
  const [timeframe, setTimeframe] = useState(ASSET_UNIVERSES.stocks.defaultTimeframe);

  const [backtestRange, setBacktestRange] = useState({
    startDate: null,
    endDate: null,
    quickRange: '1M'
  });
  const [useExchangeFees, setUseExchangeFees] = useState(true);
  const [slippageBps, setSlippageBps] = useState(5);
  const [startingCapital, setStartingCapital] = useState(STARTING_CAPITAL);
  const [maxPositions, setMaxPositions] = useState(4);
  const [positionSizingMode, setPositionSizingMode] = useState('fixed');

  const [marketData, setMarketData] = useState([]);
  const [marketDataStatus, setMarketDataStatus] = useState('loading');
  const [marketDataError, setMarketDataError] = useState(null);
  const [marketMetadata, setMarketMetadata] = useState({ symbol: 'SPY', timeframe: '1Day', source: 'POLYGON' });
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const [editorBacktestStatus, setEditorBacktestStatus] = useState('idle');
  const [editorBacktestResults, setEditorBacktestResults] = useState(null);
  const [previousMetrics, setPreviousMetrics] = useState(null);
  const [editorError, setEditorError] = useState(null);
  const [editorProgress, setEditorProgress] = useState(0);
  const [etaMs, setEtaMs] = useState(null);

  const [runHistory, setRunHistory] = useState([]);
  const [activeRunId, setActiveRunId] = useState(null);
  const [consoleFilter, setConsoleFilter] = useState('all');

  const [docsQuery, setDocsQuery] = useState('');
  const [testsRunning, setTestsRunning] = useState(false);

  const runStartRef = useRef(null);
  const estimatedDurationRef = useRef(5000);

  const parameterSummary = useMemo(
    () => PARAMETER_FIELDS.map((field) => ({ label: field.label, value: parameters[field.key] })),
    [parameters]
  );

  const formattedLastSynced = useMemo(() => {
    if (!lastSyncedAt) {
      return '—';
    }

    const minutesAgo = Math.floor((Date.now() - lastSyncedAt.getTime()) / 60000);

    if (minutesAgo <= 0) {
      return 'just now';
    }

    if (minutesAgo < 60) {
      return `${minutesAgo} min ago`;
    }

    const hoursAgo = Math.floor(minutesAgo / 60);

    if (hoursAgo < 24) {
      return `${hoursAgo} hr${hoursAgo === 1 ? '' : 's'} ago`;
    }

    return `${lastSyncedAt.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    })} ${lastSyncedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }, [lastSyncedAt]);

  const universe = ASSET_UNIVERSES[assetClass];
  const symbols = universe?.symbols ?? [];
  const timeframes = universe?.timeframes ?? ['1Day'];

  const activeMetrics = editorBacktestResults?.metrics ?? null;
  const coverage = editorBacktestResults?.coverage ?? null;

  const handleParameterChange = useCallback((key, value) => {
    setParameters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handlePresetApply = (preset) => {
    setActivePreset(preset.id);
    setParameters(preset.values);
  };

  const handleRandomise = () => {
    setParameters((prev) => {
      const next = { ...prev };
      PARAMETER_FIELDS.forEach((field) => {
        const range = field.max - field.min;
        const random = field.min + Math.random() * range;
        const snapped = field.step ? Math.round(random / field.step) * field.step : random;
        next[field.key] = Number(snapped.toFixed(2));
      });
      return next;
    });
    setActivePreset(null);
  };

  const setQuickRange = (rangeId) => {
    const quick = QUICK_RANGES.find((item) => item.id === rangeId);
    if (!quick) {
      return;
    }
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - quick.days);
    setBacktestRange({ startDate: start, endDate: now, quickRange: rangeId });
  };

  const handleRangeChange = (type, value) => {
    setBacktestRange((prev) => ({
      ...prev,
      [type]: parseDateInput(value),
      quickRange: null
    }));
  };

  const loadBrokerageData = useCallback(async () => {
    setMarketDataStatus('loading');
    setMarketDataError(null);

    try {
      const params = new URLSearchParams({
        assetClass,
        symbol,
        timeframe,
        limit: '500'
      });
      // Add startDate and endDate if present
      if (backtestRange.startDate) {
        params.set('start', new Date(backtestRange.startDate).toISOString().slice(0, 10));
      }
      if (backtestRange.endDate) {
        params.set('end', new Date(backtestRange.endDate).toISOString().slice(0, 10));
      }

      const response = await fetch(`/api/market-data?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) {
        let message = `Unable to load brokerage data (status ${response.status}).`;
        try {
          const errorPayload = await response.json();
          if (errorPayload?.error) {
            message = errorPayload.error;
          }
        } catch (error) {
          // ignore parsing errors
        }
        throw new Error(message);
      }

      const payload = await response.json();
      const bars = Array.isArray(payload?.bars) ? payload.bars : [];
      const normalized = bars
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

      setMarketData(normalized);
      setMarketMetadata({
        symbol: payload?.symbol ?? symbol,
        timeframe: payload?.timeframe ?? timeframe,
        source: payload?.source ?? 'POLYGON'
      });
      setLastSyncedAt(new Date());
      setMarketDataStatus('ready');
    } catch (error) {
      setMarketDataStatus('error');
      setMarketDataError(error.message);
    }
  }, [assetClass, symbol, timeframe]);

  // Remove automatic fetch; only fetch when user clicks 'Load market data'.

  const pushLog = useCallback((runId, log) => {
    setRunHistory((previous) =>
      previous.map((run) =>
        run.id === runId
          ? {
              ...run,
              logs: [
                ...run.logs,
                {
                  ...log,
                  id: `${runId}-${run.logs.length}`
                }
              ]
            }
          : run
      )
    );
  }, []);

  const appendRun = useCallback((label) => {
    const id = `run-${Date.now()}`;
    const startedAt = new Date();
    setRunHistory((prev) => [
      ...prev,
      {
        id,
        label,
        startedAt,
        durationLabel: '—',
        logs: [],
        metrics: null
      }
    ]);
    setActiveRunId(id);
    return id;
  }, []);

  const updateRunSummary = useCallback((runId, payload) => {
    setRunHistory((prev) =>
      prev.map((run) =>
        run.id === runId
          ? {
              ...run,
              ...payload
            }
          : run
      )
    );
  }, []);

  const runEditorStrategy = useCallback(() => {
    if (editorBacktestStatus === 'running') {
      return;
    }

    if (!marketData || marketData.length === 0) {
      setEditorBacktestStatus('error');
      setEditorError('No data loaded — choose a symbol and fetch bars before running.');
      return;
    }

    const runId = appendRun(`${marketMetadata.symbol} · ${new Date().toLocaleTimeString()}`);

    setEditorBacktestStatus('running');
    setEditorError(null);
    setEditorProgress(6);
    setEtaMs(null);

    runStartRef.current = Date.now();
    estimatedDurationRef.current = Math.max(4000, marketData.length * 12);

    pushLog(runId, {
      timestamp: Date.now(),
      level: 'info',
      message: `Running backtest on ${marketMetadata.symbol} (${marketMetadata.timeframe}) with ${marketData.length} bars.`,
      tag: 'info'
    });

    window.requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          const results = runBacktest(editorCode, {
            initialCapital: startingCapital,
            dataset: marketData,
            timeframe
          });

          pushLog(runId, {
            timestamp: Date.now(),
            level: 'info',
            message: `Completed backtest · Total return ${results.metrics.totalReturn.toFixed(2)}% · Trades ${results.metrics.totalTrades}.`,
            tag: 'info'
          });

          results.trades.forEach((trade) => {
            pushLog(runId, {
              timestamp: Date.now(),
              level: trade.profit >= 0 ? 'info' : 'warn',
              tag: 'trade',
              message: `Trade ${trade.entryDate} → ${trade.exitDate} · ${formatCurrency(trade.profit)} (${trade.returnPct.toFixed(2)}%)`
            });
          });

          if (editorBacktestResults?.metrics) {
            setPreviousMetrics(editorBacktestResults.metrics);
          }

          setEditorBacktestResults({ ...results, runId });
          setEditorBacktestStatus('success');
          setEditorProgress(100);
          setEtaMs(0);

          updateRunSummary(runId, {
            metrics: results.metrics,
            durationLabel: `${((Date.now() - runStartRef.current) / 1000).toFixed(1)}s`
          });
        } catch (error) {
          setEditorBacktestStatus('error');
          setEditorError(error.message);
          setEditorProgress(0);
          pushLog(runId, {
            timestamp: Date.now(),
            level: 'error',
            message: error.message,
            tag: 'error'
          });
          updateRunSummary(runId, {
            durationLabel: `${((Date.now() - runStartRef.current) / 1000).toFixed(1)}s`
          });
        }
      }, 120);
    });
  }, [appendRun, editorBacktestResults?.metrics, editorBacktestStatus, editorCode, marketData, marketMetadata.symbol, marketMetadata.timeframe, pushLog, startingCapital, timeframe, updateRunSummary]);

  useEffect(() => {
    if (editorBacktestStatus !== 'running') {
      return undefined;
    }

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - (runStartRef.current ?? Date.now());
      const estimate = estimatedDurationRef.current ?? 5000;
      const nextProgress = Math.min(95, Math.max(10, (elapsed / estimate) * 95));
      setEditorProgress(nextProgress);
      setEtaMs(Math.max(0, estimate - elapsed));
    }, 200);

    return () => {
      window.clearInterval(interval);
    };
  }, [editorBacktestStatus]);

  return (
    <div className="space-y-10">
      {loadError ? (
        <div className="mx-auto w-full max-w-[min(96vw,600px)] rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {loadError}
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-[min(96vw,1280px)] space-y-10 px-4 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-emerald-100 bg-white/95 shadow-[0_30px_80px_rgba(12,38,26,0.12)]">
          <header className="flex flex-col gap-6 border-b border-emerald-100 bg-white/95 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-900/70">AlgoTeen Code Desk</p>
              <div className="flex flex-wrap items-center gap-2 text-sm text-emerald-900/70">
                <span>{marketMetadata.symbol}</span>
                <span aria-hidden="true">•</span>
                <span>{marketMetadata.timeframe}</span>
                <span aria-hidden="true">•</span>
                <span>Last sync {formattedLastSynced}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={resetCodeToPreset}
                className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-900 transition hover:border-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                Reset to template
              </button>
              <button
                type="button"
                onClick={runEditorStrategy}
                className={cx(
                  'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
                  editorBacktestStatus === 'running'
                    ? 'bg-emerald-400 hover:bg-emerald-500'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                )}
                disabled={editorBacktestStatus === 'running'}
              >
                {editorBacktestStatus === 'running' ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-r-transparent" aria-hidden="true" />
                    Running…
                  </>
                ) : (
                  'Run backtest'
                )}
              </button>
            </div>
          </header>

          <div className="border-b border-emerald-100 bg-emerald-50/60 px-6 py-4">
            <ol className="flex flex-wrap items-center gap-4 text-sm text-emerald-900/80">
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold text-emerald-700">1</span>
                <span>Load Polygon bars</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold text-emerald-700">2</span>
                <span>Tune strategy inputs</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold text-emerald-700">3</span>
                <span>Review metrics & iterate</span>
              </li>
            </ol>
          </div>

          <div className="grid gap-10 px-6 py-8 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {templateList.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleTemplateSelect(template)}
                    className={cx(
                      'rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
                      activeTemplate === template.id
                        ? 'border-emerald-500 bg-emerald-600 text-white'
                        : 'border-emerald-200 bg-white text-emerald-900 hover:border-emerald-400'
                    )}
                  >
                    {template.name}
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-[#04140c] p-4">
                <div ref={containerRef} className="w-full overflow-hidden rounded-lg border border-emerald-900/30 min-h-[360px] sm:min-h-[520px] md:min-h-[640px]">
                  {monacoStatus === 'ready' ? null : (
                    <textarea
                      value={editorCode}
                      onChange={(event) => setEditorCode(event.target.value)}
                      className="h-full w-full resize-none bg-[#04140c] p-4 font-mono text-[14px] text-emerald-100 focus:outline-none"
                    />
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-white px-4 py-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70">Progress</p>
                    <p className="text-sm text-emerald-900/70">{editorBacktestStatus === 'running' ? 'Crunching trades…' : 'Ready'}</p>
                  </div>
                  <div className="text-right text-sm text-emerald-900/70">
                    <p>ETA {formatDuration(etaMs)}</p>
                    <p>{editorProgress.toFixed(0)}%</p>
                  </div>
                </div>
                <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-emerald-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${editorProgress}%` }}
                  />
                </div>
                {editorError ? (
                  <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{editorError}</p>
                ) : null}
              </div>

              <MetricsHeader metrics={activeMetrics} previousMetrics={previousMetrics} />

              <div className="grid gap-6 lg:grid-cols-2">
                <EquityPreview equityCurve={editorBacktestResults?.equityCurve} />
                <div className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70">Trade digest</p>
                  <p className="text-base text-emerald-900/70">Recent trades sorted by execution order.</p>
                  <div className="mt-4">
                    <TradesDigest trades={editorBacktestResults?.trades} />
                  </div>
                </div>
              </div>

              <ConsolePane
                runs={runHistory}
                activeRunId={activeRunId}
                onSelectRun={setActiveRunId}
                filter={consoleFilter}
                onFilterChange={setConsoleFilter}
              />
            </div>

            <div id="strategy" className="space-y-6">
              <ScrollShadowContainer className="rounded-xl border border-emerald-100 bg-emerald-50/40">
                <div className="space-y-6 px-5 py-6">
                  <div className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70">Parameters</p>
                        <p className="text-base text-emerald-900/70">Start from a preset or tune each field. Changes apply instantly.</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {PARAMETER_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handlePresetApply(preset)}
                            className={cx(
                              'rounded-lg border px-3 py-2 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
                              activePreset === preset.id
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                                : 'border-emerald-200 bg-white text-emerald-900 hover:border-emerald-400'
                            )}
                          >
                            <span className="block font-semibold">{preset.name}</span>
                            <span className="block text-xs text-emerald-900/70">{preset.description}</span>
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleRandomise}
                        className="self-start rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-900 transition hover:border-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                      >
                        Randomize within bounds
                      </button>
                    </div>
                    <div className="mt-4 space-y-4">
                      {PARAMETER_FIELDS.map((field) => (
                        <ParameterRow
                          key={field.key}
                          field={field}
                          value={parameters[field.key]}
                          onChange={handleParameterChange}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70">Backtest controls</p>
                    <p className="text-base text-emerald-900/70">Choose the dataset, trading window, and execution assumptions.</p>
                    {marketDataStatus === 'ready' && marketData.length > 0 ? (
                      <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-900">
                        <p className="font-semibold">Loaded {marketData.length} bars via {(marketMetadata.source ?? 'Polygon').toString().toUpperCase()}.</p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-emerald-800/80">
                          {marketData[0].date} → {marketData[marketData.length - 1].date}
                        </p>
                      </div>
                    ) : null}
                    <div className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70">Date range</p>
                        <div className="flex flex-wrap gap-2">
                          {QUICK_RANGES.map((range) => (
                            <button
                              key={range.id}
                              type="button"
                              onClick={() => setQuickRange(range.id)}
                              className={cx(
                                'rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition',
                                backtestRange.quickRange === range.id
                                  ? 'border-emerald-500 bg-emerald-600 text-white'
                                  : 'border-emerald-200 bg-white text-emerald-900 hover:border-emerald-400'
                              )}
                            >
                              {range.label}
                            </button>
                          ))}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="flex flex-col gap-1 text-sm text-emerald-900">
                            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70">Start</span>
                            <input
                              type="date"
                              value={formatDateInput(backtestRange.startDate)}
                              onChange={(event) => handleRangeChange('startDate', event.target.value)}
                              className="rounded-lg border border-emerald-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-sm text-emerald-900">
                            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70">End</span>
                            <input
                              type="date"
                              value={formatDateInput(backtestRange.endDate)}
                              onChange={(event) => handleRangeChange('endDate', event.target.value)}
                              className="rounded-lg border border-emerald-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70">Universe</p>
                        <label className="flex flex-col gap-1 text-sm text-emerald-900">
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70">Asset class</span>
                          <select
                            value={assetClass}
                            onChange={(event) => {
                              const next = event.target.value;
                              const config = ASSET_UNIVERSES[next];
                              setAssetClass(next);
                              setSymbol(config.defaultSymbol);
                              setTimeframe(config.defaultTimeframe);
                            }}
                            className="rounded-lg border border-emerald-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                          >
                            {Object.entries(ASSET_UNIVERSES).map(([key, value]) => (
                              <option key={key} value={key}>
                                {value.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1 text-sm text-emerald-900">
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70">Symbol</span>
                          <select
                            value={symbol}
                            onChange={(event) => setSymbol(event.target.value)}
                            className="rounded-lg border border-emerald-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                          >
                            {symbols.map((option) => (
                              <option key={option.symbol} value={option.symbol}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1 text-sm text-emerald-900">
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70">Timeframe</span>
                          <select
                            value={timeframe}
                            onChange={(event) => setTimeframe(event.target.value)}
                            className="rounded-lg border border-emerald-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                          >
                            {timeframes.map((frame) => (
                              <option key={frame} value={frame}>
                                {frame}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70">Data</p>
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={loadMarketData}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                            disabled={marketDataStatus === 'loading'}
                          >
                            {marketDataStatus === 'loading' ? (
                              <>
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-r-transparent" aria-hidden="true" />
                                Loading…
                              </>
                            ) : (
                              'Load market data'
                            )}
                          </button>
                          <span className="text-xs text-emerald-900/70">Polygon.io data with smart defaults.</span>
                        </div>
                        {marketDataStatus === 'error' ? (
                          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{marketDataError}</p>
                        ) : null}
                      </div>

                      <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="flex flex-col gap-1 text-sm text-emerald-900">
                            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70">Fees / slippage (bps)</span>
                            <input
                              type="number"
                              value={slippageBps}
                              onChange={(event) => setSlippageBps(Number(event.target.value))}
                              className="rounded-lg border border-emerald-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            />
                          </label>
                          <label className="flex items-center gap-2 text-sm text-emerald-900">
                            <input
                              type="checkbox"
                              checked={useExchangeFees}
                              onChange={(event) => setUseExchangeFees(event.target.checked)}
                              className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            Use exchange defaults
                          </label>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="flex flex-col gap-1 text-sm text-emerald-900">
                            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70">Starting capital</span>
                            <input
                              type="number"
                              value={startingCapital}
                              onChange={(event) => setStartingCapital(Number(event.target.value))}
                              className="rounded-lg border border-emerald-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-sm text-emerald-900">
                            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70">Max concurrent positions</span>
                            <input
                              type="number"
                              value={maxPositions}
                              onChange={(event) => setMaxPositions(Number(event.target.value))}
                              className="rounded-lg border border-emerald-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            />
                          </label>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70">Sizing</p>
                          <div className="mt-2 inline-flex rounded-full border border-emerald-200 bg-white p-1">
                            {['fixed', 'risk-based'].map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => setPositionSizingMode(mode)}
                                className={cx(
                                  'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition',
                                  positionSizingMode === mode
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-emerald-900'
                                )}
                              >
                                {mode === 'fixed' ? 'Fixed' : 'Risk'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <UnitTestsPanel results={editorBacktestResults} onRunTests={runUnitTests} running={testsRunning} />

                  <SignalCoveragePanel coverage={coverage} onHighlight={highlightCoverage} />

                  <DocsDrawer query={docsQuery} onQueryChange={setDocsQuery} />
                </div>
              </ScrollShadowContainer>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-emerald-100 bg-white/95 p-6 shadow-[0_30px_80px_rgba(12,38,26,0.12)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-900/70">Quick summary</p>
              <h2 className="text-3xl font-semibold text-emerald-950">Session checklist</h2>
              <p className="mt-2 text-base text-emerald-900/70">
                Before running again: confirm presets, review coverage, and skim the log for warnings.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-900">
              {parameterSummary.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span>{item.label}</span>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

