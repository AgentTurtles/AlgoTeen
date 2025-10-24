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
import { DAILY_LOSS_LIMITS, JOURNAL_TAGS, WATCHLIST_PRESETS } from './data';
import { formatCurrency, getLocalStorageValue, roundTo, setLocalStorageValue } from './utils';

const DEFAULT_LOT_SIZE = 100;

const TIMEFRAME_PRESETS = [
  { id: '1D', label: '1D', bars: 78, timeframe: '5Min', limit: 120, lookbackDays: 5 },
  { id: '5D', label: '5D', bars: 130, timeframe: '15Min', limit: 180, lookbackDays: 14 },
  { id: '1M', label: '1M', bars: 30, timeframe: '1Day', limit: 60, lookbackDays: 90 },
  { id: '6M', label: '6M', bars: 130, timeframe: '1Day', limit: 200, lookbackDays: 240 },
  { id: '1Y', label: '1Y', bars: 260, timeframe: '1Day', limit: 400, lookbackDays: 420 }
];

function useStickyState(key, defaultValue) {
  // Initialize with the default on both server and initial client render to avoid
  // hydration mismatches. After mount, attempt to load a saved value from
  // localStorage and overwrite state if present.
  const [state, setState] = useState(defaultValue);

  useEffect(() => {
    try {
      const saved = getLocalStorageValue(key, null);
      if (saved != null) {
        setState(saved);
      }
    } catch (e) {
      // ignore
    }
  }, [key]);

  useEffect(() => {
    try {
      setLocalStorageValue(key, state);
    } catch (e) {}
  }, [key, state]);

  return [state, setState];
}

function formatSymbolForAlpaca(symbol, assetClass = 'stocks') {
  if (!symbol) {
    return symbol;
  }
  const base = symbol.toUpperCase();
  if (assetClass === 'crypto' || assetClass === 'forex') {
    return base.replace('/', '');
  }
  return base;
}

function normalizeSymbolForAssetClass(symbol, assetClass = 'stocks') {
  if (!symbol) {
    return '';
  }
  const trimmed = symbol.trim().toUpperCase();
  if (!trimmed) {
    return '';
  }
  if (assetClass === 'crypto' || assetClass === 'forex') {
    const sanitized = trimmed.replace(/[^A-Z0-9/]/g, '');
    if (sanitized.includes('/')) {
      const [base = '', quote = ''] = sanitized.split('/');
      const normalizedBase = base.replace(/[^A-Z0-9]/g, '');
      const normalizedQuote = quote.replace(/[^A-Z0-9]/g, '');
      if (!normalizedBase || !normalizedQuote) {
        return sanitized;
      }
      return `${normalizedBase}/${normalizedQuote}`;
    }
    const alphanumeric = sanitized.replace(/[^A-Z0-9]/g, '');
    if (alphanumeric.length >= 6) {
      const base = alphanumeric.slice(0, alphanumeric.length - 3);
      const quote = alphanumeric.slice(-3);
      return `${base}/${quote}`;
    }
    return alphanumeric;
  }
  return trimmed.replace(/[^A-Z0-9.]/g, '');
}

