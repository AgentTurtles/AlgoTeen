import { NextResponse } from 'next/server';
import { fetchAssets } from '@/lib/alpaca';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') ?? '';
  const limit = searchParams.get('limit') ?? '25';
  if (!search) {
    return NextResponse.json({ data: { assets: [] } });
  }
  const response = await fetchAssets(request, search, limit);
  if (response.status !== 200) {
    return response;
  }
  const payload = await response.json();
  return NextResponse.json({ data: { assets: payload.data ?? [] } });
}
