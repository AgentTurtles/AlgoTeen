import { NextResponse } from 'next/server';

const DEFAULT_STOCKS_BASE = 'https://data.alpaca.markets/v2';
const DEFAULT_CRYPTO_BASE = 'https://data.alpaca.markets/v1beta3';
const DEFAULT_FOREX_BASE = 'https://data.alpaca.markets/v1beta1';

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
  const symbol = searchParams.get('symbol') || (assetClass === 'crypto' ? 'BTC/USD' : assetClass === 'forex' ? 'EUR/USD' : 'SPY');

  const apiKey = process.env.ALPACA_API_KEY_ID;
  const apiSecret = process.env.ALPACA_API_SECRET_KEY;

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      {
        error: 'Alpaca API credentials are missing. Set ALPACA_API_KEY_ID and ALPACA_API_SECRET_KEY in your environment.'
      },
      { status: 500 }
    );
  }

  const query = buildQuery(searchParams);

  let url = '';
  let source = 'alpaca';

  if (assetClass === 'crypto') {
    const baseUrl = process.env.ALPACA_CRYPTO_BASE_URL || DEFAULT_CRYPTO_BASE;
    query.set('symbols', symbol);
    url = `${baseUrl}/crypto/us/bars?${query.toString()}`;
    source = 'alpaca-crypto';
  } else if (assetClass === 'forex') {
    const baseUrl = process.env.ALPACA_FOREX_BASE_URL || DEFAULT_FOREX_BASE;
    query.set('symbols', symbol);
    url = `${baseUrl}/forex/bars?${query.toString()}`;
    source = 'alpaca-forex';
  } else {
    const baseUrl = process.env.ALPACA_DATA_BASE_URL || DEFAULT_STOCKS_BASE;
    url = `${baseUrl}/stocks/${encodeURIComponent(symbol)}/bars?${query.toString()}`;
    source = 'alpaca-stocks';
  }

  let response;

  try {
    response = await fetch(url, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Unable to reach Alpaca market data service: ${error.message}`
      },
      { status: 502 }
    );
  }

  if (!response.ok) {
    let details = await response.text();
    try {
      const payload = JSON.parse(details);
      if (payload?.error) {
        details = payload.error;
      }
    } catch (error) {
      // If parsing fails keep raw text.
    }

    return NextResponse.json(
      {
        error: `Alpaca responded with status ${response.status}: ${details}`
      },
      { status: response.status }
    );
  }

  const rawPayload = await response.json();
  const { symbol: resolvedSymbol, bars: rawBars } = normalizeBars(rawPayload, symbol);
  const bars = Array.isArray(rawBars)
    ? rawBars.map((bar) => ({
        date: bar.t ? String(bar.t).slice(0, 10) : bar.timestamp ? String(bar.timestamp).slice(0, 10) : '',
        open: Number(bar.o ?? bar.open),
        high: Number(bar.h ?? bar.high),
        low: Number(bar.l ?? bar.low),
        close: Number(bar.c ?? bar.close),
        volume: Number(bar.v ?? bar.volume ?? 0)
      }))
    : [];

  const filteredBars = bars.filter(
    (bar) =>
      bar.date &&
      Number.isFinite(bar.open) &&
      Number.isFinite(bar.high) &&
      Number.isFinite(bar.low) &&
      Number.isFinite(bar.close) &&
      Number.isFinite(bar.volume)
  );

  return NextResponse.json({
    symbol: resolvedSymbol,
    timeframe: searchParams.get('timeframe') || '1Day',
    source,
    bars: filteredBars
  });
}
