import { randomUUID } from 'node:crypto';
import {
  supabaseConfigured,
  supabaseDelete,
  supabaseInsert,
  supabaseSelect,
  supabaseUpdate
} from './supabaseClient';

const USERS_TABLE = process.env.SUPABASE_USERS_TABLE ?? 'next_auth_users';
const ACCOUNTS_TABLE = process.env.SUPABASE_ACCOUNTS_TABLE ?? 'next_auth_accounts';
const SESSIONS_TABLE = process.env.SUPABASE_SESSIONS_TABLE ?? 'next_auth_sessions';
const TOKENS_TABLE = process.env.SUPABASE_VERIFICATION_TOKENS_TABLE ?? 'next_auth_verification_tokens';

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name ?? null,
    email: row.email ?? null,
    emailVerified: row.email_verified ? new Date(row.email_verified) : null,
    image: row.image ?? null,
    username: row.username ?? row.name ?? null
  };
}

function mapAccount(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    provider: row.provider,
    providerAccountId: row.provider_account_id,
    refresh_token: row.refresh_token ?? null,
    access_token: row.access_token ?? null,
    expires_at: row.expires_at ?? null,
    token_type: row.token_type ?? null,
    scope: row.scope ?? null,
    id_token: row.id_token ?? null,
    session_state: row.session_state ?? null
  };
}

function mapSession(row) {
  if (!row) return null;
  return {
    id: row.id ?? null,
    sessionToken: row.session_token,
    userId: row.user_id,
    expires: row.expires ? new Date(row.expires) : null
  };
}

function mapVerificationToken(row) {
  if (!row) return null;
  return {
    identifier: row.identifier,
    token: row.token,
    expires: row.expires ? new Date(row.expires) : null
  };
}

function normalizeUserForInsert(data) {
  return {
    id: data.id ?? randomUUID(),
    name: data.name ?? null,
    username: data.username ?? data.name ?? null,
    email: data.email ?? null,
    email_verified: data.emailVerified ?? null,
    image: data.image ?? null
  };
}

function normalizeAccountForInsert(data) {
  return {
    id: data.id ?? randomUUID(),
    user_id: data.userId,
    type: data.type,
    provider: data.provider,
    provider_account_id: data.providerAccountId,
    refresh_token: data.refresh_token ?? null,
    access_token: data.access_token ?? null,
    expires_at: data.expires_at ?? null,
    token_type: data.token_type ?? null,
    scope: data.scope ?? null,
    id_token: data.id_token ?? null,
    session_state: data.session_state ?? null
  };
}

function normalizeSessionForInsert(data) {
  return {
    id: data.id ?? randomUUID(),
    session_token: data.sessionToken,
    user_id: data.userId,
    expires: data.expires instanceof Date ? data.expires.toISOString() : data.expires
  };
}

function normalizeVerificationToken(data) {
  return {
    identifier: data.identifier,
    token: data.token,
    expires: data.expires instanceof Date ? data.expires.toISOString() : data.expires
  };
}

let warnedAboutMemoryAdapter = false;

export function SupabaseAdapter() {
  if (!supabaseConfigured() && !warnedAboutMemoryAdapter) {
    console.warn(
      'Supabase environment variables are not configured. Using in-memory NextAuth adapter—data will reset between restarts.'
    );
    warnedAboutMemoryAdapter = true;
  }

  return {
    async createUser(data) {
      const payload = normalizeUserForInsert(data);
      const inserted = await supabaseInsert(USERS_TABLE, payload);
      return mapUser(inserted);
    },
    async getUser(id) {
      const row = await supabaseSelect(USERS_TABLE, { match: { id }, single: true });
      return mapUser(row);
    },
    async getUserByEmail(email) {
      if (!email) return null;
      const row = await supabaseSelect(USERS_TABLE, { match: { email }, single: true });
      return mapUser(row);
    },
    async getUserByAccount({ provider, providerAccountId }) {
      const account = await supabaseSelect(ACCOUNTS_TABLE, {
        match: { provider, provider_account_id: providerAccountId },
        single: true
      });
      if (!account) return null;
      const user = await supabaseSelect(USERS_TABLE, { match: { id: account.user_id }, single: true });
      return mapUser(user);
    },
    async updateUser(data) {
      if (!data.id) throw new Error('User id is required for updateUser.');
      const payload = normalizeUserForInsert(data);
      const rows = await supabaseUpdate(USERS_TABLE, { id: data.id }, payload);
      return mapUser(rows?.[0] ?? payload);
    },
    async deleteUser(id) {
      await supabaseDelete(USERS_TABLE, { id });
    },
    async linkAccount(data) {
      const payload = normalizeAccountForInsert(data);
      const inserted = await supabaseInsert(ACCOUNTS_TABLE, payload);
      return mapAccount(inserted);
    },
    async unlinkAccount({ provider, providerAccountId }) {
      await supabaseDelete(ACCOUNTS_TABLE, {
        provider,
        provider_account_id: providerAccountId
      });
    },
    async createSession(data) {
      const payload = normalizeSessionForInsert(data);
      const inserted = await supabaseInsert(SESSIONS_TABLE, payload);
      return mapSession(inserted);
    },
    async getSessionAndUser(sessionToken) {
      const sessionRow = await supabaseSelect(SESSIONS_TABLE, {
        match: { session_token: sessionToken },
        single: true
      });
      if (!sessionRow) {
        return null;
      }
      const userRow = await supabaseSelect(USERS_TABLE, { match: { id: sessionRow.user_id }, single: true });
      return {
        session: mapSession(sessionRow),
        user: mapUser(userRow)
      };
    },
    async updateSession(data) {
      if (!data.sessionToken) throw new Error('sessionToken is required to update a session.');
      const payload = normalizeSessionForInsert(data);
      const rows = await supabaseUpdate(SESSIONS_TABLE, { session_token: data.sessionToken }, payload);
      return mapSession(rows?.[0] ?? payload);
    },
    async deleteSession(sessionToken) {
      await supabaseDelete(SESSIONS_TABLE, { session_token: sessionToken });
    },
    async createVerificationToken(data) {
      const payload = normalizeVerificationToken(data);
      const inserted = await supabaseInsert(TOKENS_TABLE, payload);
      return mapVerificationToken(inserted);
    },
    async useVerificationToken({ identifier, token }) {
      const row = await supabaseSelect(TOKENS_TABLE, { match: { identifier, token }, single: true });
      if (!row) return null;
      await supabaseDelete(TOKENS_TABLE, { identifier, token });
      return mapVerificationToken(row);
    }
  };
}
