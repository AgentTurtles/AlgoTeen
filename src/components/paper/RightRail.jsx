import { DAILY_LOSS_LIMITS } from './data';
import { formatCurrency } from './utils';

export default function RightRail({
  positions,
  orders,
  account,
  onClosePosition,
  onPartialClose,
  analytics,
  onExportCsv,
  activeTab,
  onTabChange,
  riskSettings,
  onRiskChange,
  reference,
  onGuidedTrade
}) {
  const tabs = [
    { id: 'positions', label: 'Positions' },
    { id: 'orders', label: 'Orders' },
    { id: 'performance', label: 'Performance' }
  ];

  return (
    <aside
      ref={reference}
      id="paper-rail"
      className="relative flex h-full w-[360px] flex-col border-l border-slate-200 bg-white"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-slate-200/70 to-transparent" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-slate-200/70 to-transparent" aria-hidden />
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 pb-4 pt-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Desk status</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Equity</p>
            <p className="mt-1 font-semibold text-slate-900">{formatCurrency(account.equity)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Buying power</p>
            <p className="mt-1 font-semibold text-slate-900">{formatCurrency(account.buyingPower)}</p>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Daily loss guardrail</label>
          <select
            value={riskSettings.dailyLossLimit}
            onChange={(event) => onRiskChange({ ...riskSettings, dailyLossLimit: event.target.value })}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          >
            {DAILY_LOSS_LIMITS.map((limit) => (
              <option key={limit.id} value={limit.id}>
                {limit.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-slate-500">
            We soft-block trades once losses exceed your guardrail and nudge you to take a break.
          </p>
        </div>

        <div className="mt-4 space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Tabs</label>
          <div className="flex gap-2">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    isActive
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-20 pt-4 text-sm">
        {activeTab === 'positions' ? (
          <div className="space-y-3">
            {positions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                <p>No positions yet — pick a symbol and place your first order.</p>
                <button
                  type="button"
                  className="mt-3 rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-400 hover:text-slate-900"
                  onClick={onGuidedTrade}
                >
                  Try a guided first trade
                </button>
              </div>
            ) : (
              positions.map((position) => {
                const pnl =
                  position.side === 'long'
                    ? (position.markPrice - position.entryPrice) * position.quantity
                    : (position.entryPrice - position.markPrice) * position.quantity;
                const pnlPct = (pnl / (position.entryPrice * position.quantity)) * 100;
                const pnlColor = pnl >= 0 ? 'text-emerald-600' : 'text-rose-600';
                return (
                  <div key={position.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{position.symbol}</p>
                        <p className="text-xs text-slate-500">{position.quantity} @ {position.entryPrice.toFixed(2)}</p>
                      </div>
                      <div className={`text-right text-sm font-semibold ${pnlColor}`}>
                        <p>{pnl >= 0 ? '▲' : '▼'} {formatCurrency(pnl)}</p>
                        <p className="text-xs text-slate-500">{pnlPct.toFixed(2)}%</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900"
                        onClick={() => onClosePosition(position.id)}
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900"
                        onClick={() => onPartialClose(position.id, 0.5)}
                      >
                        Close 50%
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900"
                      >
                        Add stop/target
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : null}

        {activeTab === 'orders' ? (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No orders yet. Your tickets will show here with status and fills.
              </div>
            ) : (
              orders.map((order) => {
                const status = (order.status ?? '').replace(/_/g, ' ');
                const filledSummary = order.filledQuantity
                  ? `${order.filledQuantity}/${order.quantity}`
                  : order.quantity;
                const displayPrice =
                  order.filledAvgPrice != null
                    ? formatCurrency(order.filledAvgPrice)
                    : order.limitPrice != null
                      ? formatCurrency(order.limitPrice)
                      : order.stopPrice != null
                        ? formatCurrency(order.stopPrice)
                        : '--';
                const submitted = order.submittedAt ? new Date(order.submittedAt).toLocaleString() : null;
                return (
                  <div key={order.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {order.side?.toUpperCase()} {filledSummary} {order.symbol}
                        </p>
                        <p className="text-xs text-slate-500">
                          {order.type?.toUpperCase()} · {status}
                          {order.orderClass ? ` · ${order.orderClass}` : ''}
                        </p>
                      </div>
                      <div className="text-right text-sm font-semibold text-slate-900">{displayPrice}</div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {order.filledAvgPrice != null
                        ? `Avg ${formatCurrency(order.filledAvgPrice)}`
                        : 'Awaiting fill'}
                      {order.limitPrice != null ? ` · Limit ${formatCurrency(order.limitPrice)}` : ''}
                      {order.stopPrice != null ? ` · Stop ${formatCurrency(order.stopPrice)}` : ''}
                    </p>
                    {submitted ? (
                      <p className="mt-1 text-[11px] text-slate-400">Submitted {submitted}</p>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        ) : null}

        {activeTab === 'performance' ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Metrics ribbon</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                {analytics.metrics.map((metric) => (
                  <div key={metric.label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{metric.label}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{metric.value}</p>
                    {metric.delta != null ? (
                      <p className={`text-xs font-medium ${metric.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {metric.delta >= 0 ? '▲' : '▼'} {Math.abs(metric.delta).toFixed(2)} vs prior run
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Export history</h3>
                <button
                  type="button"
                  onClick={onExportCsv}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900"
                >
                  Export CSV
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">Share trades for school projects instantly.</p>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
