import { fetchPositions } from '@/lib/alpaca';

export async function GET(request) {
  return fetchPositions(request);
}
