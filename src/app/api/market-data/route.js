
import { NextResponse } from 'next/server';
const POLYGON_BASE = 'https://api.polygon.io/v2';

// Alpaca endpoints removed

function buildQuery(searchParams, fallbackLimit = 500) {
  const params = new URLSearchParams();
  const timeframe = searchParams.get('timeframe') || '1Day';
  const limitParam = Number.parseInt(searchParams.get('limit') || fallbackLimit, 10);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 1000) : fallbackLimit;

  params.set('timeframe', timeframe);
  params.set('limit', String(limit));

  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const adjustment = searchParams.get('adjustment');

  if (start) {
    params.set('start', start);
  }

  if (end) {
    params.set('end', end);
  }

  if (adjustment) {
    params.set('adjustment', adjustment);
  }

  return params;
}
// End of file

function normalizeBars(payload, fallbackSymbol) {
  if (Array.isArray(payload?.bars)) {
    return { symbol: fallbackSymbol, bars: payload.bars };
  }

  if (payload?.bars && typeof payload.bars === 'object') {
    const entry = Object.entries(payload.bars)[0];
    if (entry && Array.isArray(entry[1])) {
      return { symbol: entry[0] || fallbackSymbol, bars: entry[1] };
    }
  }

  return { symbol: fallbackSymbol, bars: [] };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const assetClass = (searchParams.get('assetClass') || 'stocks').toLowerCase();
  let symbol = searchParams.get('symbol') || (assetClass === 'crypto' ? 'BTC/USD' : assetClass === 'forex' ? 'EUR/USD' : 'SPY');
  let timeframe = searchParams.get('timeframe') || (assetClass === 'stocks' ? '1Day' : '1Hour');


  // Validate symbol and timeframe for each asset class
  const validStocks = ['SPY', 'QQQ', 'TSLA'];
  const validCrypto = ['BTC/USD', 'ETH/USD', 'SOL/USD'];
  const validForex = ['EUR/USD', 'GBP/USD', 'USD/JPY'];
  const validStockTimeframes = ['1Day', '4Hour', '1Hour'];
  const validCryptoTimeframes = ['4Hour', '1Hour', '15Min'];
  const validForexTimeframes = ['4Hour', '1Hour', '15Min'];

  let valid = true;
  let errorMsg = '';

  // Get date params once, at the top
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (assetClass === 'stocks') {
    if (!validStocks.includes(symbol)) {
      errorMsg = `Invalid stock symbol: ${symbol}. Defaulting to SPY.`;
      symbol = 'SPY';
      valid = false;
    }
    if (!validStockTimeframes.includes(timeframe)) {
      errorMsg += ` Invalid stock timeframe: ${timeframe}. Defaulting to 1Day.`;
      timeframe = '1Day';
      valid = false;
    }
  } else if (assetClass === 'crypto') {
    if (!validCrypto.includes(symbol)) {
      errorMsg = `Invalid crypto symbol: ${symbol}. Defaulting to BTC/USD.`;
      symbol = 'BTC/USD';
      valid = false;
    }
    if (!validCryptoTimeframes.includes(timeframe)) {
      errorMsg += ` Invalid crypto timeframe: ${timeframe}. Defaulting to 1Hour.`;
      timeframe = '1Hour';
      valid = false;
    }
  } else if (assetClass === 'forex') {
    if (!validForex.includes(symbol)) {
      errorMsg = `Invalid forex symbol: ${symbol}. Defaulting to EUR/USD.`;
      symbol = 'EUR/USD';
      valid = false;
    }
    if (!validForexTimeframes.includes(timeframe)) {
      errorMsg += ` Invalid forex timeframe: ${timeframe}. Defaulting to 1Hour.`;
      timeframe = '1Hour';
      valid = false;
    }
  } else {
    return NextResponse.json({ error: `Invalid asset class: ${assetClass}` }, { status: 400 });
  }

  // Date range checks
  if (start && !dateRegex.test(start)) {
    return NextResponse.json({ error: 'Invalid start date format. Use YYYY-MM-DD.' }, { status: 400 });
  }
  if (end && !dateRegex.test(end)) {
    return NextResponse.json({ error: 'Invalid end date format. Use YYYY-MM-DD.' }, { status: 400 });
  }
  if (start && end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (startDate > endDate) {
      return NextResponse.json({ error: 'Start date must be before end date.' }, { status: 400 });
    }
    const now = new Date();
    if (startDate > now || endDate > now) {
      return NextResponse.json({ error: 'Dates cannot be in the future.' }, { status: 400 });
    }
  }


  // Polygon.io for all asset classes
  const polygonKey = process.env.POLYGON_API_KEY;
  if (!polygonKey) {
    return NextResponse.json({ error: 'Polygon.io API key missing. Set POLYGON_API_KEY in your environment.' }, { status: 500 });
  }

  // Map timeframe to Polygon.io supported intervals
  // Polygon: 1Day, 4Hour, 1Hour, 15Min
  let multiplier = 1;
  let timespan = 'day';
  if (timeframe === '4Hour') {
    multiplier = 4;
    timespan = 'hour';
  } else if (timeframe === '1Hour') {
    multiplier = 1;
    timespan = 'hour';
  } else if (timeframe === '15Min') {
    multiplier = 15;
    timespan = 'minute';
  }

  // Symbol mapping for Polygon.io
  let polygonSymbol = symbol;
  if (assetClass === 'crypto') {
    // Polygon: X:BTCUSD
    polygonSymbol = 'X:' + symbol.replace('/', '');
  } else if (assetClass === 'forex') {
    // Polygon: C:EURUSD
    polygonSymbol = 'C:' + symbol.replace('/', '');
  }

  // Polygon expects YYYY-MM-DD for from/to
  const from = start || '2022-01-01';
  const to = end || new Date().toISOString().slice(0, 10);
  const url = `${POLYGON_BASE}/aggs/ticker/${polygonSymbol}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=5000&apiKey=${polygonKey}`;

  let response;
  try {
    response = await fetch(url, { cache: 'no-store' });
  } catch (error) {
    return NextResponse.json({ error: `Unable to reach Polygon.io: ${error.message}`, request: { url, assetClass, symbol, timeframe, start, end } }, { status: 502 });
  }

  if (!response.ok) {
    let details = await response.text();
    return NextResponse.json({ error: `Polygon.io responded with status ${response.status}: ${details}`, request: { url, assetClass, symbol, timeframe, start, end } }, { status: response.status });
  }

  let rawPayload;
  try {
    rawPayload = await response.json();
  } catch (error) {
    return NextResponse.json({ error: 'Failed to parse Polygon.io response as JSON.', request: { url, assetClass, symbol, timeframe, start, end } }, { status: 502 });
  }

  // Polygon.io returns { results: [ { t, o, h, l, c, v, ... } ] }
  if (!rawPayload.results || !Array.isArray(rawPayload.results) || rawPayload.results.length === 0) {
    return NextResponse.json({ error: 'No market data available from Polygon.io.', request: { url, assetClass, symbol, timeframe, start, end } }, { status: 404 });
  }

  const bars = rawPayload.results.map((bar) => ({
    date: new Date(bar.t).toISOString().slice(0, 10),
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v
  }));

  const filteredBars = bars.filter(
    (bar) =>
      bar.date &&
      Number.isFinite(bar.open) &&
      Number.isFinite(bar.high) &&
      Number.isFinite(bar.low) &&
      Number.isFinite(bar.close) &&
      Number.isFinite(bar.volume)
  );

  if (filteredBars.length === 0) {
    return NextResponse.json({ error: 'No market data available for this symbol, timeframe, or date range from Polygon.io.', request: { url, assetClass, symbol, timeframe, start, end } }, { status: 404 });
  }

  if (!valid && errorMsg) {
    // Add a sample of bars for debugging
    return NextResponse.json({
      warning: errorMsg,
      symbol,
      timeframe,
      source: 'polygon',
      bars: filteredBars,
      debugSample: filteredBars.slice(0, 5)
    });
  }

  // Always include a debug sample for troubleshooting
  return NextResponse.json({
    symbol,
    timeframe,
    source: 'polygon',
    bars: filteredBars,
    debugSample: filteredBars.slice(0, 5)
  });
}

// Catch-all error handler for unexpected errors
export async function POST() {
  return NextResponse.json({ error: 'POST not supported on this endpoint.' }, { status: 405 });
}
