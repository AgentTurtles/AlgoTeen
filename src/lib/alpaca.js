import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

const DATA_BASE = process.env.ALPACA_DATA_BASE_URL ?? 'https://data.alpaca.markets/v2';
const TRADING_BASE = process.env.ALPACA_TRADING_BASE_URL ?? 'https://paper-api.alpaca.markets/v2';

async function proxyAlpaca(request, path, { base = TRADING_BASE, query = {}, method = 'GET' } = {}) {
  const session = await getServerSession();
  const apiKey = session?.user?.account?.alpaca?.apiKey;
  const secretKey = session?.user?.account?.alpaca?.secretKey;
  if (!apiKey || !secretKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(path, base);
  Object.entries(query).forEach(([key, value]) => {
    if (value != null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': secretKey
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to reach Alpaca', status: response.status }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: 'Network request to Alpaca failed' }, { status: 502 });
  }
}

export async function fetchBars(request, symbol, timeframe = '1Day', limit = 300) {
  // Detect asset class by symbol format
  let assetClass = 'stocks';
  if (/^[A-Z]+\/[A-Z]+$/.test(symbol)) {
    if (symbol.endsWith('USD')) {
      assetClass = symbol.startsWith('BTC') || symbol.startsWith('ETH') ? 'crypto' : 'forex';
    }
  }

  let path = '';
  let base = DATA_BASE;
  if (assetClass === 'stocks') {
    path = `/stocks/${symbol}/bars`;
    base = DATA_BASE;
  } else if (assetClass === 'crypto') {
    path = `/crypto/${symbol}/bars`;
    base = process.env.ALPACA_CRYPTO_BASE_URL ?? 'https://data.alpaca.markets/v1beta3';
  } else if (assetClass === 'forex') {
    path = `/forex/${symbol}/bars`;
    base = process.env.ALPACA_FOREX_BASE_URL ?? 'https://data.alpaca.markets/v1beta1';
  }

  const result = await proxyAlpaca(request, path, {
    base,
    query: { timeframe, limit }
  });
  if (result.status !== 200) {
    const fallback = buildFallbackSeries(symbol, limit);
    return NextResponse.json({ data: { bars: fallback, fallback: true } }, { status: 200 });
  }
  return result;
}

export async function fetchAccount(request) {
  return proxyAlpaca(request, '/account');
}

export async function fetchPositions(request) {
  return proxyAlpaca(request, '/positions');
}

export async function fetchOrders(request) {
  return proxyAlpaca(request, '/orders', { query: { status: 'open' } });
}

export async function fetchAssets(request, search, limit = 25) {
  return proxyAlpaca(request, '/assets', {
    query: {
      status: 'active',
      asset_class: 'us_equity',
      search,
      limit
    }
  });
}

function buildFallbackSeries(symbol, limit) {
  const sanitized = symbol.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const seed = sanitized.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 100;
  const basePrice = 50 + (seed % 200);
  const bars = [];
  for (let i = 0; i < Number(limit ?? 300); i += 1) {
    const t = i + 1;
    const drift = Math.sin((t + seed) / 12) * 1.5;
    const trend = t * 0.02;
    const open = basePrice + drift + trend;
    const close = open + Math.sin((t + seed) / 6) * 0.6;
    const high = Math.max(open, close) + 0.4;
    const low = Math.min(open, close) - 0.4;
    bars.push({
      t,
      o: Number(open.toFixed(2)),
      h: Number(high.toFixed(2)),
      l: Number(low.toFixed(2)),
      c: Number(close.toFixed(2)),
      v: Math.round(100000 + (Math.cos((t + seed) / 5) + 1) * 25000)
    });
  }
  return bars;
}
