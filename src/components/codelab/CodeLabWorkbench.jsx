'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { DEFAULT_STRATEGY_CODE, STRATEGY_TEMPLATES, STARTING_CAPITAL, runBacktest } from '../../lib/backtester';
import loadMonaco from '../../lib/monacoLoader';

const templateList = Object.values(STRATEGY_TEMPLATES);

function StrategyLibrary({ onSelect, activeId }) {
  return (
    <div className="rounded-3xl border border-emerald-500/20 bg-white/70 p-6 shadow-[0_18px_38px_rgba(12,38,26,0.12)] backdrop-blur">
      <h3 className="font-bricolage text-lg font-semibold text-[#0f3224]">Starter strategies</h3>
      <p className="mt-2 text-sm font-bricolage text-[#0f3224]/75">
        Load a template to tweak parameters or build on top of the existing logic. Each script uses the helper utilities exposed
        in the editor.
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
                  : 'border-emerald-500/20 bg-white/80 text-[#0f3224] hover:border-emerald-500/50 hover:bg-emerald-50/70'
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

function TradesTable({ trades }) {
  if (!trades || trades.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-emerald-500/30 bg-white/60 p-6 text-center text-sm font-bricolage text-[#0f3224]/70">
        Run a backtest to populate trade history.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-emerald-500/20 bg-white/90 shadow-[0_24px_52px_rgba(12,38,26,0.1)]">
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
            <tr key={`${trade.entryDate}-${index}`} className="bg-white/60">
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
  );
}

function MetricsPanel({ metrics, status }) {
  const items = [
    { label: 'Ending Equity', value: metrics ? `$${metrics.endingCapital.toFixed(2)}` : '—' },
    { label: 'Total Return', value: metrics ? `${metrics.totalReturn.toFixed(2)}%` : '—' },
    { label: 'Trades', value: metrics ? metrics.totalTrades : '—' },
    { label: 'Win Rate', value: metrics ? `${metrics.winRate.toFixed(2)}%` : '—' },
    { label: 'Avg Trade', value: metrics ? `${metrics.averageReturn.toFixed(2)}%` : '—' },
    { label: 'Max Drawdown', value: metrics ? `${metrics.maxDrawdown.toFixed(2)}%` : '—' }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-white/80 via-white to-emerald-50/50 px-6 py-5 text-sm font-bricolage text-[#0f3224] shadow-[0_22px_44px_rgba(12,38,26,0.08)]"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">{item.label}</span>
          <span className="mt-3 block text-2xl font-semibold tracking-tight">
            {status === 'running' ? 'Calculating…' : item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function EquitySparkline({ equityCurve }) {
  const points = equityCurve?.slice(-60) ?? [];
  if (points.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-3xl border border-dashed border-emerald-500/30 bg-white/60 text-sm font-bricolage text-[#0f3224]/70">
        Run a backtest to generate an equity curve.
      </div>
    );
  }

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const normalized = values.map((value) => ((value - min) / (max - min || 1)) * 100);

  return (
    <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-white via-emerald-50/40 to-emerald-100/40 p-4 shadow-[0_18px_36px_rgba(12,38,26,0.08)]">
      <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Equity Curve (last 60 bars)</span>
      <div className="mt-3 h-32 w-full rounded-2xl bg-[#0b2217] p-4">
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

function TradingForm({ strategyId }) {
  const [form, setForm] = useState({ symbol: 'AAPL', side: 'buy', quantity: 1 });
  const [status, setStatus] = useState('idle');
  const [response, setResponse] = useState(null);

  const submitOrder = async (event) => {
    event.preventDefault();
    setStatus('submitting');
    setResponse(null);

    try {
      const res = await fetch('/api/trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, quantity: Number(form.quantity), strategyId })
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Request failed.');
      }

      setResponse(payload);
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setResponse({ error: error.message });
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="rounded-3xl border border-emerald-500/20 bg-white/80 p-6 shadow-[0_18px_36px_rgba(12,38,26,0.1)]">
      <h3 className="font-bricolage text-lg font-semibold text-[#0f3224]">Paper trading API</h3>
      <p className="mt-2 text-sm font-bricolage text-[#0f3224]/75">
        Send a simulated order into the paper desk. Orders fill instantly using the sample feed so you can validate routing from
        your strategies.
      </p>

      <form className="mt-4 space-y-4" onSubmit={submitOrder}>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col text-sm font-bricolage text-[#0f3224]">
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Symbol</span>
            <input
              required
              name="symbol"
              value={form.symbol}
              onChange={handleChange}
              className="mt-2 rounded-xl border border-emerald-500/30 bg-white px-3 py-2 text-sm text-[#0f3224] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </label>
          <label className="flex flex-col text-sm font-bricolage text-[#0f3224]">
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-900/60">Side</span>
            <select
              name="side"
              value={form.side}
              onChange={handleChange}
              className="mt-2 rounded-xl border border-emerald-500/30 bg-white px-3 py-2 text-sm text-[#0f3224] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
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
              className="mt-2 rounded-xl border border-emerald-500/30 bg-white px-3 py-2 text-sm text-[#0f3224] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="cta-primary w-full justify-center py-3 text-base tracking-[-0.03em] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'submitting' ? 'Routing order…' : 'Send to paper desk'}
        </button>
      </form>

      {response && (
        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-bricolage ${response.error ? 'border-rose-400/60 bg-rose-50 text-rose-700' : 'border-emerald-500/40 bg-emerald-50/80 text-emerald-900'}`}>
          {response.error ? (
            <span>{response.error}</span>
          ) : (
            <div className="space-y-1">
              <p className="font-semibold">Order #{response.orderId}</p>
              <p>Status: {response.status}</p>
              <p>
                Filled {response.filledQuantity} @ ${response.averagePrice.toFixed(2)} on {new Date(response.submittedAt).toLocaleString()}
              </p>
              {response.strategyId && <p>Strategy tag: {response.strategyId}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CodeLabWorkbench() {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const [monacoStatus, setMonacoStatus] = useState('loading');
  const [loadError, setLoadError] = useState(null);
  const [code, setCode] = useState(DEFAULT_STRATEGY_CODE);
  const [activeTemplate, setActiveTemplate] = useState(STRATEGY_TEMPLATES.momentumPulse.id);
  const [backtestStatus, setBacktestStatus] = useState('idle');
  const [backtestResults, setBacktestResults] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

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
          value: code,
          language: 'javascript',
          theme: 'algoteen-dark',
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 14,
          lineHeight: 22,
          fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, SFMono, Menlo, Monaco, Consolas'
        });

        editorRef.current.onDidChangeModelContent(() => {
          setCode(editorRef.current.getValue());
        });

        setMonacoStatus('ready');
      })
      .catch((error) => {
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

  const handleTemplateSelect = (template) => {
    setActiveTemplate(template.id);
    setCode(template.code);
    if (editorRef.current) {
      editorRef.current.setValue(template.code);
      editorRef.current.focus();
    }
  };

  const runStrategy = () => {
    setBacktestStatus('running');
    setErrorMessage(null);

    try {
      const results = runBacktest(code, { initialCapital: STARTING_CAPITAL });
      setBacktestResults(results);
      setBacktestStatus('success');
    } catch (error) {
      setBacktestStatus('error');
      setErrorMessage(error.message);
    }
  };

  const resetCode = () => {
    const template = STRATEGY_TEMPLATES[activeTemplate] || STRATEGY_TEMPLATES.momentumPulse;
    setCode(template.code);
    if (editorRef.current) {
      editorRef.current.setValue(template.code);
      editorRef.current.focus();
    }
  };

  const datasetPreview = useMemo(() => {
    if (!backtestResults?.dataset) {
      return null;
    }

    const sample = backtestResults.dataset.slice(-5);
    return sample.map((bar) => `${bar.date}: ${bar.close.toFixed(2)}`).join(' · ');
  }, [backtestResults]);

  return (
    <div className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-3xl border border-emerald-500/20 bg-white/80 p-6 shadow-[0_28px_64px_rgba(12,38,26,0.12)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-bricolage text-lg font-semibold text-[#0f3224]">Strategy editor</h3>
              <p className="text-sm font-bricolage text-[#0f3224]/70">
                Write JavaScript that returns trade signals through <code className="rounded bg-emerald-100/80 px-1">{'{ action }'}</code> objects.
                Helpers for EMA, SMA, RSI, and range scans are already imported.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetCode}
                className="rounded-xl border border-emerald-500/30 px-4 py-2 text-sm font-bricolage text-[#0f3224] transition hover:border-emerald-500/60 hover:bg-emerald-50/70"
              >
                Reset script
              </button>
              <button
                type="button"
                onClick={runStrategy}
                className="cta-primary px-5 py-2 text-sm tracking-[-0.03em]"
                disabled={backtestStatus === 'running'}
              >
                {backtestStatus === 'running' ? 'Running…' : 'Run backtest'}
              </button>
            </div>
          </div>

          <div className="mt-4 h-[380px] overflow-hidden rounded-2xl border border-emerald-500/20 bg-[#07110c]">
            {monacoStatus === 'ready' ? (
              <div ref={containerRef} className="h-full w-full" />
            ) : (
              <textarea
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="h-full w-full resize-none bg-[#07110c] p-4 font-mono text-sm text-emerald-50 outline-none"
                spellCheck={false}
              />
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs font-bricolage text-[#0f3224]/70">
            <span>Starting capital: ${STARTING_CAPITAL.toLocaleString()}</span>
            {datasetPreview && <span>Latest closes · {datasetPreview}</span>}
            {monacoStatus === 'loading' && <span>Loading Monaco editor…</span>}
            {monacoStatus === 'unavailable' && (
              <span className="text-emerald-700/80">Using basic text editor fallback.</span>
            )}
          </div>

          {(errorMessage || loadError) && (
            <div className="mt-4 rounded-2xl border border-rose-400/50 bg-rose-50/80 px-4 py-3 text-sm font-bricolage text-rose-700">
              {errorMessage || loadError}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <StrategyLibrary onSelect={handleTemplateSelect} activeId={activeTemplate} />
          <TradingForm strategyId={activeTemplate} />
        </div>
      </div>

      <MetricsPanel metrics={backtestResults?.metrics} status={backtestStatus} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <TradesTable trades={backtestResults?.trades} />
        <EquitySparkline equityCurve={backtestResults?.equityCurve} />
      </div>
    </div>
  );
}
