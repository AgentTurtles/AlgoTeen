export function roundTo(value, decimals = 2) {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Number.parseFloat(numeric.toFixed(decimals));
}

export function formatCurrency(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits
  }).format(value);
}

export function generateSeries(seedPrice, volatility, points = 240) {
  const series = [];
  let price = seedPrice;
  for (let i = 0; i < points; i += 1) {
    const direction = Math.random() > 0.5 ? 1 : -1;
    const move = direction * Math.random() * volatility;
    const open = price;
    price = Math.max(0.1, price + move);
    const close = price;
    const high = Math.max(open, close) + Math.random() * volatility * 0.6;
    const low = Math.min(open, close) - Math.random() * volatility * 0.6;
    const volume = 1000000 + Math.random() * 400000;
    series.push({
      index: i,
      open,
      high,
      low,
      close,
      volume,
      time: i
    });
  }
  return series;
}

export function computeSMA(series, window = 20) {
  const output = [];
  let sum = 0;
  for (let i = 0; i < series.length; i += 1) {
    sum += series[i].close;
    if (i >= window) {
      sum -= series[i - window].close;
    }
    if (i >= window - 1) {
      output.push({ index: series[i].index, value: sum / window });
    } else {
      output.push({ index: series[i].index, value: series[i].close });
    }
  }
  return output;
}

export function computeRSI(series, window = 14) {
  let gains = 0;
  let losses = 0;
  const output = [];

  for (let i = 1; i < series.length; i += 1) {
    const change = series[i].close - series[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    if (i <= window) {
      gains += gain;
      losses += loss;
      const avgGain = gains / window;
      const avgLoss = losses / window;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      output.push({ index: series[i].index, value: 100 - 100 / (1 + rs) });
    } else {
      gains = (gains * (window - 1) + gain) / window;
      losses = (losses * (window - 1) + loss) / window;
      const rs = losses === 0 ? 100 : gains / losses;
      output.push({ index: series[i].index, value: 100 - 100 / (1 + rs) });
    }
  }

  if (output.length < series.length) {
    const padding = series.length - output.length;
    for (let i = 0; i < padding; i += 1) {
      output.unshift({ index: series[i].index, value: 50 });
    }
  }
  return output;
}

export function getLocalStorageValue(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

export function setLocalStorageValue(key, value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}
