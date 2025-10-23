import { NextResponse } from 'next/server';

const POLYGON_BASE = 'https://api.polygon.io/v2';

const TIMEFRAME_CONFIG = {
  '1Day': { multiplier: 1, timespan: 'day', approxBarsPerDay: 1 },
  '4Hour': { multiplier: 4, timespan: 'hour', approxBarsPerDay: 6 },
  '1Hour': { multiplier: 1, timespan: 'hour', approxBarsPerDay: 24 },
  '15Min': { multiplier: 15, timespan: 'minute', approxBarsPerDay: 96 },
  '5Min': { multiplier: 5, timespan: 'minute', approxBarsPerDay: 288 }
};

function normalizeSymbol(symbol, assetClass) {
  const trimmed = (symbol || '').trim().toUpperCase();
  if (!trimmed) {
    if (assetClass === 'crypto') {
      return 'BTC/USD';
    }
    if (assetClass === 'forex') {
      return 'EUR/USD';
    }
    return 'SPY';
  }

  if (assetClass === 'crypto' || assetClass === 'forex') {
    if (trimmed.includes('/')) {
      const [base = '', quote = ''] = trimmed.split('/');
      const cleanedBase = base.replace(/[^A-Z0-9]/g, '');
      const cleanedQuote = quote.replace(/[^A-Z0-9]/g, '');
      if (!cleanedBase || !cleanedQuote) {
        return trimmed;
      }
      return `${cleanedBase}/${cleanedQuote}`;
    }
    const alphanumeric = trimmed.replace(/[^A-Z0-9]/g, '');
    if (alphanumeric.length >= 6) {
      const base = alphanumeric.slice(0, alphanumeric.length - 3);
      const quote = alphanumeric.slice(-3);
      return `${base}/${quote}`;
    }
    return alphanumeric;
  }

  return trimmed.replace(/[^A-Z0-9.]/g, '');
}

