import { fetchAccount } from '@/lib/alpaca';

export async function GET(request) {
  return fetchAccount(request);
}
