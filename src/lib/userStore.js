import {
  supabaseDelete,
  supabaseInsert,
  supabaseSelect,
  supabaseUpdate
} from './supabaseClient';

const CREDENTIALS_TABLE = process.env.SUPABASE_CREDENTIALS_TABLE ?? 'app_user_credentials';
const ALPACA_TABLE = process.env.SUPABASE_ALPACA_TABLE ?? 'app_alpaca_credentials';

export async function getCredentialsByUsername(username) {
  if (!username) return null;
  const row = await supabaseSelect(CREDENTIALS_TABLE, { match: { username }, single: true });
  return row ?? null;
}

export async function getCredentialsByUserId(userId) {
  if (!userId) return null;
  const row = await supabaseSelect(CREDENTIALS_TABLE, { match: { user_id: userId }, single: true });
  return row ?? null;
}

export async function createUserCredentials({ userId, username, passwordHash }) {
  const existing = await getCredentialsByUsername(username);
  if (existing) {
    const error = new Error('Username already exists.');
    error.code = 'username_exists';
    throw error;
  }
  const payload = {
    user_id: userId,
    username,
    password_hash: passwordHash,
    created_at: new Date().toISOString()
  };
  const row = await supabaseInsert(CREDENTIALS_TABLE, payload);
  return row;
}

export async function updateCredentialsPassword(userId, passwordHash) {
  await supabaseUpdate(CREDENTIALS_TABLE, { user_id: userId }, { password_hash: passwordHash });
}

export async function storeAlpacaCredentials(userId, { apiKey, secretKey, account }) {
  if (!userId) {
    throw new Error('User id is required to store Alpaca credentials.');
  }
  const existing = await supabaseSelect(ALPACA_TABLE, { match: { user_id: userId }, single: true });
  const payload = {
    user_id: userId,
    api_key: apiKey,
    secret_key: secretKey,
    account: account ? JSON.stringify(account) : null,
    updated_at: new Date().toISOString()
  };
  if (existing) {
    await supabaseUpdate(ALPACA_TABLE, { user_id: userId }, payload);
    return { ...existing, ...payload };
  }
  const row = await supabaseInsert(ALPACA_TABLE, { ...payload, created_at: payload.updated_at });
  return row;
}

export async function deleteAlpacaCredentials(userId) {
  if (!userId) return;
  await supabaseDelete(ALPACA_TABLE, { user_id: userId });
}

export async function getAlpacaCredentials(userId) {
  if (!userId) return null;
  const row = await supabaseSelect(ALPACA_TABLE, { match: { user_id: userId }, single: true });
  if (!row) return null;
  let account = null;
  if (row.account) {
    try {
      account = typeof row.account === 'string' ? JSON.parse(row.account) : row.account;
    } catch (error) {
      account = null;
    }
  }
  return {
    apiKey: row.api_key,
    secretKey: row.secret_key,
    account
  };
}
