const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const memoryTables = new Map();
let memoryWarningEmitted = false;

function clone(value) {
  if (value === undefined || value === null) {
    return value;
  }
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function emitMemoryWarning() {
  if (!memoryWarningEmitted) {
    console.warn(
      'Supabase credentials are not configured. Falling back to in-memory storage for authentication data.'
    );
    memoryWarningEmitted = true;
  }
}

function getMemoryTable(table) {
  emitMemoryWarning();
  if (!memoryTables.has(table)) {
    memoryTables.set(table, []);
  }
  return memoryTables.get(table);
}

function matches(row, match = {}) {
  return Object.entries(match).every(([key, value]) => {
    if (value === undefined || value === null) {
      return true;
    }
    return row?.[key] === value;
  });
}

function ensureSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase URL and service role key must be configured.');
  }
}

function buildQueryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value);
    }
  });
  return query.toString();
}

async function supabaseFetch(table, { method = 'GET', headers = {}, searchParams, body } = {}) {
  ensureSupabaseConfig();
  const base = SUPABASE_URL.endsWith('/') ? SUPABASE_URL.slice(0, -1) : SUPABASE_URL;
  const url = new URL(`${base}/rest/v1/${table}`);

  if (searchParams) {
    const queryString = typeof searchParams === 'string' ? searchParams : buildQueryString(searchParams);
    if (queryString) {
      url.search = queryString;
    }
  }

  const requestInit = {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...headers
    }
  };

  if (body !== undefined) {
    requestInit.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(url, requestInit);
  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      data && typeof data === 'object'
        ? data.message || data.error || 'Supabase request failed'
        : 'Supabase request failed';
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function supabaseSelect(table, { match, filter, single = false, columns = '*' } = {}) {
  if (!supabaseConfigured()) {
    const rows = getMemoryTable(table);
    const filtered = rows.filter((row) => matches(row, match));
    if (single) {
      const value = filtered[0] ?? null;
      return clone(value);
    }
    return filtered.map((row) => clone(row));
  }
  const params = new URLSearchParams({ select: columns });
  if (match && typeof match === 'object') {
    Object.entries(match).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(`${key}`, `eq.${value}`);
      }
    });
  }
  if (filter) {
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    });
  }
  if (single) {
    params.set('limit', '1');
  }
  const data = await supabaseFetch(table, { searchParams: params });
  if (single) {
    return Array.isArray(data) ? data[0] ?? null : data ?? null;
  }
  return Array.isArray(data) ? data : data ? [data] : [];
}

export async function supabaseInsert(table, values) {
  if (!supabaseConfigured()) {
    const tableRows = getMemoryTable(table);
    const payload = Array.isArray(values) ? values : [values];
    const inserted = payload.map((entry) => {
      const next = clone(entry);
      tableRows.push(next);
      return clone(next);
    });
    return Array.isArray(values) ? inserted : inserted[0] ?? null;
  }
  const payload = Array.isArray(values) ? values : [values];
  const data = await supabaseFetch(table, { method: 'POST', body: payload });
  return Array.isArray(values) ? data : data?.[0] ?? null;
}

export async function supabaseUpdate(table, match, values) {
  if (!supabaseConfigured()) {
    const rows = getMemoryTable(table);
    const updated = [];
    rows.forEach((row, index) => {
      if (matches(row, match)) {
        const next = { ...row, ...values };
        rows[index] = next;
        updated.push(clone(next));
      }
    });
    return updated;
  }
  const params = new URLSearchParams();
  if (match && typeof match === 'object') {
    Object.entries(match).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(`${key}`, `eq.${value}`);
      }
    });
  }
  const data = await supabaseFetch(table, { method: 'PATCH', searchParams: params, body: values });
  return Array.isArray(data) ? data : data ? [data] : [];
}

export async function supabaseDelete(table, match) {
  if (!supabaseConfigured()) {
    const rows = getMemoryTable(table);
    for (let index = rows.length - 1; index >= 0; index -= 1) {
      if (matches(rows[index], match)) {
        rows.splice(index, 1);
      }
    }
    return;
  }
  const params = new URLSearchParams();
  if (match && typeof match === 'object') {
    Object.entries(match).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(`${key}`, `eq.${value}`);
      }
    });
  }
  await supabaseFetch(table, { method: 'DELETE', searchParams: params, headers: { Prefer: 'return=minimal' } });
}

export function supabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}
