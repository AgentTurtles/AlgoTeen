import { formatCurrency, formatNumber } from './utils';

export default function WatchlistPanel({
  lists,
  activeListId,
  onSelectList,
  onSelectSymbol,
  selectedSymbol,
  reference,
  searchQuery,
  onSearchChange,
  onAddSymbol,
  status
}) {
  const { loading = false, error = null, lastUpdated = null } = status ?? {};
  const lastUpdatedLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null;
  const activeList = lists.find((list) => list.id === activeListId);
  const symbols = activeList?.symbols ?? [];

  return (
    <aside
      ref={reference}
      suppressHydrationWarning={true}
      className="relative flex h-full w-[232px] flex-col border-r border-slate-200 bg-white"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-slate-200/70 to-transparent" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-slate-200/70 to-transparent" aria-hidden />
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 pb-3 pt-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Watchlist</h2>
        <p className="mt-1 text-xs text-slate-500">Tap a symbol to drive the chart and ticket.</p>
        <div className="mt-3 flex items-center gap-2">
          {lists.map((list) => {
            const isActive = list.id === activeListId;
            return (
              <button
                key={list.id}
                type="button"
                onClick={() => onSelectList(list.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {list.name}
              </button>
            );
          })}
          <button
            type="button"
            onClick={onAddSymbol}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            +
          </button>
        </div>
        <div className="mt-3">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search symbols"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </div>
        {error ? (
          <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        ) : null}
        <p className="mt-2 text-[11px] text-slate-500">
          {loading ? (
            <span className="font-semibold text-emerald-600">Refreshing Polygon prices…</span>
          ) : lastUpdatedLabel ? (
            <>Updated {lastUpdatedLabel}</>
          ) : (
            'Waiting for first Polygon refresh'
          )}
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-6 pt-4">
        {symbols.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No matches — try another search.
          </div>
        ) : (
          symbols.map((symbol) => {
            const isSelected = symbol.symbol === selectedSymbol;
            const changeColor = symbol.changePct >= 0 ? 'text-emerald-600' : 'text-rose-600';
            const bg = isSelected ? 'border-slate-900 shadow-sm bg-slate-900/5' : 'border-transparent';

            return (
              <button
                key={symbol.symbol}
                type="button"
                onClick={() => onSelectSymbol(symbol.symbol)}
                className={`w-full rounded-2xl border ${bg} px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-100`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{symbol.symbol}</p>
                    <p className="text-xs text-slate-500">{symbol.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(symbol.price)}</p>
                    <p className={`text-xs font-medium ${changeColor}`}>
                      {symbol.changePct >= 0 ? '▲' : '▼'} {Math.abs(symbol.changePct).toFixed(2)}%
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{symbol.sector}</span>
                  <span>Vol {formatNumber(symbol.volume / 1000, 1)}k</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
