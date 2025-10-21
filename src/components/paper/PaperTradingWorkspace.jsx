'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

import GuidedTour from './GuidedTour';
import JournalCard from './JournalCard';
import OrderTicket from './OrderTicket';
import RightRail from './RightRail';
import Toast from './Toast';
import TradeChart from './TradeChart';
import WatchlistPanel from './WatchlistPanel';
import { DAILY_LOSS_LIMITS, JOURNAL_TAGS, REALISM_LEVELS, WATCHLISTS } from './data';
import { formatCurrency, getLocalStorageValue, roundTo, setLocalStorageValue } from './utils';

const DEFAULT_LOT_SIZE = 100;

const TIMEFRAME_PRESETS = [
  { id: '1D', label: '1D', bars: 96 },
  { id: '5D', label: '5D', bars: 96 * 5 },
  { id: '1M', label: '1M', bars: 96 * 20 },
  { id: '6M', label: '6M', bars: 96 * 40 },
  { id: '1Y', label: '1Y', bars: 96 * 78 }
];

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
  const { status: authStatus } = useSession();
  const defaultLists = useMemo(
    () => WATCHLISTS.map((list) => ({
      ...list,
      symbols: list.symbols.map((symbol) => ({ ...symbol }))
    })),
    []
  );

  const [watchlists, setWatchlists] = useStickyState('algoteen-paper-watchlists', defaultLists);

  const flattenSymbols = useMemo(
    () => watchlists.flatMap((list) => list.symbols.map((symbol) => ({ ...symbol }))),
    [watchlists]
  );

  const [activeWatchlistId, setActiveWatchlistId] = useStickyState(
    'algoteen-paper-watchlist',
    WATCHLISTS[0].id
  );
  const [selectedSymbol, setSelectedSymbol] = useStickyState(
    'algoteen-paper-symbol',
    WATCHLISTS[0].symbols[0].symbol
  );
  const [realism, setRealism] = useStickyState('algoteen-paper-realism', REALISM_LEVELS[0].id);
  const [timeframe, setTimeframe] = useStickyState('algoteen-paper-timeframe', '1D');
  const [showFlowOverview, setShowFlowOverview] = useStickyState('algoteen-paper-flow-open', true);
  const [lastAction, setLastAction] = useStickyState('algoteen-paper-last-action', null);
  const [watchQuery, setWatchQuery] = useState('');
  const [tourDismissed, setTourDismissed] = useStickyState('algoteen-paper-tour', false);
  const [account, setAccount] = useState({
    equity: 0,
    cash: 0,
    buyingPower: 0,
    reserved: 0,
    startingBalance: 0
  });

  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [journalEntries, setJournalEntries] = useStickyState('algoteen-paper-journal', []);
  const [equityTimeline, setEquityTimeline] = useStickyState('algoteen-paper-equity', []);
  const [activeTab, setActiveTab] = useStickyState('algoteen-paper-rail-tab', 'positions');
  const [riskSettings, setRiskSettings] = useStickyState('algoteen-paper-risk', {
    dailyLossLimit: DAILY_LOSS_LIMITS[0].id
  });

  const [orderDraft, setOrderDraft] = useState({
    side: 'buy',
    type: 'market',
    quantityMode: 'shares',
    quantity: 1,
    lots: 0.01,
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
  const toastIdRef = useRef(0);
  const [showStarterBalance, setShowStarterBalance] = useState(() => account.equity === 0);
  const [journalDraft, setJournalDraft] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [clock, setClock] = useState(null);
  const [livePrices, setLivePrices] = useState({});
  const [chartSeries, setChartSeries] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState(null);
  const [searchResults, setSearchResults] = useState([]);

  const watchlistRef = useRef(null);
  const chartRef = useRef(null);
  const ticketRef = useRef(null);
  const positionsRef = useRef(null);


  useEffect(() => {
    setClock(new Date());
    const id = window.setInterval(() => setClock(new Date()), 60000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (account.equity > 0 && showStarterBalance) {
      setShowStarterBalance(false);
    }
  }, [account.equity, showStarterBalance]);

  const getSymbolMeta = useCallback(
    (symbol) => flattenSymbols.find((item) => item.symbol === symbol),
    [flattenSymbols]
  );

  const getSymbolPrice = useCallback(
    (symbol) => livePrices[symbol] ?? getSymbolMeta(symbol)?.price ?? 0,
    [getSymbolMeta, livePrices]
  );

  useEffect(() => {
    if (authStatus !== 'authenticated') return undefined;
    let active = true;

    async function loadAccount() {
      try {
        const response = await fetch('/api/alpaca/account', { credentials: 'include' });
        if (!active || !response.ok) return;
        const payload = await response.json();
        const raw = payload.data ?? {};
        setAccount({
          equity: Number.parseFloat(raw.equity ?? raw.last_equity ?? 0) || 0,
          cash: Number.parseFloat(raw.cash ?? 0) || 0,
          buyingPower: Number.parseFloat(raw.buying_power ?? raw.cash ?? 0) || 0,
          reserved: Number.parseFloat(raw.long_market_value ?? 0) || 0,
          startingBalance: Number.parseFloat(raw.last_equity ?? raw.equity ?? 0) || 0
        });
      } catch (error) {
        // ignore network issues and keep last values
      }
    }

    async function loadPositions() {
      try {
        const response = await fetch('/api/alpaca/positions', { credentials: 'include' });
        if (!active || !response.ok) return;
        const payload = await response.json();
        const list = Array.isArray(payload.data) ? payload.data : [];
        setPositions(
          list.map((item) => ({
            id: item.asset_id ?? `${item.symbol}-${item.side}`,
            symbol: item.symbol,
            quantity: Number.parseFloat(item.qty ?? item.quantity ?? 0) || 0,
            entryPrice: Number.parseFloat(item.avg_entry_price ?? 0) || 0,
            marketValue: Number.parseFloat(item.market_value ?? 0) || 0,
            side: (item.side ?? 'long').toLowerCase(),
            markPrice: Number.parseFloat(item.current_price ?? item.avg_entry_price ?? 0) || 0,
            priceTrail: []
          }))
        );
      } catch (error) {
        // ignore
      }
    }

    async function loadOrders() {
      try {
        const response = await fetch('/api/alpaca/orders', { credentials: 'include' });
        if (!active || !response.ok) return;
        const payload = await response.json();
        const list = Array.isArray(payload.data) ? payload.data : [];
        setOrders(
          list.map((order) => ({
            id: order.id,
            symbol: order.symbol,
            side: order.side,
            quantity: Number.parseFloat(order.qty ?? 0) || 0,
            price: Number.parseFloat(order.limit_price ?? order.stop_price ?? order.avg_price ?? 0) || 0,
            type: order.type,
            status: order.status,
            fees: Number.parseFloat(order.filled_avg_price ?? 0) * 0.0005,
            realism: realism
          }))
        );
      } catch (error) {
        // ignore
      }
    }

    loadAccount();
    loadPositions();
    loadOrders();

    const accountId = window.setInterval(loadAccount, 60_000);
    const positionsId = window.setInterval(loadPositions, 45_000);
    const ordersId = window.setInterval(loadOrders, 30_000);

    return () => {
      active = false;
      window.clearInterval(accountId);
      window.clearInterval(positionsId);
      window.clearInterval(ordersId);
    };
  }, [authStatus, realism]);

  useEffect(() => {
    if (!positions.length) {
      return;
    }
    setPositions((prev) =>
      prev.map((position) => {
        const mark = getSymbolPrice(position.symbol);
        const trail = [...(position.priceTrail ?? []), mark].slice(-30);
        return {
          ...position,
          markPrice: mark,
          priceTrail: trail
        };
      })
    );
  }, [getSymbolPrice, positions.length, setPositions]);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !selectedSymbol) return undefined;
    let active = true;

    async function loadBars() {
      setChartLoading(true);
      setChartError(null);
      try {
        const response = await fetch(
          `/api/alpaca/bars?symbol=${encodeURIComponent(selectedSymbol)}&timeframe=${encodeURIComponent(timeframe)}`,
          { credentials: 'include' }
        );
        if (!active) return;
        if (!response.ok) {
          setChartError('Unable to load price history right now.');
          return;
        }
        const payload = await response.json();
        const bars = payload.data?.bars ?? [];
        const fallbackSeries = payload.data?.fallback;
        const transformed = bars.map((bar, index) => ({
          index,
          open: Number.parseFloat(bar.o ?? bar.open ?? 0) || 0,
          high: Number.parseFloat(bar.h ?? bar.high ?? 0) || 0,
          low: Number.parseFloat(bar.l ?? bar.low ?? 0) || 0,
          close: Number.parseFloat(bar.c ?? bar.close ?? 0) || 0,
          volume: Number.parseFloat(bar.v ?? bar.volume ?? 0) || 0,
          time: bar.t ?? bar.time ?? index
        }));
        setChartSeries(transformed);
        if (transformed.length) {
          const lastClose = transformed[transformed.length - 1].close;
          setLivePrices((prev) => ({ ...prev, [selectedSymbol]: lastClose }));
        }
        setChartError(fallbackSeries ? 'Alpaca is offline — using cached simulation data.' : null);
      } catch (error) {
        if (!active) return;
        setChartError('Unable to load price history right now.');
      } finally {
        if (active) {
          setChartLoading(false);
        }
      }
    }

    loadBars();
    const id = window.setInterval(loadBars, 60_000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [authStatus, selectedSymbol, timeframe]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return undefined;
    const term = watchQuery.trim();
    if (term.length < 2) {
      setSearchResults([]);
      return undefined;
    }
    let active = true;
    const handle = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/alpaca/assets?search=${encodeURIComponent(term)}&limit=25`, {
          credentials: 'include'
        });
        if (!active || !response.ok) return;
        const payload = await response.json();
        const assets = Array.isArray(payload.data?.assets) ? payload.data.assets : [];
        setSearchResults(assets);
      } catch (error) {
        if (active) setSearchResults([]);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(handle);
    };
  }, [authStatus, watchQuery]);

  useEffect(() => {
    if (watchQuery.trim() && searchResults.length) {
      setActiveWatchlistId('alpaca-search');
    }
  }, [searchResults.length, setActiveWatchlistId, watchQuery]);

  const chartData = chartSeries;
  const bestPrice = getSymbolPrice(selectedSymbol);

  const filteredWatchlists = useMemo(() => {
    const term = watchQuery.trim().toLowerCase();
    const baseLists = watchlists.map((list) => ({
      ...list,
      symbols: term
        ? list.symbols.filter((symbol) => {
            const haystack = `${symbol.symbol} ${symbol.name}`.toLowerCase();
            return haystack.includes(term);
          })
        : list.symbols
    }));

    if (!term) {
      return baseLists;
    }

    if (!searchResults.length) {
      return baseLists;
    }

    const searchList = {
      id: 'alpaca-search',
      name: 'Alpaca matches',
      description: 'Symbols returned by your live Alpaca search.',
      symbols: searchResults.map((asset) => ({
        symbol: asset.symbol,
        name: asset.name ?? asset.symbol,
        sector: asset.exchange ?? 'Asset',
        price: livePrices[asset.symbol] ?? 0,
        changePct: 0,
        volume: Number.parseFloat(asset.min_order_size ?? 0) || 0
      }))
    };

    return [searchList, ...baseLists];
  }, [livePrices, searchResults, watchQuery, watchlists]);

  const marketStatus = useMemo(() => {
    if (!clock) {
      return { isOpen: false, label: 'Loading…', clock: '--:--' };
    }
    const hours = clock.getHours();
    const minutes = clock.getMinutes();
    const isOpen = (hours > 9 || (hours === 9 && minutes >= 30)) && (hours < 16 || (hours === 16 && minutes === 0));
    return {
      isOpen,
      label: isOpen ? 'Open' : 'Closed',
      clock: clock.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    };
  }, [clock]);

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

  const handleChartDoubleClick = useCallback(
    (price) => {
      const rounded = roundTo(price, 2);
      setPendingMarkers((prev) => ({
        ...prev,
        entry: rounded
      }));

      setOrderDraft((prev) => ({
        ...prev,
        type: 'limit',
        limitPrice: rounded,
        stopPrice: prev.stopPrice ?? roundTo(rounded * (prev.side === 'buy' ? 0.98 : 1.02), 2),
        targetPrice: prev.targetPrice ?? roundTo(rounded * (prev.side === 'buy' ? 1.02 : 0.98), 2)
      }));
    },
    []
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

  const pushToast = useCallback(
    (toast) => {
      setToastQueue((prev) => {
        toastIdRef.current += 1;
        const generatedId = `toast-${toastIdRef.current}`;
        const id = toast.id ?? generatedId;
        return [...prev.slice(-3), { ...toast, id }];
      });
    },
    [toastIdRef]
  );

  const dismissToast = useCallback((id) => {
    setToastQueue((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const appendJournal = useCallback((entry) => {
    setJournalEntries((prev) => [{ ...entry }, ...prev.slice(0, 24)]);
  }, [setJournalEntries]);

  const handleAddSymbol = useCallback(() => {
    const targetList = watchlists.find((list) => list.id === activeWatchlistId);
    if (!targetList) {
      pushToast({ title: 'No list selected', message: 'Pick a watchlist before adding symbols.' });
      return;
    }

    const tickerInput = window.prompt('Enter symbol ticker (e.g. AMZN)');
    if (!tickerInput) return;
    const ticker = tickerInput.trim().toUpperCase();
    if (!ticker) return;

    const nameInput = window.prompt('Asset name', ticker) || ticker;
    const priceInput = Number.parseFloat(window.prompt('Starting price', '100'));
    const price = Number.isFinite(priceInput) && priceInput > 0 ? priceInput : 100;

    let added = false;
    setWatchlists((prev) =>
      prev.map((list) => {
        const clonedSymbols = list.symbols.map((symbol) => ({ ...symbol }));
        if (list.id !== activeWatchlistId) {
          return { ...list, symbols: clonedSymbols };
        }
        if (clonedSymbols.some((symbol) => symbol.symbol === ticker)) {
          return { ...list, symbols: clonedSymbols };
        }
        added = true;
        return {
          ...list,
          symbols: [
            { symbol: ticker, name: nameInput, sector: 'Custom', price, changePct: 0, volume: 0 },
            ...clonedSymbols
          ]
        };
      })
    );

    if (added) {
      setSelectedSymbol(ticker);
      setWatchQuery('');
      pushToast({ title: 'Symbol added', message: `${ticker} pinned to ${targetList.name}.` });
    } else {
      pushToast({ title: 'Already watching', message: `${ticker} is already in this list.` });
    }
  }, [activeWatchlistId, pushToast, setSelectedSymbol, setWatchQuery, setWatchlists, watchlists]);

  const handleGuidedTrade = useCallback(() => {
    const entry = roundTo(getSymbolPrice(selectedSymbol), 2);
    const stop = roundTo(entry * 0.98, 2);
    const target = roundTo(entry * 1.02, 2);
    const riskCapital = account.equity ? account.equity * 0.02 : account.buyingPower * 0.02;
    const perShareRisk = Math.max(0.01, entry - stop);
    const maxShares = Math.max(0.01, account.buyingPower / Math.max(entry, 0.01));
    const suggestedShares = Math.max(0.01, Math.min(maxShares, riskCapital / perShareRisk));
    const lots = Math.max(0.01, roundTo(suggestedShares / DEFAULT_LOT_SIZE, 2));

    setOrderDraft((prev) => ({
      ...prev,
      side: 'buy',
      type: 'market',
      quantityMode: 'shares',
      quantity: suggestedShares,
      lots,
      stopPrice: stop,
      targetPrice: target
    }));
    setPendingMarkers({ entry, stop, target });
    setShowFlowOverview(false);
    ticketRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    pushToast({ title: 'Guided trade ready', message: 'We prefilled a starter ticket — review and run it.' });
  }, [
    account.buyingPower,
    account.equity,
    getSymbolPrice,
    pushToast,
    selectedSymbol,
    setOrderDraft,
    setPendingMarkers,
    setShowFlowOverview
  ]);

  const executeOrder = useCallback(
    async (draft, { symbol = selectedSymbol, source = 'ticket', quantityOverride } = {}) => {
      setPlacing(true);
      const quantity = Math.max(0.01, quantityOverride ?? draft.quantity);
      const basePrice =
        draft.type === 'market' ? getSymbolPrice(symbol) : draft.limitPrice ?? getSymbolPrice(symbol);
      const direction = draft.side === 'buy' ? 1 : -1;
      const slip = (realismConfig.slippageBps / 10000) * basePrice;
      const fillPrice = roundTo(basePrice + direction * slip, 2);
      const fees = roundTo(fillPrice * quantity * 0.0005, 2);
      const series = symbol === selectedSymbol ? chartSeries : [];
      const candleIndex = series.length ? series[series.length - 1].index : 0;
      const timestamp = Date.now();

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
                ? {
                    ...position,
                    quantity: newQty,
                    entryPrice: roundTo(newEntry, 4),
                    markPrice: getSymbolPrice(symbol),
                    priceTrail: [...(position.priceTrail ?? []), fillPrice].slice(-30)
                  }
                : position
            );
          } else {
            const newPosition = {
              id: `pos-${timestamp}`,
              symbol,
              side: 'long',
              quantity,
              entryPrice: fillPrice,
              markPrice: getSymbolPrice(symbol),
              openedAt: timestamp,
              priceTrail: [fillPrice]
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
                ? {
                    ...position,
                    quantity: remaining,
                    markPrice: getSymbolPrice(symbol),
                    priceTrail: [...(position.priceTrail ?? []), fillPrice].slice(-30)
                  }
                : position
            );
          }
          nextCash = account.cash + fillPrice * quantity - fees;
        }

        const summary = deriveAccountSummary(nextPositions, nextCash, getSymbolPrice, account.startingBalance);
        setAccount(summary);
        setEquityTimeline((prev) => [...prev.slice(-98), { timestamp, equity: summary.equity }]);

        const orderRecord = {
          id: `order-${timestamp}`,
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
          timestamp,
          pnl: roundTo(realizedPnl, 2),
          source,
          index: candleIndex
        };

        setOrders((prev) => [orderRecord, ...prev.slice(0, 99)]);

        if (realizedPnl !== 0) {
          appendJournal({
            id: `journal-${timestamp}`,
            symbol,
            side: draft.side,
            quantity,
            price: fillPrice,
            timestamp,
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
            timestamp
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

        setLastAction({ symbol, side: draft.side, quantity, price: fillPrice, timestamp });
        setShowFlowOverview(false);

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
    [
      account.cash,
      account.startingBalance,
      appendJournal,
      getSymbolPrice,
      pushToast,
      realismConfig,
      selectedSymbol,
      setAccount,
      setEquityTimeline,
      setJournalDraft,
      setLastAction,
      setOrders,
      setPendingMarkers,
      setPlacing,
      setPositions,
      setShowFlowOverview,
      setOrderDraft,
      chartSeries
    ]
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
      const qty = Math.max(0.01, roundTo(position.quantity * fraction, 4));
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

  const lastActionCopy = useMemo(() => {
    if (!lastAction) {
      return 'No trades yet';
    }
    const time = new Date(lastAction.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const verb = lastAction.side === 'buy' ? 'Bought' : 'Sold';
    return `${verb} ${lastAction.quantity} ${lastAction.symbol} · ${formatCurrency(lastAction.price)} · ${time}`;
  }, [lastAction]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7F5] text-[#102019]">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Teen Challenge Account</p>
              <p className="text-xs text-slate-500">AlgoTeen Paper Desk</p>
            </div>
            <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              Simulated
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Equity</p>
              <p className="mt-1 font-semibold text-slate-900">{formatCurrency(account.equity)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Cash</p>
              <p className="mt-1 font-semibold text-slate-900">{formatCurrency(account.cash)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Buying power</p>
              <p className="mt-1 font-semibold text-slate-900">{formatCurrency(account.buyingPower)}</p>
            </div>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 pb-3 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                marketStatus.isOpen
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {marketStatus.label}
            </span>
            <span>{marketStatus.clock}</span>
          </div>
          <div className="flex items-center gap-2">
            {REALISM_LEVELS.map((level) => {
              const isActive = level.id === realism;
              return (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => setRealism(level.id)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                    isActive
                      ? 'bg-blue-700 text-white shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  {level.name}
                </button>
              );
            })}
          </div>
          <div className="text-xs font-medium text-slate-500">Last action: {lastActionCopy}</div>
        </div>
      </header>

      <div className="flex flex-1">
        <WatchlistPanel
          lists={filteredWatchlists}
          activeListId={activeWatchlistId}
          onSelectList={setActiveWatchlistId}
          onSelectSymbol={(symbol) => {
            setSelectedSymbol(symbol);
            setPendingMarkers({ entry: null, stop: null, target: null });
            setWatchQuery('');
          }}
          selectedSymbol={selectedSymbol}
          reference={watchlistRef}
          searchQuery={watchQuery}
          onSearchChange={setWatchQuery}
          onAddSymbol={handleAddSymbol}
        />

        <main className="flex min-w-0 flex-1 justify-center px-6 py-6">
          <div className="flex w-full max-w-5xl flex-col gap-6">
            {showFlowOverview ? (
            <section className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Flow overview</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Watchlist → chart → ticket → positions. Start on the left, finish on the right — no zig-zag required.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFlowOverview(false)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900"
                >
                  Got it
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-500">{realismConfig.description}</p>
            </section>
            ) : (
              <button
                type="button"
                onClick={() => setShowFlowOverview(true)}
                className="flex items-center justify-between rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-4 text-left text-xs font-medium text-slate-500 shadow-sm transition hover:border-slate-400"
              >
                <span>Flow overview hidden. Tap to reopen the guided tips.</span>
                <span className="text-blue-700">Show tips</span>
              </button>
            )}

            <div className="relative">
              <TradeChart
                data={chartData}
                symbol={selectedSymbol}
                overlays={overlayState}
                onToggleOverlay={handleOverlayToggle}
                onChartClick={handleChartClick}
                onChartDoubleClick={handleChartDoubleClick}
                onMarkerChange={handleMarkerChange}
                markers={pendingMarkers}
                filledOrders={orders.filter((order) => order.symbol === selectedSymbol && order.status === 'Filled')}
                activeSide={orderDraft.side}
                reference={chartRef}
                timeframe={timeframe}
                timeframeOptions={TIMEFRAME_PRESETS}
                onTimeframeChange={setTimeframe}
                marketStatus={marketStatus}
              />
              {chartLoading ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-3xl bg-white/65 text-sm font-medium text-slate-600">
                  Refreshing Alpaca data…
                </div>
              ) : null}
            </div>
            {chartError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {chartError}
              </div>
            ) : null}

            <OrderTicket
              data={{ positions, symbol: selectedSymbol }}
              draft={orderDraft}
              onDraftChange={setOrderDraft}
              onSubmit={handleOrderSubmit}
              disabled={placing}
              account={account}
              bestPrice={bestPrice}
              reference={ticketRef}
              lotSize={DEFAULT_LOT_SIZE}
              realismConfig={realismConfig}
              baselineRealism={REALISM_LEVELS[0]}
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
          </div>
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
          onGuidedTrade={handleGuidedTrade}
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
