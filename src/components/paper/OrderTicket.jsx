import { useMemo, useState } from 'react';

import { ORDER_TYPES } from './data';
import { formatCurrency, roundTo } from './utils';

function ToggleGroup({ label, value, onChange, options }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <div className="mt-2 flex gap-2">
        {options.map((option) => {
          const isActive = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                isActive
                  ? 'border-blue-700 bg-blue-700 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              {option.label ?? option.name}
            </button>
          );
        })}
      </div>
      {value && options.find((option) => option.id === value)?.description ? (
        <p className="mt-2 text-xs text-slate-500">
          {options.find((option) => option.id === value)?.description}
        </p>
      ) : null}
    </div>
  );
}

function QuantitySlider({ value, onChange, max }) {
  const capped = Math.max(1, max);
  return (
    <div>
      <label className="flex items-center justify-between text-sm font-medium text-slate-600">
        <span>Quantity</span>
        <span className="text-xs text-slate-500">{value} shares · {Math.round((value / capped) * 100)}% buying power</span>
      </label>
      <input
        type="range"
        min={1}
        max={capped}
        value={Math.min(value, capped)}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full"
      />
    </div>
  );
}

export default function OrderTicket({ data, draft, onDraftChange, onSubmit, disabled, account, bestPrice, reference }) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const estimatedCost = useMemo(() => {
    const entryPrice = draft.type === 'market' ? bestPrice : draft.limitPrice ?? bestPrice;
    return roundTo(entryPrice * draft.quantity, 2);
  }, [bestPrice, draft.limitPrice, draft.quantity, draft.type]);

  const estimatedFees = useMemo(() => roundTo(estimatedCost * 0.0005, 2), [estimatedCost]);

  const maxRisk = useMemo(() => {
    if (!draft.stopPrice) return null;
    const entry = draft.type === 'market' ? bestPrice : draft.limitPrice ?? bestPrice;
    const perShare = draft.side === 'buy' ? entry - draft.stopPrice : draft.stopPrice - entry;
    const risk = perShare * draft.quantity;
    if (!Number.isFinite(risk)) return null;
    return {
      amount: Math.abs(roundTo(risk, 2)),
      percent: account.equity ? Math.abs((risk / account.equity) * 100).toFixed(2) : null
    };
  }, [account.equity, bestPrice, draft.limitPrice, draft.quantity, draft.side, draft.stopPrice, draft.type]);

  const invalidReason = useMemo(() => {
    if (draft.quantity <= 0) return 'Quantity must be above zero.';
    if (draft.type === 'limit' && !draft.limitPrice) return 'Set a limit price or switch to market.';
    if (draft.type === 'stop' && !draft.stopTrigger) return 'Add a stop trigger for stop orders.';
    if (draft.side === 'sell') {
      const hasPosition = data.positions.some((pos) => pos.symbol === data.symbol);
      if (!hasPosition) {
        return 'You need an open position to sell. Shorting is disabled in this simulator.';
      }
    }
    const costWithFees = estimatedCost + estimatedFees;
    if (costWithFees > account.buyingPower) {
      return 'Order exceeds buying power. Reduce size or add funds.';
    }
    if (draft.reduceOnly) {
      const position = data.positions.find((pos) => pos.symbol === data.symbol);
      if (!position) return 'Reduce-only orders need an open position to offset.';
    }
    return null;
  }, [account.buyingPower, data.positions, data.symbol, draft.limitPrice, draft.quantity, draft.reduceOnly, draft.stopTrigger, draft.type, estimatedCost, estimatedFees]);

  const handleFieldChange = (field, value) => {
    onDraftChange({ ...draft, [field]: value });
  };

  const handleSubmit = () => {
    if (disabled || invalidReason) return;
    onSubmit({ ...draft, estimatedCost, estimatedFees });
  };

  return (
    <section ref={reference} className="relative rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-2 gap-6 px-6 py-6">
        <div className="space-y-4">
          <ToggleGroup label="Side" value={draft.side} onChange={(next) => handleFieldChange('side', next)} options={[{ id: 'buy', label: 'Buy' }, { id: 'sell', label: 'Sell' }]} />
          <ToggleGroup label="Order type" value={draft.type} onChange={(next) => handleFieldChange('type', next)} options={ORDER_TYPES} />
          <QuantitySlider value={draft.quantity} max={Math.max(1, Math.floor(account.buyingPower / Math.max(bestPrice, 1)))} onChange={(next) => handleFieldChange('quantity', next)} />
        </div>
        <div className="space-y-4">
          {draft.type !== 'market' ? (
            <div>
              <label className="text-sm font-medium text-slate-600" htmlFor="limitPrice">
                Limit price
              </label>
              <input
                id="limitPrice"
                type="number"
                step="0.01"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                value={draft.limitPrice ?? ''}
                onChange={(event) => handleFieldChange('limitPrice', Number(event.target.value))}
              />
              <p className="mt-1 text-xs text-slate-500">Price you are willing to pay or receive.</p>
            </div>
          ) : null}

          {draft.type === 'stop' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600" htmlFor="stopTrigger">
                  Stop trigger
                </label>
                <input
                  id="stopTrigger"
                  type="number"
                  step="0.01"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  value={draft.stopTrigger ?? ''}
                  onChange={(event) => handleFieldChange('stopTrigger', Number(event.target.value))}
                />
                <p className="mt-1 text-xs text-slate-500">Activates the order once touched.</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600" htmlFor="stopLimit">
                  Limit after trigger (optional)
                </label>
                <input
                  id="stopLimit"
                  type="number"
                  step="0.01"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  value={draft.stopLimit ?? ''}
                  onChange={(event) => handleFieldChange('stopLimit', Number(event.target.value))}
                />
                <p className="mt-1 text-xs text-slate-500">Use if you want to convert into a stop-limit.</p>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600" htmlFor="stopPrice">
                Attach stop loss
              </label>
              <input
                id="stopPrice"
                type="number"
                step="0.01"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                value={draft.stopPrice ?? ''}
                onChange={(event) => handleFieldChange('stopPrice', Number(event.target.value))}
                placeholder="Prefill from chart"
              />
              <p className="mt-1 text-xs text-slate-500">Drag the red ghost line on chart or type exact value.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600" htmlFor="targetPrice">
                Attach take profit
              </label>
              <input
                id="targetPrice"
                type="number"
                step="0.01"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                value={draft.targetPrice ?? ''}
                onChange={(event) => handleFieldChange('targetPrice', Number(event.target.value))}
                placeholder="Prefill from chart"
              />
              <p className="mt-1 text-xs text-slate-500">Drag the green ghost line to set a target zone.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 px-6 py-4 text-sm text-slate-600">
        <div className="flex flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Est. cost (fees in)</p>
            <p className="mt-1 font-semibold text-slate-900">{formatCurrency(estimatedCost + estimatedFees)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Buying power left</p>
            <p className="mt-1 font-semibold text-slate-900">{formatCurrency(account.buyingPower - (estimatedCost + estimatedFees))}</p>
          </div>
          {maxRisk ? (
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Risk if stopped</p>
              <p className="mt-1 font-semibold text-slate-900">{formatCurrency(maxRisk.amount)} · {maxRisk.percent}%</p>
            </div>
          ) : (
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Risk reminder</p>
              <p className="mt-1 text-slate-500">Attach a stop to see risk per trade.</p>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-500">Simulated execution may differ. We respect daily loss limits and disable trades when your risk exceeds the configured guardrail.</p>
      </div>

      <div className="border-t border-slate-200 px-6 py-4 text-sm">
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="text-sm font-medium text-blue-700"
        >
          {showAdvanced ? 'Hide advanced' : 'More options'}
        </button>
        {showAdvanced ? (
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-slate-600">
            <div>
              <label className="text-sm font-medium" htmlFor="timeInForce">
                Time in force
              </label>
              <select
                id="timeInForce"
                value={draft.timeInForce}
                onChange={(event) => handleFieldChange('timeInForce', event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              >
                <option value="day">Day</option>
                <option value="gtc">Good till cancel</option>
                <option value="ioc">Immediate or cancel</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium" htmlFor="bracket">
                <input
                  id="bracket"
                  type="checkbox"
                  checked={draft.bracket}
                  onChange={(event) => handleFieldChange('bracket', event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
                />
                Bracket with attached stop + target
              </label>
              <p className="mt-2 text-xs text-slate-500">When enabled we keep linked exits live even if you refresh.</p>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium" htmlFor="oco">
                <input
                  id="oco"
                  type="checkbox"
                  checked={draft.oco}
                  onChange={(event) => handleFieldChange('oco', event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
                />
                Enable OCO pair
              </label>
              <p className="mt-2 text-xs text-slate-500">Attach two orders where one cancels the other automatically.</p>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium" htmlFor="reduceOnly">
                <input
                  id="reduceOnly"
                  type="checkbox"
                  checked={draft.reduceOnly}
                  onChange={(event) => handleFieldChange('reduceOnly', event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
                />
                Reduce existing position only
              </label>
              <p className="mt-2 text-xs text-slate-500">We will block the order if it increases exposure.</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4">
        {invalidReason ? (
          <div className="mb-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <span>{invalidReason}</span>
            {invalidReason.includes('Reduce size') ? (
              <button
                type="button"
                className="font-semibold text-amber-900 underline"
                onClick={() => {
                  const maxShares = Math.floor(account.buyingPower / Math.max(bestPrice, 1));
                  onDraftChange({ ...draft, quantity: Math.max(1, maxShares) });
                }}
              >
                Reduce to max allowed
              </button>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || Boolean(invalidReason)}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-semibold text-white shadow transition ${
            disabled || invalidReason ? 'cursor-not-allowed bg-slate-400' : 'bg-blue-700 hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500'
          }`}
        >
          <span>{disabled ? 'Running…' : 'Place order'}</span>
        </button>
      </div>
    </section>
  );
}
