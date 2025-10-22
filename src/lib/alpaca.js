import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const AUTH_SECRET = process.env.NEXTAUTH_SECRET ?? 'algoteen-dev-secret';
const ACCOUNT_URL = process.env.ALPACA_ACCOUNT_URL ?? 'https://paper-api.alpaca.markets/v2/account';

const DATA_BASE = process.env.ALPACA_DATA_BASE_URL ?? 'https://data.alpaca.markets/v2';
const TRADING_BASE = process.env.ALPACA_TRADING_BASE_URL ?? 'https://paper-api.alpaca.markets/v2';
const CRYPTO_BASE = process.env.ALPACA_CRYPTO_BASE_URL ?? 'https://data.alpaca.markets/v1beta3';
const FOREX_BASE = process.env.ALPACA_FOREX_BASE_URL ?? 'https://data.alpaca.markets/v1beta1';

async function fetchStoredCredentials(request) {
  // Using global Alpaca credentials from environment variables
  const apiKey = process.env.ALPACA_API_KEY;
  const secretKey = process.env.ALPACA_SECRET_KEY;
  if (!apiKey || !secretKey) {
    return null;
  }
  return { apiKey, secretKey };
}

export async function validateAlpacaCredentials(apiKey, secretKey) {
  let response;
  try {
    response = await fetch(ACCOUNT_URL, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': secretKey
      }
    });
  } catch (error) {
    throw new Error('Unable to reach Alpaca account endpoint');
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      data = null;
    }
  }

  if (!response.ok) {
    const message =
      data && typeof data === 'object'
        ? data.message ?? data.error ?? 'Invalid Alpaca credentials.'
        : 'Invalid Alpaca credentials.';
    throw new Error(message);
  }

  return data ?? {};
}

async function alpacaRequest(
  request,
  path,
  { base = TRADING_BASE, query = {}, method = 'GET', body, headers: extraHeaders = {} } = {}
) {
  const stored = await fetchStoredCredentials(request);
  if (!stored) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const { apiKey, secretKey, userId } = stored;

  const url = new URL(path, base);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value != null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  const headers = {
    'APCA-API-KEY-ID': apiKey,
    'APCA-API-SECRET-KEY': secretKey,
    ...extraHeaders
  };

  let requestBody;
  if (body != null && method !== 'GET') {
    if (typeof body === 'string' || body instanceof Buffer || body instanceof ArrayBuffer) {
      requestBody = body;
    } else {
      requestBody = JSON.stringify(body);
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: requestBody,
      cache: 'no-store'
    });
  } catch (error) {
    return { ok: false, status: 502, error: 'Network request to Alpaca failed', details: error.message };
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null
        ? data.message ?? data.error ?? 'Failed to reach Alpaca'
        : 'Failed to reach Alpaca';
    return { ok: false, status: response.status, error: message, data };
  }

  return { ok: true, status: response.status, data };
}

async function proxyAlpaca(request, path, options) {
  const result = await alpacaRequest(request, path, options);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, details: result.data ?? null }, { status: result.status });
  }
  return NextResponse.json({ data: result.data });
}

function detectAssetClass(symbol, override) {
  if (override) {
    return override;
  }
  if (!symbol) {
    return 'stocks';
  }
  if (/^[A-Z]+\/[A-Z]+$/.test(symbol)) {
    const compact = symbol.replace('/', '').toUpperCase();
    if (compact.endsWith('USD')) {
      return compact.startsWith('BTC') || compact.startsWith('ETH') ? 'crypto' : 'forex';
    }
  }
  if (/^[A-Z]{3,6}USD$/i.test(symbol)) {
    return symbol.startsWith('BTC') || symbol.startsWith('ETH') ? 'crypto' : 'forex';
  }
  return 'stocks';
}

function normalizeSymbolForAssetClass(symbol, assetClass) {
  if (!symbol) return symbol;
  const upper = symbol.toUpperCase();
  if (assetClass === 'crypto' || assetClass === 'forex') {
    return upper.replace('/', '');
  }
  return upper;
}