export default function PaperTradingWorkspace({ session: serverSession = null }) {
  const { status: authStatus } = useSession();
  const defaultLists = useMemo(
    () =>
      WATCHLIST_PRESETS.map((list) => ({
        ...list,
        symbols: list.symbols.map((symbol) => ({
          ...symbol,
          assetClass: symbol.assetClass ?? list.assetClass ?? 'stocks'
        }))
      })),
    []
  );
  const firstListId = defaultLists[0]?.id ?? null;
  const firstSymbol = defaultLists[0]?.symbols?.[0]?.symbol ?? null;

  const [watchlists, setWatchlists] = useStickyState('algoteen-paper-watchlists', defaultLists);

  useEffect(() => {
    setWatchlists((prev) => {
      let changed = false;
      const normalizedLists = prev.map((list) => {
        let listChanged = false;
        const defaultClass = list.assetClass ?? 'stocks';
        const symbols = Array.isArray(list.symbols)
          ? list.symbols.map((symbol) => {
              const resolvedClass = symbol.assetClass ?? defaultClass;
              const normalizedSymbol = normalizeSymbolForAssetClass(symbol.symbol, resolvedClass);
              if (symbol.symbol === normalizedSymbol && symbol.assetClass === resolvedClass) {
                return symbol;
              }
              listChanged = true;
              return { ...symbol, symbol: normalizedSymbol, assetClass: resolvedClass };
            })
          : [];
        if (listChanged) {
          changed = true;
          return { ...list, symbols };
        }
        return list;
      });
      return changed ? normalizedLists : prev;
    });
  }, [setWatchlists]);

  const flattenSymbols = useMemo(
    () =>
      watchlists.flatMap((list) =>
        list.symbols.map((symbol) => ({
          ...symbol,
          assetClass: symbol.assetClass ?? list.assetClass ?? 'stocks'
        }))
      ),
    [watchlists]
  );

  const [activeWatchlistId, setActiveWatchlistId] = useStickyState(
    'algoteen-paper-watchlist',
    firstListId
  );
  const [selectedSymbol, setSelectedSymbol] = useStickyState('algoteen-paper-symbol', firstSymbol);
  const [timeframe, setTimeframe] = useStickyState('algoteen-paper-timeframe', '1D');
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

  const [toastQueue, setToastQueue] = useState([]);
  const [alpacaStatus, setAlpacaStatus] = useState({ loading: true, connected: false, account: null, error: null });
  const [credentialsDraft, setCredentialsDraft] = useState({ apiKey: '', secretKey: '', submitting: false, error: null });
  const [disconnecting, setDisconnecting] = useState(false);
  const toastIdRef = useRef(0);
  const [journalDraft, setJournalDraft] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [clock, setClock] = useState(null);
  const [livePrices, setLivePrices] = useState({});
  const [searchResults, setSearchResults] = useState([]);
  const [watchlistSnapshots, setWatchlistSnapshots] = useState({});
  const [watchlistStatus, setWatchlistStatus] = useState({ loading: false, error: null, lastUpdated: null });

  const watchlistRequestRef = useRef(0);
  const mountedRef = useRef(true);

  const watchlistRef = useRef(null);
  const chartRef = useRef(null);
  const ticketRef = useRef(null);
  const positionsRef = useRef(null);

  const pushToast = useCallback((toast) => {
    setToastQueue((prev) => {
      toastIdRef.current += 1;
      const generatedId = `toast-${toastIdRef.current}`;
      const id = toast.id ?? generatedId;
      return [...prev.slice(-3), { ...toast, id }];
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadAccount = useCallback(async () => {
    if (authStatus !== 'authenticated' || !alpacaStatus.connected) {
      return;
    }
    try {
      const response = await fetch('/api/alpaca/account', { credentials: 'include' });
      if (!response.ok) {
        return;
      }
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
      // ignore network errors
    }
  }, [alpacaStatus.connected, authStatus]);

  const loadPositions = useCallback(async () => {
    if (authStatus !== 'authenticated' || !alpacaStatus.connected) {
      return;
    }
    try {
      const response = await fetch('/api/alpaca/positions', { credentials: 'include' });
      if (!response.ok) {
        return;
      }
      const payload = await response.json();
      const list = Array.isArray(payload.data) ? payload.data : [];
      setPositions((current) =>
        list.map((item) => {
          const id = item.asset_id ?? `${item.symbol}-${item.side ?? 'long'}`;
          const existing = current.find((position) => position.id === id);
          return {
            id,
            symbol: item.symbol,
            quantity: Number.parseFloat(item.qty ?? item.quantity ?? 0) || 0,
            entryPrice: Number.parseFloat(item.avg_entry_price ?? 0) || 0,
            marketValue: Number.parseFloat(item.market_value ?? 0) || 0,
            side: (item.side ?? 'long').toLowerCase(),
            markPrice: Number.parseFloat(item.current_price ?? item.avg_entry_price ?? 0) || 0,
            unrealizedPl: Number.parseFloat(item.unrealized_pl ?? 0) || 0,
            unrealizedPlpc: Number.parseFloat(item.unrealized_plpc ?? 0) || 0,
            priceTrail: existing?.priceTrail ?? []
          };
        })
      );
    } catch (error) {
      // ignore
    }
  }, [alpacaStatus.connected, authStatus]);

  const loadOrders = useCallback(async () => {
    if (authStatus !== 'authenticated' || !alpacaStatus.connected) {
      return;
    }
    try {
      const response = await fetch('/api/alpaca/orders?status=all&limit=100&direction=desc', {
        credentials: 'include'
      });
      if (!response.ok) {
        return;
      }
      const payload = await response.json();
      const list = Array.isArray(payload.data) ? payload.data : [];
      const mapped = list.map((order) => {
        const submittedAt = order.submitted_at ? Date.parse(order.submitted_at) : Date.now();
        const updatedAt = order.updated_at ? Date.parse(order.updated_at) : null;
        const filledAvgPrice = order.filled_avg_price != null ? Number.parseFloat(order.filled_avg_price) || 0 : null;
        const limitPrice = order.limit_price != null ? Number.parseFloat(order.limit_price) || 0 : null;
        const stopPrice = order.stop_price != null ? Number.parseFloat(order.stop_price) || 0 : null;
        const displayPrice =
          filledAvgPrice != null
            ? filledAvgPrice
            : limitPrice != null && limitPrice !== 0
              ? limitPrice
              : stopPrice != null
                ? stopPrice
                : null;
        return {
          id: order.id,
          symbol: order.symbol,
          side: order.side,
          quantity: Number.parseFloat(order.qty ?? 0) || 0,
          filledQuantity: Number.parseFloat(order.filled_qty ?? 0) || 0,
          filledAvgPrice,
          type: order.type,
          status: order.status,
          limitPrice,
          stopPrice,
          timeInForce: order.time_in_force,
          orderClass: order.order_class ?? null,
          submittedAt: Number.isFinite(submittedAt) ? submittedAt : Date.now(),
          updatedAt: Number.isFinite(updatedAt) ? updatedAt : null,
          legs: Array.isArray(order.legs) ? order.legs : [],
          notional: order.notional != null ? Number.parseFloat(order.notional) || null : null,
          price: displayPrice,
          index: null
        };
      });
      mapped.sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0));
      setOrders(mapped);
    } catch (error) {
      // ignore
    }
  }, [alpacaStatus.connected, authStatus]);

  const refreshCredentials = useCallback(async () => {
    if (authStatus !== 'authenticated') {
      setAlpacaStatus({ loading: false, connected: false, account: null, error: null });
      return;
    }
    setAlpacaStatus((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch('/api/alpaca/credentials', { credentials: 'include' });
      if (!response.ok) {
        if (response.status === 401) {
          setAlpacaStatus({ loading: false, connected: false, account: null, error: null });
          return;
        }
        throw new Error('Unable to load Alpaca credentials');
      }
      const payload = await response.json();
      setAlpacaStatus({
        loading: false,
        connected: Boolean(payload?.hasCredentials),
        account: payload?.account ?? null,
        error: null
      });
    } catch (error) {
      setAlpacaStatus({
        loading: false,
        connected: false,
        account: null,
        error: 'Unable to reach Alpaca credentials right now.'
      });
    }
  }, [authStatus]);

  const connectAlpaca = useCallback(
    async () => {
      const apiKey = credentialsDraft.apiKey.trim();
      const secretKey = credentialsDraft.secretKey.trim();

      if (!apiKey || !secretKey) {
        setCredentialsDraft((prev) => ({
          ...prev,
          error: 'Enter both your Alpaca API key and secret key to connect.'
        }));
        return;
      }

      setAlpacaStatus((prev) => ({ ...prev, error: null }));
      setCredentialsDraft((prev) => ({ ...prev, submitting: true, error: null }));
      try {
        const response = await fetch('/api/alpaca/credentials', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey, secretKey })
        });

        let payload = {};
        try {
          payload = await response.json();
        } catch (error) {
          payload = {};
        }

        if (!response.ok) {
          throw new Error(payload?.error ?? 'Unable to connect to Alpaca right now.');
        }

        setCredentialsDraft({ apiKey: '', secretKey: '', submitting: false, error: null });
        setAlpacaStatus({
          loading: false,
          connected: true,
          account: payload?.account ?? null,
          error: null
        });

        pushToast({ title: 'Alpaca connected', message: 'Paper account ready — live orders now route to Alpaca.' });

        await Promise.all([loadAccount(), loadPositions(), loadOrders()]);
      } catch (error) {
        const message = error?.message ?? 'Unable to connect to Alpaca right now.';
        setCredentialsDraft((prev) => ({ ...prev, submitting: false, error: message }));
        setAlpacaStatus((prev) => ({ ...prev, loading: false, connected: false, error: message }));
      }
    },
    [
      credentialsDraft.apiKey,
      credentialsDraft.secretKey,
      loadAccount,
      loadOrders,
      loadPositions,
      pushToast
    ]
  );

  const disconnectAlpaca = useCallback(
    async () => {
      setDisconnecting(true);
      try {
        const response = await fetch('/api/alpaca/credentials', {
          method: 'DELETE',
          credentials: 'include'
        });

        let payload = {};
        try {
          payload = await response.json();
        } catch (error) {
          payload = {};
        }

        if (!response.ok) {
          throw new Error(payload?.error ?? 'Unable to disconnect from Alpaca right now.');
        }

        setAlpacaStatus({ loading: false, connected: false, account: null, error: null });
        setCredentialsDraft({ apiKey: '', secretKey: '', submitting: false, error: null });
        setAccount({ equity: 0, cash: 0, buyingPower: 0, reserved: 0, startingBalance: 0 });
        setPositions([]);
        setOrders([]);
        setEquityTimeline([]);
        setLastAction(null);
        pushToast({ title: 'Alpaca disconnected', message: 'Removed keys — reconnect when you are ready to trade.' });
      } catch (error) {
        const message = error?.message ?? 'Unable to disconnect from Alpaca right now.';
        pushToast({ title: 'Disconnect failed', message });
      } finally {
        setDisconnecting(false);
      }
    },
    [pushToast]
  );

  useEffect(() => {
    refreshCredentials();
  }, [refreshCredentials]);

  useEffect(() => {
    setClock(new Date());
    const id = window.setInterval(() => setClock(new Date()), 60000);
    return () => window.clearInterval(id);
  }, []);

  const getSymbolMeta = useCallback(
    (symbol) => flattenSymbols.find((item) => item.symbol === symbol),
    [flattenSymbols]
  );

  const getSymbolPrice = useCallback(
    (symbol) => {
      if (!symbol) {
        return 0;
      }
      const live = livePrices[symbol];
      if (Number.isFinite(live)) {
        return live;
      }
      const snapshot = watchlistSnapshots[symbol];
      if (snapshot && Number.isFinite(snapshot.price)) {
        return snapshot.price;
      }
      const meta = getSymbolMeta(symbol);
      if (meta && Number.isFinite(meta.price)) {
        return meta.price;
      }
      return 0;
    },
    [getSymbolMeta, livePrices, watchlistSnapshots]
  );

  const refreshWatchlistData = useCallback(async () => {
    const uniqueMap = new Map();
    flattenSymbols.forEach((item) => {
      if (!item?.symbol) {
        return;
      }
      const assetClass = (item.assetClass ?? 'stocks').toLowerCase();
      const key = `${assetClass}|${item.symbol}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, { symbol: item.symbol, assetClass });
      }
    });

    const symbolsToFetch = Array.from(uniqueMap.values());
    if (!symbolsToFetch.length) {
      if (!mountedRef.current) {
        return;
      }
      setWatchlistSnapshots({});
      setWatchlistStatus((prev) => ({ ...prev, loading: false, error: null }));
      return;
    }

    const requestId = watchlistRequestRef.current + 1;
    watchlistRequestRef.current = requestId;

    setWatchlistStatus((prev) => ({ ...prev, loading: true, error: null }));

    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    const start = new Date(now);
    start.setDate(start.getDate() - 10);
    const startDate = start.toISOString().slice(0, 10);

    const tasks = symbolsToFetch.map(async (meta) => {
      const params = new URLSearchParams({
        assetClass: meta.assetClass,
        symbol: meta.symbol,
        timeframe: meta.assetClass === 'crypto' ? '1Hour' : '1Day',
        start: startDate,
        end,
        limit: '120'
      });

      let payload = null;
      let response;
      try {
        response = await fetch(`/api/market-data?${params.toString()}`, { cache: 'no-store' });
      } catch (error) {
        throw new Error('Unable to reach Polygon market data.');
      }

      try {
        payload = await response.json();
      } catch (error) {
        payload = null;
      }

      if (!response.ok) {
        const message = payload?.error ?? `Polygon request failed (status ${response.status}).`;
        throw new Error(message);
      }

      if (!payload) {
        throw new Error('Failed to parse Polygon response.');
      }

      const bars = Array.isArray(payload?.bars) ? payload.bars : [];
      if (!bars.length) {
        throw new Error('No Polygon data available.');
      }

      const normalized = bars
        .map((bar) => ({
          close: Number.parseFloat(bar.close ?? bar.c ?? 0) || 0,
          open: Number.parseFloat(bar.open ?? bar.o ?? 0) || 0,
          volume: Number.parseFloat(bar.volume ?? bar.v ?? 0) || 0
        }))
        .filter(
          (bar) =>
            Number.isFinite(bar.close) &&
            Number.isFinite(bar.open) &&
            Number.isFinite(bar.volume)
        );

      const last = normalized[normalized.length - 1];
      if (!last) {
        throw new Error('No Polygon data available.');
      }
      const previous = normalized.length > 1 ? normalized[normalized.length - 2] : null;
      const previousClose = previous?.close ?? last.open ?? last.close;
      const price = last.close;
      const changePct = previousClose ? ((price - previousClose) / previousClose) * 100 : 0;

      return {
        symbol: meta.symbol,
        assetClass: meta.assetClass,
        price,
        changePct,
        volume: last.volume,
        updatedAt: Date.now()
      };
    });

    const results = await Promise.allSettled(tasks);

    if (!mountedRef.current || watchlistRequestRef.current !== requestId) {
      return;
    }

    const updates = {};
    const errors = [];

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        updates[result.value.symbol] = result.value;
      } else {
        errors.push(result.reason?.message ?? 'Unknown Polygon error.');
      }
    });

    if (Object.keys(updates).length) {
      setWatchlistSnapshots((prev) => {
        const next = {};
        symbolsToFetch.forEach((meta) => {
          const update = updates[meta.symbol];
          if (update) {
            next[meta.symbol] = {
              price: update.price,
              changePct: update.changePct,
              volume: update.volume,
              assetClass: update.assetClass,
              updatedAt: update.updatedAt
            };
          } else if (prev[meta.symbol]) {
            next[meta.symbol] = prev[meta.symbol];
          }
        });
        return next;
      });

      setLivePrices((prev) => {
        const next = { ...prev };
        Object.values(updates).forEach((data) => {
          if (Number.isFinite(data.price)) {
            next[data.symbol] = data.price;
          }
        });
        return next;
      });
    } else {
      setWatchlistSnapshots((prev) => {
        const next = {};
        symbolsToFetch.forEach((meta) => {
          if (prev[meta.symbol]) {
            next[meta.symbol] = prev[meta.symbol];
          }
        });
        return next;
      });
    }

    setWatchlistStatus((prev) => ({
      loading: false,
      error:
        errors.length === 0
          ? null
          : errors.length === symbolsToFetch.length
            ? 'Unable to refresh Polygon market data right now.'
            : 'Some symbols failed to refresh from Polygon.',
      lastUpdated: Object.keys(updates).length ? Date.now() : prev.lastUpdated
    }));
  }, [flattenSymbols]);

  useEffect(() => {
    refreshWatchlistData();
    const interval = window.setInterval(() => {
      refreshWatchlistData();
    }, 60_000);
    return () => {
      window.clearInterval(interval);
    };
  }, [refreshWatchlistData]);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !alpacaStatus.connected) {
      return undefined;
    }
    let active = true;

    const bootstrap = async () => {
      await Promise.all([loadAccount(), loadPositions(), loadOrders()]);
    };

    bootstrap();

    const accountId = window.setInterval(() => {
      if (active) {
        loadAccount();
      }
    }, 60_000);
    const positionsId = window.setInterval(() => {
      if (active) {
        loadPositions();
      }
    }, 45_000);
    const ordersId = window.setInterval(() => {
      if (active) {
        loadOrders();
      }
    }, 30_000);

    return () => {
      active = false;
      window.clearInterval(accountId);
      window.clearInterval(positionsId);
      window.clearInterval(ordersId);
    };
  }, [alpacaStatus.connected, authStatus, loadAccount, loadOrders, loadPositions]);

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
    if (!Number.isFinite(account.equity) || account.equity <= 0) {
      return;
    }
    setEquityTimeline((prev) => {
      const nextPoint = { timestamp: Date.now(), equity: roundTo(account.equity, 2) };
      const last = prev[prev.length - 1];
      if (last && Math.abs(last.equity - nextPoint.equity) < 0.01) {
        return prev;
      }
      return [...prev.slice(-98), nextPoint];
    });
  }, [account.equity, setEquityTimeline]);

  useEffect(() => {
    if (typeof window === 'undefined' || !selectedSymbol) {
      return undefined;
    }
    const preset = TIMEFRAME_PRESETS.find((option) => option.id === timeframe);
    const resolution = preset?.timeframe ?? '1Day';
    if (resolution.toLowerCase().includes('day')) {
      return undefined;
    }
    const interval = window.setInterval(() => {
      const quote = getSymbolPrice(selectedSymbol);
      setLivePrices((prev) => ({ ...prev, [selectedSymbol]: quote }));
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [getSymbolPrice, selectedSymbol, timeframe]);

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

  const rawBestPrice = getSymbolPrice(selectedSymbol);
  const bestPrice = Number.isFinite(rawBestPrice) ? rawBestPrice : 0;

  const filteredWatchlists = useMemo(() => {
    const term = watchQuery.trim().toLowerCase();
    const applyMetrics = (symbol) => {
      const metrics = watchlistSnapshots[symbol.symbol];
      const live = livePrices[symbol.symbol];
      const price = Number.isFinite(metrics?.price)
        ? metrics.price
        : Number.isFinite(live)
          ? live
          : 0;
      const changePct = Number.isFinite(metrics?.changePct) ? metrics.changePct : 0;
      const volume = Number.isFinite(metrics?.volume) ? metrics.volume : 0;
      return {
        ...symbol,
        price,
        changePct,
        volume
      };
    };

    const baseLists = watchlists.map((list) => {
      const symbols = term
        ? list.symbols.filter((symbol) => {
            const haystack = `${symbol.symbol} ${symbol.name}`.toLowerCase();
            return haystack.includes(term);
          })
        : list.symbols;
      return {
        ...list,
        symbols: symbols.map(applyMetrics)
      };
    });

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
      assetClass: 'stocks',
      symbols: searchResults.map((asset) => {
        const lookup = normalizeSymbolForAssetClass(asset.symbol ?? '', 'stocks');
        const metrics = watchlistSnapshots[lookup];
        const live = livePrices[lookup];
        const price = Number.isFinite(metrics?.price)
          ? metrics.price
          : Number.isFinite(live)
            ? live
            : 0;
        const changePct = Number.isFinite(metrics?.changePct) ? metrics.changePct : 0;
        const volume = Number.isFinite(metrics?.volume)
          ? metrics.volume
          : Number.parseFloat(asset.min_order_size ?? 0) || 0;
        return {
          symbol: lookup || asset.symbol,
          name: asset.name ?? asset.symbol,
          sector: asset.exchange ?? 'Asset',
          price,
          changePct,
          volume,
          assetClass: 'stocks'
        };
      })
    };

    return [searchList, ...baseLists];
  }, [livePrices, searchResults, watchQuery, watchlistSnapshots, watchlists]);

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

  const selectedMeta = useMemo(() => getSymbolMeta(selectedSymbol), [getSymbolMeta, selectedSymbol]);

  useEffect(() => {
    if (!Number.isFinite(rawBestPrice) || rawBestPrice <= 0) {
      return;
    }
    setOrderDraft((prev) => ({
      ...prev,
      limitPrice: prev.type === 'market' ? prev.limitPrice : roundTo(rawBestPrice, 2)
    }));
  }, [rawBestPrice, setOrderDraft]);

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

    const inferredClass = targetList.assetClass ?? 'stocks';
    const tickerInput = window.prompt('Enter symbol ticker (e.g. AMZN or BTC/USD)');
    if (!tickerInput) return;
    const normalizedTicker = normalizeSymbolForAssetClass(tickerInput, inferredClass);
    if (!normalizedTicker) {
      pushToast({ title: 'Invalid symbol', message: 'Enter a valid ticker before adding it to your watchlist.' });
      return;
    }

    const nameInput = window.prompt('Asset name', normalizedTicker) || normalizedTicker;

    let added = false;
    setWatchlists((prev) =>
      prev.map((list) => {
        const clonedSymbols = list.symbols.map((symbol) => ({ ...symbol }));
        if (list.id !== activeWatchlistId) {
          return { ...list, symbols: clonedSymbols };
        }
        if (clonedSymbols.some((symbol) => symbol.symbol === normalizedTicker)) {
          return { ...list, symbols: clonedSymbols };
        }
        added = true;
        return {
          ...list,
          symbols: [
            { symbol: normalizedTicker, name: nameInput, sector: 'Custom', assetClass: inferredClass },
            ...clonedSymbols
          ]
        };
      })
    );

    if (added) {
      setSelectedSymbol(normalizedTicker);
      setWatchQuery('');
      refreshWatchlistData();
      pushToast({ title: 'Symbol added', message: `${normalizedTicker} pinned to ${targetList.name}.` });
    } else {
      pushToast({ title: 'Already watching', message: `${normalizedTicker} is already in this list.` });
    }
  }, [
    activeWatchlistId,
    pushToast,
    refreshWatchlistData,
    setSelectedSymbol,
    setWatchQuery,
    setWatchlists,
    watchlists
  ]);

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
    ticketRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    pushToast({ title: 'Guided trade ready', message: 'We prefilled a starter ticket — review and run it.' });
  }, [
    account.buyingPower,
    account.equity,
    getSymbolPrice,
    pushToast,
    selectedSymbol,
    setOrderDraft
  ]);

  const submitOrder = useCallback(
    async (draft, { symbol = selectedSymbol, source = 'ticket', quantityOverride } = {}) => {
      if (!symbol) {
        pushToast({ title: 'Select a symbol', message: 'Choose something from your watchlist before sending an order.' });
        return;
      }
      if (authStatus !== 'authenticated') {
        pushToast({ title: 'Sign in required', message: 'Connect your Alpaca paper account to trade in real time.' });
        return;
      }

      if (!alpacaStatus.connected) {
        pushToast({ title: 'Connect Alpaca', message: 'Link your Alpaca paper keys before placing live paper orders.' });
        return;
      }

      const meta = getSymbolMeta(symbol);
      const assetClass = meta?.assetClass ?? 'stocks';
      const normalizedSymbol = formatSymbolForAlpaca(symbol, assetClass);

      const rawQuantity = quantityOverride ?? draft.quantity ?? 0;
      const quantity = Math.max(0.0001, Number.parseFloat(rawQuantity) || 0);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        pushToast({ title: 'Invalid quantity', message: 'Quantity must be above zero.' });
        return;
      }
      const normalizedQty = roundTo(quantity, 4);

      const marketPrice = getSymbolPrice(symbol);
      const ensurePrice = (value) => {
        const parsed = Number.parseFloat(value);
        if (!Number.isFinite(parsed)) return null;
        return roundTo(parsed, 4);
      };

      const payload = {
        symbol: normalizedSymbol,
        side: draft.side,
        qty: normalizedQty.toString(),
        type: 'market',
        time_in_force: draft.timeInForce ?? 'day'
      };

      if (draft.type === 'limit') {
        payload.type = 'limit';
        const limitPrice = ensurePrice(draft.limitPrice ?? marketPrice);
        if (limitPrice != null) {
          payload.limit_price = limitPrice;
        }
      } else if (draft.type === 'stop') {
        const stopTrigger = ensurePrice(draft.stopTrigger ?? draft.stopPrice ?? marketPrice);
        if (draft.stopLimit != null) {
          payload.type = 'stop_limit';
          const stopLimit = ensurePrice(draft.stopLimit);
          if (stopLimit != null) {
            payload.limit_price = stopLimit;
          }
        } else {
          payload.type = 'stop';
        }
        if (stopTrigger != null) {
          payload.stop_price = stopTrigger;
        }
      } else {
        payload.type = 'market';
      }

      const stopAttachment = ensurePrice(draft.stopPrice);
      const targetAttachment = ensurePrice(draft.targetPrice);

      if (draft.bracket && stopAttachment != null && targetAttachment != null) {
        payload.order_class = 'bracket';
        payload.take_profit = { limit_price: targetAttachment };
        payload.stop_loss = { stop_price: stopAttachment };
      } else if (draft.oco && (stopAttachment != null || targetAttachment != null)) {
        payload.order_class = 'oco';
        if (targetAttachment != null) {
          payload.take_profit = { limit_price: targetAttachment };
        }
        if (stopAttachment != null) {
          payload.stop_loss = { stop_price: stopAttachment };
        }
      } else if (!draft.bracket && !draft.oco) {
        if (stopAttachment != null || targetAttachment != null) {
          payload.order_class = 'oto';
          if (targetAttachment != null) {
            payload.take_profit = { limit_price: targetAttachment };
          }
          if (stopAttachment != null) {
            payload.stop_loss = { stop_price: stopAttachment };
          }
          if (!payload.take_profit && !payload.stop_loss) {
            delete payload.order_class;
          }
        }
      }

      setPlacing(true);
      try {
        const response = await fetch('/api/alpaca/orders', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        let json = null;
        try {
          json = await response.json();
        } catch (error) {
          json = null;
        }

        if (!response.ok) {
          const message = json?.error ?? 'Alpaca rejected the order.';
          pushToast({ title: 'Order rejected', message });
          return;
        }

        const order = json?.data ?? {};
        const submittedAt = order.submitted_at ? Date.parse(order.submitted_at) : Date.now();
        const orderQty = Number.parseFloat(order.qty ?? order.quantity ?? normalizedQty) || normalizedQty;
        const filledPrice = order.filled_avg_price != null ? Number.parseFloat(order.filled_avg_price) : null;
        const fallbackPrice =
          filledPrice ??
          ensurePrice(draft.limitPrice ?? draft.stopTrigger ?? draft.stopPrice ?? draft.targetPrice ?? marketPrice) ??
          marketPrice;
        const actionTimestamp = Number.isFinite(submittedAt) ? submittedAt : Date.now();
        const roundedPrice = roundTo(fallbackPrice, 4);
        const roundedQty = roundTo(orderQty, 4);

        setLastAction({
          symbol,
          side: order.side ?? draft.side,
          quantity: roundedQty,
          price: roundedPrice,
          timestamp: actionTimestamp
        });
        setOrderDraft((prev) => ({ ...prev, stopPrice: null, targetPrice: null }));
        setJournalDraft({
          symbol,
          side: order.side ?? draft.side,
          quantity: roundedQty,
          price: roundedPrice,
          timestamp: actionTimestamp,
          source
        });
        pushToast({
          title: 'Order submitted',
          message: `Sent ${draft.side.toUpperCase()} ${roundedQty} ${symbol} via Alpaca.`,
          action: {
            label: 'View orders',
            onClick: () => {
              document.getElementById('paper-rail')?.scrollIntoView({ behavior: 'smooth' });
            }
          }
        });

        await Promise.all([loadAccount(), loadPositions(), loadOrders()]);
      } catch (error) {
        pushToast({ title: 'Order failed', message: 'Unable to reach Alpaca right now.' });
      } finally {
        setPlacing(false);
      }
    },
    [
      alpacaStatus.connected,
      authStatus,
      getSymbolMeta,
      getSymbolPrice,
      loadAccount,
      loadOrders,
      loadPositions,
      pushToast,
      selectedSymbol,
      setJournalDraft,
      setLastAction,
      setOrderDraft,
      setPlacing
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
      submitOrder(draft, { symbol: selectedSymbol, source: 'ticket' });
    },
    [account.equity, account.startingBalance, pushToast, riskSettings.dailyLossLimit, selectedSymbol, submitOrder]
  );

  const handleClosePosition = useCallback(
    (positionId, fraction = 1) => {
      const position = positions.find((item) => item.id === positionId);
      if (!position) return;
      const qty = Math.max(0.01, roundTo(position.quantity * fraction, 4));
      submitOrder(
        {
          ...orderDraft,
          side: 'sell',
          type: 'market',
          quantity: qty,
          limitPrice: null,
          stopTrigger: null,
          stopLimit: null,
          stopPrice: null,
          targetPrice: null,
          bracket: false,
          oco: false
        },
        { symbol: position.symbol, source: 'rail-close', quantityOverride: qty }
      );
    },
    [orderDraft, positions, submitOrder]
  );

  const handleExportCsv = useCallback(() => {
    if (orders.length === 0) return;
    const header = [
      'SubmittedAt',
      'Symbol',
      'Side',
      'Type',
      'Status',
      'OrderClass',
      'Qty',
      'FilledQty',
      'FilledAvgPrice',
      'LimitPrice',
      'StopPrice'
    ];
    const rows = orders.map((order) => [
      order.submittedAt ? new Date(order.submittedAt).toISOString() : '',
      order.symbol,
      order.side,
      order.type,
      order.status,
      order.orderClass ?? '',
      order.quantity,
      order.filledQuantity,
      order.filledAvgPrice ?? '',
      order.limitPrice ?? '',
      order.stopPrice ?? ''
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
    const filledOrders = orders.filter((order) => {
      const status = (order.status ?? '').toLowerCase();
      return status === 'filled' || order.filledQuantity > 0;
    });
    const openOrders = orders.filter((order) => (order.status ?? '').toLowerCase() !== 'filled').length;
    const filledNotional = filledOrders.reduce((sum, order) => {
      const price = Number.isFinite(order.filledAvgPrice) ? order.filledAvgPrice : 0;
      return sum + price * (order.filledQuantity ?? 0);
    }, 0);

    const previousEquity = equityTimeline.length > 1 ? equityTimeline[equityTimeline.length - 2].equity : null;
    const previousReturn = previousEquity && baseline ? ((previousEquity - baseline) / baseline) * 100 : null;
    const delta = previousReturn != null ? totalReturn - previousReturn : null;

    return {
      metrics: [
        { label: 'Total return', value: `${totalReturn.toFixed(2)}%`, delta },
        { label: 'Filled orders', value: String(filledOrders.length), delta: null },
        { label: 'Open orders', value: String(openOrders), delta: null },
        { label: 'Filled notional', value: formatCurrency(filledNotional), delta: null }
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
            <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Alpaca Paper
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
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="rounded-full border border-slate-200 px-3 py-1">Live paper execution</span>
            <span className="hidden sm:inline">Polygon data · Alpaca orders</span>
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
            setWatchQuery('');
          }}
          selectedSymbol={selectedSymbol}
          reference={watchlistRef}
          searchQuery={watchQuery}
          onSearchChange={setWatchQuery}
          onAddSymbol={handleAddSymbol}
          status={watchlistStatus}
        />

        <main className="flex min-w-0 flex-1 justify-center px-6 py-6">
          <div className="flex w-full max-w-5xl flex-col gap-6">
            <section className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
              {alpacaStatus.loading ? (
                <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-600">
                  <div>
                    <p className="text-base font-semibold text-slate-900">Checking Alpaca connection…</p>
                    <p className="mt-1 text-xs text-slate-500">We are making sure your paper keys are still valid.</p>
                  </div>
                  <span className="inline-flex h-3 w-3 animate-ping rounded-full bg-emerald-500" aria-hidden="true" />
                </div>
              ) : alpacaStatus.connected ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-slate-900">Alpaca paper account connected</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {alpacaStatus.account?.account_number
                          ? `Account ${alpacaStatus.account.account_number}`
                          : 'Keys encrypted with your AlgoTeen account.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900"
                        onClick={refreshCredentials}
                        disabled={alpacaStatus.loading}
                      >
                        Refresh status
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={disconnectAlpaca}
                        disabled={disconnecting}
                      >
                        {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-4 text-sm text-slate-600 sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {(alpacaStatus.account?.status ?? 'active').toString().replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Currency</p>
                      <p className="mt-1 font-semibold text-slate-900">{alpacaStatus.account?.currency ?? 'USD'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Buying power</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {formatCurrency(
                          Number.parseFloat(alpacaStatus.account?.buying_power ?? account.buyingPower ?? 0) || 0
                        )}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Your Alpaca API keys stay encrypted in Supabase. We surface account status and buying power automatically.
                  </p>
                </div>
              ) : (
                <form
                  className="space-y-5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    connectAlpaca();
                  }}
                >
                  <div>
                    <p className="text-base font-semibold text-slate-900">Connect to Alpaca paper trading</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Paste the API key pair from your Alpaca dashboard. We will verify them and store them securely.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700" htmlFor="alpaca-api-key">
                      API key
                      <input
                        id="alpaca-api-key"
                        type="text"
                        autoComplete="off"
                        value={credentialsDraft.apiKey}
                        onChange={(event) => {
                          setCredentialsDraft((prev) => ({ ...prev, apiKey: event.target.value, error: null }));
                          setAlpacaStatus((prev) => ({ ...prev, error: null }));
                        }}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        placeholder="PKxxxxxxxx"
                        required
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700" htmlFor="alpaca-secret-key">
                      Secret key
                      <input
                        id="alpaca-secret-key"
                        type="password"
                        autoComplete="new-password"
                        value={credentialsDraft.secretKey}
                        onChange={(event) => {
                          setCredentialsDraft((prev) => ({ ...prev, secretKey: event.target.value, error: null }));
                          setAlpacaStatus((prev) => ({ ...prev, error: null }));
                        }}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        placeholder="SKxxxxxxxx"
                        required
                      />
                    </label>
                  </div>
                  {credentialsDraft.error || alpacaStatus.error ? (
                    <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {credentialsDraft.error ?? alpacaStatus.error}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">
                      We only use these keys for paper trading. Disconnect anytime to remove them from storage.
                    </p>
                    <button
                      type="submit"
                      disabled={credentialsDraft.submitting}
                      className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-400/60"
                    >
                      {credentialsDraft.submitting ? 'Connecting…' : 'Connect Alpaca keys'}
                    </button>
                  </div>
                </form>
              )}
            </section>
            <section className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-slate-900">Paper trading flow</h2>
                <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
                  Orders settle via Alpaca paper
                </span>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {[
                  {
                    label: 'Pick a symbol',
                    description: 'Watchlist drives the chart, ticket, and risk panels.'
                  },
                  {
                    label: 'Study the chart',
                    description: 'Use TradingView tools to mark levels, add indicators, and plan the trade.'
                  },
                  {
                    label: 'Send the paper order',
                    description: 'Review cost, risk, and fills before journaling the trade.'
                  }
                ].map((item, index) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Fill estimates use live Alpaca quotes—review cost and risk before sending each simulated ticket.
              </p>
            </section>

            <div className="relative">
              <TradeChart
                symbol={selectedSymbol}
                assetClass={selectedMeta?.assetClass}
                reference={chartRef}
                timeframe={timeframe}
                timeframeOptions={TIMEFRAME_PRESETS}
                onTimeframeChange={setTimeframe}
                marketStatus={marketStatus}
              />
            </div>

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
            />

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
                            ? 'border-emerald-600 bg-emerald-600 text-white'
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
                          active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
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
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
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
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
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
