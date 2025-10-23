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
  let existing = null;
  try {
    existing = await supabaseSelect(ALPACA_TABLE, { match: { user_id: userId }, single: true });
  } catch (err) {
    // If the Alpaca table doesn't exist in the database (PostgREST PGRST205),
    // treat as no-op for local/dev environments and return null so callers
    // don't crash. Re-throw other errors.
    if (err?.status === 404 && err?.data?.code === 'PGRST205') {
      // table missing
      return null;
    }
    throw err;
  }
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
  // Ensure the parent user/credential row exists to avoid FK constraint errors
  try {
    const parent = await supabaseSelect(CREDENTIALS_TABLE, { match: { user_id: userId }, single: true });
    if (!parent) {
      const error = new Error('Cannot store Alpaca credentials: user record not found. Ensure your account exists before connecting Alpaca.');
      error.code = 'fk_user_missing';
      throw error;
    }
  } catch (err) {
    // If supabaseSelect threw because the credentials table is missing, surface a friendly message
    if (err?.status === 404 && err?.data?.code === 'PGRST205') {
      return null;
    }
    throw err;
  }
  try {
    const row = await supabaseInsert(ALPACA_TABLE, { ...payload, created_at: payload.updated_at });
    return row;
  } catch (err) {
    // If FK constraint or table missing map to friendly errors where possible
    if (err?.status === 404 && err?.data?.code === 'PGRST205') {
      return null;
    }
    // Some PostgREST errors surface as 400 with a details string; map common FK text
    const text = err?.message ?? err?.toString?.() ?? '';
    if (typeof text === 'string' && text.toLowerCase().includes('foreign key')) {
      const e = new Error('Unable to store Alpaca credentials due to a database constraint (missing parent user). Please contact support or recreate your account.');
      e.code = 'fk_violation';
      throw e;
    }
    throw err;
  }
}

export async function deleteAlpacaCredentials(userId) {
  if (!userId) return;
  try {
    await supabaseDelete(ALPACA_TABLE, { user_id: userId });
  } catch (err) {
    if (err?.status === 404 && err?.data?.code === 'PGRST205') {
      return;
    }
    throw err;
  }
}

export async function getAlpacaCredentials(userId) {
  if (!userId) return null;
  let row = null;
  try {
    row = await supabaseSelect(ALPACA_TABLE, { match: { user_id: userId }, single: true });
  } catch (err) {
    if (err?.status === 404 && err?.data?.code === 'PGRST205') {
      return null;
    }
    throw err;
  }
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
