import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

export function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = scryptSync(password, salt, KEY_LENGTH);
  return `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password, storedHash) {
  if (typeof storedHash !== 'string' || !storedHash.includes(':')) {
    return false;
  }
  const [saltHex, hashHex] = storedHash.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const storedKey = Buffer.from(hashHex, 'hex');
  const derivedKey = scryptSync(password, salt, KEY_LENGTH);
  return timingSafeEqual(storedKey, derivedKey);
}
