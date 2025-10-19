'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import GuidedTour from './GuidedTour';
import JournalCard from './JournalCard';
import OrderTicket from './OrderTicket';
import RightRail from './RightRail';
import Toast from './Toast';
import TradeChart from './TradeChart';
import WatchlistPanel from './WatchlistPanel';
import { DAILY_LOSS_LIMITS, JOURNAL_TAGS, REALISM_LEVELS, WATCHLISTS } from './data';
import { formatCurrency, generateSeries, getLocalStorageValue, roundTo, setLocalStorageValue } from './utils';

function useStickyState(key, defaultValue) {
  const [state, setState] = useState(() => getLocalStorageValue(key, defaultValue));

  useEffect(() => {
    setLocalStorageValue(key, state);
  }, [key, state]);

  return [state, setState];
}

function deriveAccountSummary(positions, cash, priceLookup, startingBalance) {
  const exposure = positions.reduce((sum, position) => {
    const mark = priceLookup(position.symbol);
    const value = mark * position.quantity;
    return sum + value;
  }, 0);

  const equity = cash + exposure;

  return {
    cash: roundTo(cash, 2),
    equity: roundTo(equity, 2),
    buyingPower: roundTo(Math.max(0, cash), 2),
    reserved: 0,
    exposure: roundTo(exposure, 2),
    startingBalance
  };
}

