import { NextResponse } from 'next/server';
import { fetchBars } from '@/lib/alpaca';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const timeframe = searchParams.get('timeframe') ?? '1Day';
  const limit = searchParams.get('limit') ?? '400';

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  return fetchBars(request, symbol, timeframe, limit);
}
