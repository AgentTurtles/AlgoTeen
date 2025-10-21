import { fetchOrders } from '@/lib/alpaca';

export async function GET(request) {
  return fetchOrders(request);
}