export default function PaperTradingWorkspace() {
  const flattenSymbols = useMemo(
    () => WATCHLISTS.flatMap((list) => list.symbols.map((symbol) => ({ ...symbol }))),
    []
  );

  const [activeWatchlistId, setActiveWatchlistId] = useStickyState('algoteen-paper-watchlist', WATCHLISTS[0].id);
  const [selectedSymbol, setSelectedSymbol] = useStickyState('algoteen-paper-symbol', WATCHLISTS[0].symbols[0].symbol);
  const [realism, setRealism] = useStickyState('algoteen-paper-realism', REALISM_LEVELS[0].id);
  const [tourDismissed, setTourDismissed] = useStickyState('algoteen-paper-tour', false);

  const [account, setAccount] = useStickyState('algoteen-paper-account', {
    equity: 0,
    cash: 0,
    buyingPower: 0,
    reserved: 0,
    startingBalance: 0
  });

  const [positions, setPositions] = useStickyState('algoteen-paper-positions', []);
  const [orders, setOrders] = useStickyState('algoteen-paper-orders', []);
  const [journalEntries, setJournalEntries] = useStickyState('algoteen-paper-journal', []);
  const [equityTimeline, setEquityTimeline] = useStickyState('algoteen-paper-equity', []);
  const [activeTab, setActiveTab] = useStickyState('algoteen-paper-rail-tab', 'positions');
  const [riskSettings, setRiskSettings] = useStickyState('algoteen-paper-risk', {
    dailyLossLimit: DAILY_LOSS_LIMITS[0].id
  });

  const [orderDraft, setOrderDraft] = useState({
    side: 'buy',
    type: 'market',
    quantity: 1,
    limitPrice: null,
    stopTrigger: null,
    stopLimit: null,
    stopPrice: null,
    targetPrice: null,
    timeInForce: 'day',
    bracket: false,
    oco: false,
    reduceOnly: false
  });

  const [overlayState, setOverlayState] = useState({ sma: true, vwap: true, rsi: true });
  const [pendingMarkers, setPendingMarkers] = useState({ entry: null, stop: null, target: null });
  const [toastQueue, setToastQueue] = useState([]);
  const [showStarterBalance, setShowStarterBalance] = useState(() => account.equity === 0);
  const [journalDraft, setJournalDraft] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [livePrices, setLivePrices] = useState(() => {
    const map = {};
    flattenSymbols.forEach((symbol) => {
      map[symbol.symbol] = symbol.price;
    });
    return map;
  });

  const watchlistRef = useRef(null);
  const chartRef = useRef(null);
  const ticketRef = useRef(null);
  const positionsRef = useRef(null);

  const seriesCache = useRef({});

  const getSymbolMeta = useCallback(
    (symbol) => flattenSymbols.find((item) => item.symbol === symbol),
    [flattenSymbols]
  );

  const getSymbolPrice = useCallback(
    (symbol) => livePrices[symbol] ?? getSymbolMeta(symbol)?.price ?? 0,
    [getSymbolMeta, livePrices]
  );

  useEffect(() => {
    flattenSymbols.forEach((symbol) => {
      if (!seriesCache.current[symbol.symbol]) {
        const base = generateSeries(symbol.price, symbol.price * 0.02);
        seriesCache.current[symbol.symbol] = base;
      }
    });
  }, [flattenSymbols]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLivePrices((prev) => {
        const next = { ...prev };
        flattenSymbols.forEach((symbol) => {
          const last = prev[symbol.symbol] ?? symbol.price;
          const drift = (Math.random() - 0.5) * symbol.price * 0.002;
          const price = Math.max(0.1, roundTo(last + drift, 2));
          next[symbol.symbol] = price;

          const cache = seriesCache.current[symbol.symbol];
          if (cache) {
            const lastCandle = cache[cache.length - 1];
            const nextCandle = {
              index: lastCandle.index + 1,
              open: lastCandle.close,
              close: price,
              high: Math.max(lastCandle.close, price) + Math.random() * symbol.price * 0.001,
              low: Math.min(lastCandle.close, price) - Math.random() * symbol.price * 0.001,
              volume: lastCandle.volume * (0.9 + Math.random() * 0.2),
              time: lastCandle.time + 1
            };
            const updated = [...cache.slice(-239), nextCandle];
            seriesCache.current[symbol.symbol] = updated;
          }
        });
        return next;
      });
    }, 5000);

    return () => window.clearInterval(id);
  }, [flattenSymbols]);

  useEffect(() => {
    if (!positions.length) {
      return;
    }
    setPositions((prev) =>
      prev.map((position) => ({
        ...position,
        markPrice: getSymbolPrice(position.symbol)
      }))
    );
  }, [getSymbolPrice, positions.length, setPositions]);

  const chartData = seriesCache.current[selectedSymbol] ?? [];
  const bestPrice = getSymbolPrice(selectedSymbol);

  useEffect(() => {
    setOrderDraft((prev) => ({
      ...prev,
      limitPrice: prev.type === 'market' ? prev.limitPrice : roundTo(bestPrice, 2)
    }));
  }, [bestPrice]);

  const handleOverlayToggle = useCallback((key, explicit) => {
    setOverlayState((prev) => ({
      ...prev,
      [key]: typeof explicit === 'boolean' ? explicit : !prev[key]
    }));
  }, []);

  const realismConfig = useMemo(() => REALISM_LEVELS.find((item) => item.id === realism) ?? REALISM_LEVELS[0], [realism]);

  const handleChartClick = useCallback(
    (price) => {
      const rounded = roundTo(price, 2);
      setPendingMarkers((prev) => ({
        ...prev,
        entry: rounded,
        stop:
          prev.stop ??
          roundTo(rounded * (orderDraft.side === 'buy' ? 0.99 : 1.01), 2),
        target:
          prev.target ??
          roundTo(rounded * (orderDraft.side === 'buy' ? 1.02 : 0.98), 2)
      }));

      setOrderDraft((prev) => ({
        ...prev,
        limitPrice: prev.type === 'market' ? prev.limitPrice : rounded,
        stopPrice:
          prev.stopPrice ?? roundTo(rounded * (prev.side === 'buy' ? 0.99 : 1.01), 2),
        targetPrice:
          prev.targetPrice ?? roundTo(rounded * (prev.side === 'buy' ? 1.02 : 0.98), 2)
      }));
    },
    [orderDraft.side]
  );

  const handleMarkerChange = useCallback((marker, price) => {
    setPendingMarkers((prev) => ({
      ...prev,
      [marker]: price
    }));

    if (marker === 'entry') {
      setOrderDraft((prev) => ({
        ...prev,
        limitPrice: prev.type === 'market' ? prev.limitPrice : price
      }));
    }
    if (marker === 'stop') {
      setOrderDraft((prev) => ({
        ...prev,
        stopPrice: price
      }));
    }
    if (marker === 'target') {
      setOrderDraft((prev) => ({
        ...prev,
        targetPrice: price
      }));
    }
  }, []);

  const pushToast = useCallback((toast) => {
    setToastQueue((prev) => [...prev, { ...toast, id: toast.id ?? `toast-${Date.now()}` }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToastQueue((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const appendJournal = useCallback((entry) => {
    setJournalEntries((prev) => [{ ...entry }, ...prev.slice(0, 24)]);
  }, [setJournalEntries]);

  const executeOrder = useCallback(
    async (draft, { symbol = selectedSymbol, source = 'ticket', quantityOverride } = {}) => {
      setPlacing(true);
      const quantity = quantityOverride ?? draft.quantity;
      const basePrice = draft.type === 'market' ? getSymbolPrice(symbol) : draft.limitPrice ?? getSymbolPrice(symbol);
      const direction = draft.side === 'buy' ? 1 : -1;
      const slip = (realismConfig.slippageBps / 10000) * basePrice;
      const fillPrice = roundTo(basePrice + direction * slip, 2);
      const fees = roundTo(fillPrice * quantity * 0.0005, 2);

      await new Promise((resolve) => window.setTimeout(resolve, 650));

      setPositions((currentPositions) => {
        const existing = currentPositions.find((position) => position.symbol === symbol);
        let nextPositions = currentPositions;
        let realizedPnl = 0;
        let nextCash = account.cash;

        if (draft.side === 'buy') {
          if (existing) {
            const newQty = existing.quantity + quantity;
            const newEntry = (existing.entryPrice * existing.quantity + fillPrice * quantity) / newQty;
            nextPositions = currentPositions.map((position) =>
              position.id === existing.id
                ? { ...position, quantity: newQty, entryPrice: roundTo(newEntry, 4), markPrice: getSymbolPrice(symbol) }
                : position
            );
          } else {
            const newPosition = {
              id: `pos-${Date.now()}`,
              symbol,
              side: 'long',
              quantity,
              entryPrice: fillPrice,
              markPrice: getSymbolPrice(symbol),
              openedAt: Date.now()
            };
            nextPositions = [...currentPositions, newPosition];
          }
          nextCash = account.cash - fillPrice * quantity - fees;
        } else {
          if (!existing) {
            pushToast({
              title: 'Cannot sell',
              message: 'You need an open long position to sell. Shorting is disabled in this classroom desk.'
            });
            setPlacing(false);
            return currentPositions;
          }
          const remaining = existing.quantity - quantity;
          realizedPnl = (fillPrice - existing.entryPrice) * Math.min(existing.quantity, quantity);
          if (remaining <= 0) {
            nextPositions = currentPositions.filter((position) => position.id !== existing.id);
          } else {
            nextPositions = currentPositions.map((position) =>
              position.id === existing.id
                ? { ...position, quantity: remaining, markPrice: getSymbolPrice(symbol) }
                : position
            );
          }
          nextCash = account.cash + fillPrice * quantity - fees;
        }

        const summary = deriveAccountSummary(nextPositions, nextCash, getSymbolPrice, account.startingBalance);
        setAccount(summary);
        setEquityTimeline((prev) => [...prev.slice(-98), { timestamp: Date.now(), equity: summary.equity }]);

        const orderRecord = {
          id: `order-${Date.now()}`,
          symbol,
          side: draft.side,
          type: draft.type,
          quantity,
          price: fillPrice,
          fillPrice,
          estimatedCost: roundTo(fillPrice * quantity, 2),
          fees,
          status: 'Filled',
          realism: realismConfig.name,
          timestamp: Date.now(),
          pnl: roundTo(realizedPnl, 2),
          source
        };

        setOrders((prev) => [orderRecord, ...prev.slice(0, 99)]);

        if (realizedPnl !== 0) {
          appendJournal({
            id: `journal-${Date.now()}`,
            symbol,
            side: draft.side,
            quantity,
            price: fillPrice,
            timestamp: Date.now(),
            tag: 'Recorded trade',
            note: `Realised ${formatCurrency(realizedPnl)} ${realizedPnl >= 0 ? 'profit' : 'loss'}.`,
            reaction: realizedPnl >= 0 ? '🎉' : '🧠'
          });
        } else {
          setJournalDraft({
            symbol,
            side: draft.side,
            quantity,
            price: fillPrice,
            timestamp: Date.now()
          });
        }

        pushToast({
          title: `${draft.side === 'buy' ? 'Bought' : 'Sold'} ${quantity} ${symbol}`,
          message: `Filled at ${formatCurrency(fillPrice)} with ${formatCurrency(fees)} fees.`,
          action: {
            label: 'View on chart',
            onClick: () => {
              document.getElementById('paper-chart')?.scrollIntoView({ behavior: 'smooth' });
            }
          }
        });

        setPendingMarkers({ entry: null, stop: null, target: null });
        setOrderDraft((prev) => ({
          ...prev,
          stopPrice: null,
          targetPrice: null
        }));

        setPlacing(false);
        return nextPositions;
      });
    },
    [account.cash, account.startingBalance, appendJournal, getSymbolPrice, pushToast, realismConfig, selectedSymbol, setAccount, setEquityTimeline, setOrders]
  );

  const handleOrderSubmit = useCallback(
    (draft) => {
      if (riskSettings.dailyLossLimit !== 'off' && account.startingBalance) {
        const guardrail = DAILY_LOSS_LIMITS.find((limit) => limit.id === riskSettings.dailyLossLimit);
        if (guardrail?.value) {
          const maxLoss = account.startingBalance * guardrail.value;
          const realizedLoss = Math.max(0, account.startingBalance - account.equity);
          if (realizedLoss >= maxLoss) {
            pushToast({
              title: 'Daily loss limit hit',
              message: 'Take a breather — the desk is locked for the session to protect your capital.'
            });
            return;
          }
        }
      }
      executeOrder(draft, { symbol: selectedSymbol, source: 'ticket' });
    },
    [account.equity, account.startingBalance, executeOrder, pushToast, riskSettings.dailyLossLimit, selectedSymbol]
  );

  const handleClosePosition = useCallback(
    (positionId, fraction = 1) => {
      const position = positions.find((item) => item.id === positionId);
      if (!position) return;
      const qty = Math.max(1, Math.floor(position.quantity * fraction));
      executeOrder(
        {
          ...orderDraft,
          side: 'sell',
          type: 'market',
          quantity: qty
        },
        { symbol: position.symbol, source: 'rail-close', quantityOverride: qty }
      );
    },
    [executeOrder, orderDraft, positions]
  );

  const handleExportCsv = useCallback(() => {
    if (orders.length === 0) return;
    const header = ['Timestamp', 'Symbol', 'Side', 'Quantity', 'FillPrice', 'Fees', 'PnL'];
    const rows = orders.map((order) => [
      new Date(order.timestamp).toISOString(),
      order.symbol,
      order.side,
      order.quantity,
      order.fillPrice,
      order.fees,
      order.pnl
    ]);
    const csv = [header, ...rows]
      .map((row) => row.join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'algoteen-paper-history.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [orders]);

  const analytics = useMemo(() => {
    const baseline = account.startingBalance || account.equity;
    const totalReturn = baseline ? ((account.equity - baseline) / baseline) * 100 : 0;
    const filledTrades = orders.filter((order) => order.status === 'Filled');
    const winners = filledTrades.filter((order) => order.pnl > 0).length;
    const winRate = filledTrades.length ? (winners / filledTrades.length) * 100 : 0;

    let maxDrawdown = 0;
    let peak = equityTimeline.length ? equityTimeline[0].equity : baseline;
    equityTimeline.forEach((point) => {
      peak = Math.max(peak, point.equity);
      const dd = peak ? ((point.equity - peak) / peak) * 100 : 0;
      if (dd < maxDrawdown) maxDrawdown = dd;
    });

    const returns = filledTrades
      .map((order) => (order.estimatedCost ? order.pnl / order.estimatedCost : 0))
      .filter((value) => Number.isFinite(value));
    const avgReturn = returns.length ? returns.reduce((sum, value) => sum + value, 0) / returns.length : 0;
    const variance = returns.length
      ? returns.reduce((sum, value) => sum + (value - avgReturn) ** 2, 0) / returns.length
      : 0;
    const sharpe = variance === 0 ? 0 : avgReturn / Math.sqrt(variance);

    const previousEquity = equityTimeline.length > 1 ? equityTimeline[equityTimeline.length - 2].equity : null;
    const previousReturn = previousEquity && baseline ? ((previousEquity - baseline) / baseline) * 100 : null;
    const delta = previousReturn != null ? totalReturn - previousReturn : null;

    return {
      metrics: [
        { label: 'Total return', value: `${totalReturn.toFixed(2)}%`, delta },
        { label: 'Win rate', value: `${winRate.toFixed(0)}%`, delta: null },
        { label: 'Max DD', value: `${maxDrawdown.toFixed(2)}%`, delta: null },
        { label: 'Sharpe', value: sharpe ? sharpe.toFixed(2) : '0.00', delta: null }
      ]
    };
  }, [account.equity, account.startingBalance, equityTimeline, orders]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7F5] text-[#102019]">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">AlgoTeen Paper Desk</p>
            <p className="text-lg font-semibold text-slate-900">Teen Challenge Account</p>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Equity</p>
              <p className="mt-1 font-semibold text-slate-900">{formatCurrency(account.equity)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Cash</p>
              <p className="mt-1 font-semibold text-slate-900">{formatCurrency(account.cash)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Buying power</p>
              <p className="mt-1 font-semibold text-slate-900">{formatCurrency(account.buyingPower)}</p>
            </div>
            <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              Simulated
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <WatchlistPanel
          lists={WATCHLISTS}
          activeListId={activeWatchlistId}
          onSelectList={setActiveWatchlistId}
          onSelectSymbol={(symbol) => {
            setSelectedSymbol(symbol);
            setPendingMarkers({ entry: null, stop: null, target: null });
          }}
          selectedSymbol={selectedSymbol}
          reference={watchlistRef}
        />

        <main className="flex min-w-0 flex-1 flex-col gap-6 px-6 py-6">
          <section className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Flow overview</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Watchlist → chart → ticket → positions. One path, zero zig-zag. Start on the left and move right.
                </p>
              </div>
              <div className="flex gap-2 text-sm">
              {REALISM_LEVELS.map((level) => {
                const active = level.id === realism;
                  return (
                    <button
                      key={level.id}
                      type="button"
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        active
                          ? 'border-blue-700 bg-blue-700 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                      }`}
                      onClick={() => setRealism(level.id)}
                    >
                      {level.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {realismConfig.description}
            </p>
          </section>

          <TradeChart
            data={chartData}
            symbol={selectedSymbol}
            overlays={overlayState}
            onToggleOverlay={handleOverlayToggle}
            onChartClick={handleChartClick}
            onMarkerChange={handleMarkerChange}
            markers={pendingMarkers}
            filledOrders={orders.filter((order) => order.symbol === selectedSymbol && order.status === 'Filled')}
            activeSide={orderDraft.side}
            reference={chartRef}
          />

          <OrderTicket
            data={{ positions, symbol: selectedSymbol }}
            draft={orderDraft}
            onDraftChange={setOrderDraft}
            onSubmit={handleOrderSubmit}
            disabled={placing}
            account={account}
            bestPrice={bestPrice}
            reference={ticketRef}
          />

          <section className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Simulation engine notes</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                <p className="text-sm font-semibold text-slate-900">How fills work</p>
                <ul className="mt-2 space-y-2 text-sm">
                  <li>Market orders fill next tick plus {realismConfig.slippageBps} bps slippage.</li>
                  <li>Limit orders fill when touched or improved, respecting your time-in-force.</li>
                  <li>Stops trigger into market or limit depending on the tab. Partial fills appear if you oversize.</li>
                  <li>Fees model a 0.05% rate; toggle realism for deeper slippage and latency.</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                <p className="text-sm font-semibold text-slate-900">Example order</p>
                <p className="mt-2 text-sm text-slate-600">
                  Buy 5 shares at {formatCurrency(bestPrice)} → est. cost {formatCurrency(bestPrice * 5)} + fees {formatCurrency(bestPrice * 5 * 0.0005)}.
                  A 2% stop risks {formatCurrency(bestPrice * 5 * 0.02)}. Switch realism to see slippage change live.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Journals</h3>
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900"
                onClick={() => setJournalDraft({ symbol: selectedSymbol, timestamp: Date.now(), price: bestPrice, side: orderDraft.side, quantity: orderDraft.quantity })}
              >
                New note
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Reflect after every fill. Grab an emoji for mood, tag the setup, and capture one sentence so your future self learns faster.
            </p>
            {journalEntries.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No journals yet — fills will prompt a quick card so you can log the why, not just the what.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {journalEntries.map((entry) => (
                  <JournalCard key={entry.id} entry={entry} onEdit={(id) => setJournalDraft(journalEntries.find((item) => item.id === id))} />
                ))}
              </div>
            )}
          </section>
        </main>

        <RightRail
          positions={positions}
          orders={orders}
          account={account}
          onClosePosition={(id) => handleClosePosition(id, 1)}
          onPartialClose={(id) => handleClosePosition(id, 0.5)}
          analytics={analytics}
          onExportCsv={handleExportCsv}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          riskSettings={riskSettings}
          onRiskChange={setRiskSettings}
          reference={positionsRef}
        />
      </div>

      {showStarterBalance ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/70 px-4">
          <div className="max-w-md rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Kick off balance</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Pick a starter account</h2>
            <p className="mt-2 text-sm text-slate-600">
              This desk simulates fills with slippage, fees, and timestamps. Choose a balance to see buying power and guardrails in action.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[1000, 5000, 10000].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-900"
                  onClick={() => {
                    const summary = deriveAccountSummary([], amount, getSymbolPrice, amount);
                    setAccount(summary);
                    setEquityTimeline([{ timestamp: Date.now(), equity: summary.equity }]);
                    setShowStarterBalance(false);
                  }}
                >
                  {formatCurrency(amount)}
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              We simulate fills at the next tick with configurable slippage and fees. Corporate actions and commissions are applied automatically.
            </p>
          </div>
        </div>
      ) : null}

      {journalDraft ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/70 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Log this trade</h2>
            <p className="mt-1 text-sm text-slate-600">
              Quick reflection makes you better. Tag the setup, pick a vibe, and jot one sentence.
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{journalDraft.symbol}</p>
                <p className="text-xs text-slate-500">
                  {journalDraft.side.toUpperCase()} {journalDraft.quantity} @ {formatCurrency(journalDraft.price)} · {new Date(journalDraft.timestamp).toLocaleTimeString()}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Tag</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {JOURNAL_TAGS.map((tag) => {
                    const active = journalDraft.tag === tag;
                    return (
                      <button
                        key={tag}
                        type="button"
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          active
                            ? 'border-blue-700 bg-blue-700 text-white'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                        }`}
                        onClick={() => setJournalDraft((prev) => ({ ...prev, tag }))}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Reaction</label>
                <div className="mt-2 flex gap-2">
                  {['🎉', '😬', '🧠', '🔥', '📝'].map((emoji) => {
                    const active = journalDraft.reaction === emoji;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        className={`rounded-full border px-3 py-1 text-base ${
                          active ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                        }`}
                        onClick={() => setJournalDraft((prev) => ({ ...prev, reaction: emoji }))}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400" htmlFor="journal-note">
                  Note
                </label>
                <textarea
                  id="journal-note"
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  rows={3}
                  value={journalDraft.note ?? ''}
                  onChange={(event) => setJournalDraft((prev) => ({ ...prev, note: event.target.value }))}
                  placeholder="What was the setup? What will you repeat or fix next time?"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-between text-sm">
              <button
                type="button"
                className="text-slate-500"
                onClick={() => setJournalDraft(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
                onClick={() => {
                  appendJournal({ ...journalDraft, id: `journal-${Date.now()}` });
                  setJournalDraft(null);
                }}
              >
                Save journal
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toastQueue.length ? (
        <div className="pointer-events-none fixed bottom-6 right-6 z-40 flex flex-col gap-3">
          {toastQueue.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <Toast toast={toast} onDismiss={dismissToast} />
            </div>
          ))}
        </div>
      ) : null}

      {!tourDismissed ? (
        <GuidedTour
          anchors={{ watchlist: watchlistRef, chart: chartRef, ticket: ticketRef, positions: positionsRef }}
          onDismiss={() => setTourDismissed(true)}
        />
      ) : null}
    </div>
  );
}
