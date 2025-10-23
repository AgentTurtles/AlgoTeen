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
              className={`rounded-full border px-3 py-1 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                isActive
                  ? 'border-emerald-600 bg-emerald-600 text-white'
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

function QuantityControls({
  mode,
  quantity,
  lots,
  lotSize,
  maxShares,
  maxLots,
  onModeChange,
  onQuantityChange
}) {
  const sliderMax = mode === 'lots' ? Math.max(0.01, maxLots) : Math.max(0.01, maxShares);
  const sliderValue = mode === 'lots' ? lots : quantity;
  const percentOfBuyingPower = maxShares
    ? Math.min(100, Math.round(((quantity || 0) / maxShares) * 100))
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-sm font-medium text-slate-600">
        <span>Quantity</span>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{quantity} shares</span>
          <span>·</span>
          <span>{lots} lots</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
            {percentOfBuyingPower}% buying power
          </span>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onModeChange('shares')}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
            mode === 'shares'
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
          }`}
        >
          Shares
        </button>
        <button
          type="button"
          onClick={() => onModeChange('lots')}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
            mode === 'lots'
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
          }`}
        >
          Lots
        </button>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <input
          type="range"
          min={0.01}
          max={sliderMax}
          step={0.01}
          value={sliderValue}
          onChange={(event) => onQuantityChange(Number.parseFloat(event.target.value), mode)}
          className="flex-1"
        />
        <button
          type="button"
          onClick={() => onQuantityChange(sliderMax, mode)}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900"
        >
          Max
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400" htmlFor="ticket-shares">
            Shares
          </label>
          <input
            id="ticket-shares"
            type="number"
            min={0.01}
            step={0.01}
            value={quantity}
            onChange={(event) => onQuantityChange(Number.parseFloat(event.target.value), 'shares')}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400" htmlFor="ticket-lots">
            Lots
          </label>
          <input
            id="ticket-lots"
            type="number"
            min={0.01}
            step={0.01}
            value={lots}
            onChange={(event) => onQuantityChange(Number.parseFloat(event.target.value), 'lots')}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">Lot size {lotSize} shares.</p>
    </div>
  );
}
export default function OrderTicket({
  data,
  draft,
  onDraftChange,
  onSubmit,
  disabled,
  account,
  bestPrice,
  reference,
  lotSize
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const normalizedLots = draft.quantityMode === 'lots'
    ? Math.max(0.01, Number.parseFloat(draft.lots ?? 0) || 0)
    : Math.max(0.01, (Number.parseFloat(draft.quantity ?? 0) || 0) / lotSize);
  const normalizedShares = draft.quantityMode === 'lots'
    ? roundTo(normalizedLots * lotSize, 4)
    : Math.max(0.01, Number.parseFloat(draft.quantity ?? 0) || 0);

  const effectiveQuantity = normalizedShares;
  const maxShares = Math.max(0.01, account.buyingPower / Math.max(bestPrice || 0.01, 0.01));
  const maxLots = Math.max(0.01, maxShares / lotSize);

  const basePrice = draft.type === 'market' ? bestPrice : draft.limitPrice ?? bestPrice;
  const fillPriceEstimate = roundTo(basePrice, 2);
  const estimatedCost = roundTo(fillPriceEstimate * effectiveQuantity, 2);
  const estimatedFees = roundTo(estimatedCost * 0.0005, 2);
  const costWithFees = estimatedCost + estimatedFees;
  const buyingPowerLeft = roundTo(account.buyingPower - costWithFees, 2);

  const entryPrice = draft.type === 'market' ? fillPriceEstimate : draft.limitPrice ?? fillPriceEstimate;
  const riskPerShare = draft.stopPrice != null ? Math.abs(entryPrice - draft.stopPrice) : null;
  const rewardPerShare = draft.targetPrice != null ? Math.abs(draft.targetPrice - entryPrice) : null;
  const riskAmount = riskPerShare != null ? roundTo(riskPerShare * effectiveQuantity, 2) : null;
  const riskPercent = riskAmount != null && account.equity ? ((riskAmount / account.equity) * 100).toFixed(2) : null;
  const rMultiple = riskPerShare && rewardPerShare && riskPerShare !== 0 ? rewardPerShare / riskPerShare : null;

  const invalidReason = useMemo(() => {
    if (effectiveQuantity <= 0) return 'Quantity must be above zero.';
    if (draft.type === 'limit' && !draft.limitPrice) return 'Set a limit price or switch to market.';
    if (draft.type === 'stop' && !draft.stopTrigger) return 'Add a stop trigger for stop orders.';
    const entryCheck = draft.type === 'market' ? bestPrice : draft.limitPrice ?? bestPrice;
    if (draft.stopPrice != null) {
      if (draft.side === 'buy' && draft.stopPrice >= entryCheck) {
        return 'Stop loss must stay below entry for buys.';
      }
      if (draft.side === 'sell' && draft.stopPrice <= entryCheck) {
        return 'Stop loss must stay above entry for sells.';
      }
    }
    if (draft.targetPrice != null) {
      if (draft.side === 'buy' && draft.targetPrice <= entryCheck) {
        return 'Targets for buys should sit above entry.';
      }
      if (draft.side === 'sell' && draft.targetPrice >= entryCheck) {
        return 'Targets for sells should sit below entry.';
      }
    }
    if (costWithFees > account.buyingPower) {
      return 'Order exceeds buying power. Reduce size or add funds.';
    }
    if (draft.reduceOnly) {
      const position = data.positions.find((pos) => pos.symbol === data.symbol);
      if (!position) return 'Reduce-only orders need an open position to offset.';
    }
    return null;
  }, [
    account.buyingPower,
    costWithFees,
    data.positions,
    data.symbol,
    draft.limitPrice,
    draft.reduceOnly,
    draft.side,
    draft.stopPrice,
    draft.stopTrigger,
    draft.targetPrice,
    draft.type,
    effectiveQuantity,
    bestPrice
  ]);

  const handleModeChange = (mode) => {
    if (mode === draft.quantityMode) return;
    if (mode === 'lots') {
      const nextLots = Math.max(0.01, roundTo(normalizedShares / lotSize, 2));
      onDraftChange({
        ...draft,
        quantityMode: 'lots',
        lots: nextLots,
        quantity: roundTo(nextLots * lotSize, 4)
      });
    } else {
      onDraftChange({
        ...draft,
        quantityMode: 'shares',
        quantity: roundTo(normalizedLots * lotSize, 4),
        lots: normalizedLots
      });
    }
  };

  const handleQuantityChange = (value, kind = draft.quantityMode) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    if (kind === 'lots') {
      const nextLots = Math.max(0.01, safeValue);
      onDraftChange({
        ...draft,
        quantityMode: kind,
        lots: roundTo(nextLots, 2),
        quantity: roundTo(nextLots * lotSize, 4)
      });
    } else {
      const nextShares = Math.max(0.01, safeValue);
      onDraftChange({
        ...draft,
        quantityMode: kind,
        quantity: roundTo(nextShares, 4),
        lots: roundTo(Math.max(0.01, nextShares / lotSize), 2)
      });
    }
  };

  const handleNumericFieldChange = (field) => (event) => {
    const raw = event.target.value;
    if (raw === '') {
      onDraftChange({ ...draft, [field]: null });
      return;
    }
    const parsed = Number(raw);
    onDraftChange({ ...draft, [field]: Number.isFinite(parsed) ? parsed : null });
  };

  const handleFieldChange = (field, value) => {
    onDraftChange({ ...draft, [field]: value });
  };

  const handleSubmit = () => {
    if (disabled || invalidReason) return;
    onSubmit({ ...draft, quantity: normalizedShares, lots: normalizedLots, estimatedCost, estimatedFees, fillPriceEstimate });
  };

  return (
    <section ref={reference} className="relative rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-2 gap-6 px-6 py-6">
        <div className="space-y-4">
          <ToggleGroup
            label="Side"
            value={draft.side}
            onChange={(next) => handleFieldChange('side', next)}
            options={[{ id: 'buy', label: 'Buy' }, { id: 'sell', label: 'Sell' }]}
          />
          <ToggleGroup
            label="Order type"
            value={draft.type}
            onChange={(next) => handleFieldChange('type', next)}
            options={ORDER_TYPES}
          />
          <QuantityControls
            mode={draft.quantityMode}
            quantity={normalizedShares}
            lots={normalizedLots}
            lotSize={lotSize}
            maxShares={maxShares}
            maxLots={maxLots}
            onModeChange={handleModeChange}
            onQuantityChange={handleQuantityChange}
          />
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
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                value={draft.limitPrice ?? ''}
                onChange={handleNumericFieldChange('limitPrice')}
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
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  value={draft.stopTrigger ?? ''}
                  onChange={handleNumericFieldChange('stopTrigger')}
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
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  value={draft.stopLimit ?? ''}
                  onChange={handleNumericFieldChange('stopLimit')}
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
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                value={draft.stopPrice ?? ''}
                onChange={handleNumericFieldChange('stopPrice')}
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
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                value={draft.targetPrice ?? ''}
                onChange={handleNumericFieldChange('targetPrice')}
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
            <p className="mt-1 font-semibold text-slate-900">{formatCurrency(costWithFees)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Buying power left</p>
            <p className="mt-1 font-semibold text-slate-900">{formatCurrency(buyingPowerLeft)}</p>
          </div>
          {riskAmount != null ? (
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Risk if stopped</p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatCurrency(riskAmount)} {riskPercent ? `· ${riskPercent}%` : ''} {rMultiple ? `· ${rMultiple.toFixed(2)}R` : ''}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Risk reminder</p>
              <p className="mt-1 text-slate-500">Attach a stop to see risk per trade.</p>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Orders route directly to Alpaca&apos;s paper trading API. Live market data and your guardrails determine fill speed and outcomes.
        </p>
      </div>

      <div className="border-t border-slate-200 px-6 py-4 text-sm">
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="text-sm font-medium text-emerald-700"
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
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
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
                  className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
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
                  className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
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
                  className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
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
                  const maxSharesAvailable = Math.max(1, Math.floor(account.buyingPower / Math.max(bestPrice, 1)));
                  handleQuantityChange(draft.quantityMode === 'lots' ? Math.max(1, Math.floor(maxSharesAvailable / lotSize)) : maxSharesAvailable);
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
            disabled || invalidReason
              ? 'cursor-not-allowed bg-slate-400'
              : 'bg-emerald-600 hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500'
          }`}
        >
          <span>{disabled ? 'Simulating…' : 'Place order'}</span>
        </button>
      </div>
    </section>
  );
}