function normalizeAlpacaBar(bar, index) {
  const open = Number.parseFloat(bar.o ?? bar.open ?? bar.Open ?? 0) || 0;
  const high = Number.parseFloat(bar.h ?? bar.high ?? bar.High ?? open) || open;
  const low = Number.parseFloat(bar.l ?? bar.low ?? bar.Low ?? open) || open;
  const close = Number.parseFloat(bar.c ?? bar.close ?? bar.Close ?? open) || open;
  const volume = Number.parseFloat(bar.v ?? bar.volume ?? bar.Volume ?? 0) || 0;
  const timeValue = bar.t ?? bar.timestamp ?? bar.Time ?? bar.time ?? null;
  const time = typeof timeValue === 'string' || typeof timeValue === 'number' ? timeValue : null;
  return {
    index,
    o: Number(open.toFixed(6)),
    h: Number(high.toFixed(6)),
    l: Number(low.toFixed(6)),
    c: Number(close.toFixed(6)),
    v: Number(volume.toFixed(6)),
    t: time
  };
}

export async function fetchBars(request, rawSymbol, timeframe = '1Day', limit = 300, assetClassOverride) {
  const safeLimit = Math.max(1, Math.min(Number.parseInt(limit, 10) || 300, 1000));
  const symbol = rawSymbol?.toString().trim();
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  const assetClass = detectAssetClass(symbol, assetClassOverride);
  const cleanedSymbol = normalizeSymbolForAssetClass(symbol, assetClass);

  let result;
  if (assetClass === 'stocks') {
    result = await alpacaRequest(request, `/stocks/${encodeURIComponent(cleanedSymbol)}/bars`, {
      base: DATA_BASE,
      query: { timeframe, limit: String(safeLimit) }
    });
  } else if (assetClass === 'crypto') {
    result = await alpacaRequest(request, '/crypto/us/bars', {
      base: CRYPTO_BASE,
      query: { timeframe, limit: String(safeLimit), symbols: cleanedSymbol }
    });
  } else if (assetClass === 'forex') {
    result = await alpacaRequest(request, '/fx/us/bars', {
      base: FOREX_BASE,
      query: { timeframe, limit: String(safeLimit), symbols: cleanedSymbol }
    });
  } else {
    return NextResponse.json({ error: `Unsupported asset class: ${assetClass}` }, { status: 400 });
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.error, details: result.data ?? null }, { status: result.status });
  }

  let rawBars = [];
  const data = result.data ?? {};
  if (Array.isArray(data?.bars)) {
    rawBars = data.bars;
  } else if (data?.bars && typeof data.bars === 'object') {
    const firstSeries = Object.values(data.bars)[0];
    if (Array.isArray(firstSeries)) {
      rawBars = firstSeries;
    }
  }

  const bars = rawBars.map((bar, index) => normalizeAlpacaBar(bar, index));

  return NextResponse.json({
    data: {
      symbol: cleanedSymbol,
      assetClass,
      timeframe,
      bars
    }
  });
}

export async function fetchAccount(request) {
  return proxyAlpaca(request, '/account');
}

export async function fetchPositions(request) {
  return proxyAlpaca(request, '/positions');
}

export async function fetchOrders(request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') ?? 'all';
  const limit = searchParams.get('limit') ?? '100';
  const direction = searchParams.get('direction') ?? 'desc';
  const nested = searchParams.get('nested') ?? 'true';
  return proxyAlpaca(request, '/orders', {
    query: { status, limit, direction, nested }
  });
}

export async function submitOrder(request, payload) {
  let body = payload;
  if (!body) {
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Order payload must be an object.' }, { status: 400 });
  }

  const result = await alpacaRequest(request, '/orders', {
    method: 'POST',
    body
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, details: result.data ?? null }, { status: result.status });
  }

  return NextResponse.json({ data: result.data });
}

export async function cancelOrder(request, orderId) {
  const id = orderId ?? new URL(request.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Order id is required to cancel.' }, { status: 400 });
  }

  return proxyAlpaca(request, `/orders/${id}`, { method: 'DELETE' });
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
