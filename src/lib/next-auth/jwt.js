import { readTokenFromRequest } from './shared';

export async function getToken({ req } = {}) {
  const token = readTokenFromRequest(req);
  return token ?? null;
}