function toPolygonSymbol(symbol, assetClass) {
  const normalized = normalizeSymbol(symbol, assetClass);
  if (assetClass === 'crypto') {
    return `X:${normalized.replace('/', '')}`;
  }
  if (assetClass === 'forex') {
    return `C:${normalized.replace('/', '')}`;
  }
  return normalized;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const assetClass = (searchParams.get('assetClass') || 'stocks').toLowerCase();

  if (!['stocks', 'crypto', 'forex'].includes(assetClass)) {
    return NextResponse.json({ error: `Invalid asset class: ${assetClass}` }, { status: 400 });
  }

  const defaultSymbol = assetClass === 'crypto' ? 'BTC/USD' : assetClass === 'forex' ? 'EUR/USD' : 'SPY';
  const requestedSymbol = searchParams.get('symbol');
  const normalizedSymbol = normalizeSymbol(requestedSymbol ?? defaultSymbol, assetClass);

  const defaultTimeframe = assetClass === 'stocks' ? '1Day' : '1Hour';
  const requestedTimeframe = searchParams.get('timeframe') || defaultTimeframe;
  const timeframeConfig = TIMEFRAME_CONFIG[requestedTimeframe] ?? TIMEFRAME_CONFIG[defaultTimeframe];
  const resolvedTimeframe = TIMEFRAME_CONFIG[requestedTimeframe] ? requestedTimeframe : defaultTimeframe;

  const limitParam = Number.parseInt(searchParams.get('limit') ?? '500', 10);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 5000) : 500;

  const polygonKey = process.env.POLYGON_API_KEY;
  if (!polygonKey) {
    return NextResponse.json(
      { error: 'Polygon.io API key missing. Set POLYGON_API_KEY in your environment.' },
      { status: 500 }
    );
  }

  const now = new Date();
  const rawEnd = searchParams.get('end');
  let endDate = rawEnd ? new Date(rawEnd) : new Date(now);
  if (rawEnd && Number.isNaN(endDate.getTime())) {
    return NextResponse.json({ error: 'Invalid end date format. Use YYYY-MM-DD.' }, { status: 400 });
  }
  if (endDate > now) {
    endDate = now;
  }

  const rawStart = searchParams.get('start');
  let startDate = rawStart ? new Date(rawStart) : null;
  if (rawStart && Number.isNaN(startDate.getTime())) {
    return NextResponse.json({ error: 'Invalid start date format. Use YYYY-MM-DD.' }, { status: 400 });
  }

  if (!startDate) {
    const approxBars = timeframeConfig.approxBarsPerDay || 1;
    const lookbackDays = Math.max(2, Math.ceil(limit / approxBars) + 2);
    startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - lookbackDays);
  }

  if (startDate > endDate) {
    return NextResponse.json({ error: 'Start date must be before end date.' }, { status: 400 });
  }

  const from = startDate.toISOString().slice(0, 10);
  const to = endDate.toISOString().slice(0, 10);
  const polygonSymbol = toPolygonSymbol(normalizedSymbol, assetClass);

  const url = `${POLYGON_BASE}/aggs/ticker/${polygonSymbol}/range/${timeframeConfig.multiplier}/${timeframeConfig.timespan}/${from}/${to}?adjusted=true&sort=asc&limit=${limit}&apiKey=${polygonKey}`;

  let response;
  try {
    response = await fetch(url, { cache: 'no-store' });
  } catch (error) {
    return NextResponse.json(
      { error: `Unable to reach Polygon.io: ${error.message}`, request: { url, assetClass, symbol: normalizedSymbol, timeframe: resolvedTimeframe, start: from, end: to } },
      { status: 502 }
    );
  }

  if (!response.ok) {
    let details;
    try {
      details = await response.json();
    } catch (error) {
      details = await response.text();
    }
    const message = typeof details === 'object' && details !== null && details.error ? details.error : details;
    return NextResponse.json(
      {
        error: `Polygon.io responded with status ${response.status}: ${message}`,
        request: { url, assetClass, symbol: normalizedSymbol, timeframe: resolvedTimeframe, start: from, end: to }
      },
      { status: response.status }
    );
  }

  let rawPayload;
  try {
    rawPayload = await response.json();
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to parse Polygon.io response as JSON.', request: { url, assetClass, symbol: normalizedSymbol, timeframe: resolvedTimeframe, start: from, end: to } },
      { status: 502 }
    );
  }

  const results = Array.isArray(rawPayload?.results) ? rawPayload.results : [];
  if (!results.length) {
    return NextResponse.json(
      { error: 'No market data available from Polygon.io.', request: { url, assetClass, symbol: normalizedSymbol, timeframe: resolvedTimeframe, start: from, end: to } },
      { status: 404 }
    );
  }

  const bars = results
    .map((bar) => ({
      date: new Date(bar.t).toISOString().slice(0, 10),
      open: Number(bar.o),
      high: Number(bar.h),
      low: Number(bar.l),
      close: Number(bar.c),
      volume: Number(bar.v)
    }))
    .filter(
      (bar) =>
        bar.date &&
        Number.isFinite(bar.open) &&
        Number.isFinite(bar.high) &&
        Number.isFinite(bar.low) &&
        Number.isFinite(bar.close) &&
        Number.isFinite(bar.volume)
    );

  if (!bars.length) {
    return NextResponse.json(
      {
        error: 'No market data available for this symbol, timeframe, or date range from Polygon.io.',
        request: { url, assetClass, symbol: normalizedSymbol, timeframe: resolvedTimeframe, start: from, end: to }
      },
      { status: 404 }
    );
  }

  const warnings = [];
  if (resolvedTimeframe !== requestedTimeframe) {
    warnings.push(`Unsupported timeframe "${requestedTimeframe}". Defaulted to ${resolvedTimeframe}.`);
  }

  return NextResponse.json({
    symbol: normalizedSymbol,
    timeframe: resolvedTimeframe,
    source: 'polygon',
    bars,
    debugSample: bars.slice(0, 5),
    warning: warnings.length ? warnings.join(' ') : undefined
  });
}

export async function POST() {
  return NextResponse.json({ error: 'POST not supported on this endpoint.' }, { status: 405 });
}
