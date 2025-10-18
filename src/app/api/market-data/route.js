import { NextResponse } from 'next/server';

const DEFAULT_BASE_URL = 'https://data.alpaca.markets/v2';

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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'SPY';

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

  const baseUrl = process.env.ALPACA_DATA_BASE_URL || DEFAULT_BASE_URL;
  const query = buildQuery(searchParams);
  const url = `${baseUrl}/stocks/${encodeURIComponent(symbol)}/bars?${query.toString()}`;

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

  const payload = await response.json();
  const bars = Array.isArray(payload?.bars)
    ? payload.bars.map((bar) => ({
        date: bar.t ? String(bar.t).slice(0, 10) : '',
        open: Number(bar.o),
        high: Number(bar.h),
        low: Number(bar.l),
        close: Number(bar.c),
        volume: Number(bar.v)
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
    symbol,
    timeframe: searchParams.get('timeframe') || '1Day',
    source: 'alpaca',
    bars: filteredBars
  });
}
