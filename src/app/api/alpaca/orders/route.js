import { cancelOrder, fetchOrders, submitOrder } from '@/lib/alpaca';

export async function GET(request) {
  return fetchOrders(request);
}

export async function POST(request) {
  return submitOrder(request);
}

export async function DELETE(request) {
  return cancelOrder(request);
}
