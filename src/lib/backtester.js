import { BacktestingEngine, DEFAULT_INITIAL_CAPITAL, helpers as indicatorHelpers } from '@/vendor/backtesting-js';

const riskFreeRate = 0.02;

const TIMEFRAME_TO_PERIODS_PER_YEAR = {
  '1Day': 252,
  '4Hour': 252 * 6,
  '1Hour': 252 * 24,
  '15Min': 252 * 24 * 4
};

const TIMEFRAME_TO_BARS_PER_DAY = {
  '1Day': 1,
  '4Hour': 6,
  '1Hour': 24,
  '15Min': 96
};

export const STARTING_CAPITAL = DEFAULT_INITIAL_CAPITAL;

export const STRATEGY_TEMPLATES = {
  momentumPulse: {
    id: 'momentumPulse',
    name: 'Momentum pulse',
    description: 'Dual EMA trend with RSI exit and protective stop.',
    code: `function strategy({ data, index, price, helpers, state }) {
  const fast = helpers.ema(data, index, 8);
  const slow = helpers.ema(data, index, 21);
  const rsi = helpers.rsi(data, index, 14);

  if (fast === null || slow === null || rsi === null) {
    return { action: 'hold' };
  }

  const uptrend = fast > slow;
  const exitSignal = rsi >= 70;

  if (uptrend && state.positionSize === 0) {
    return { action: 'buy', note: 'Fast EMA crossed above slow EMA' };
  }

  if (state.positionSize > 0 && exitSignal) {
    return { action: 'exit', note: 'RSI stretched into overbought' };
  }

  return { action: 'hold' };
}`
  },
  swingChannel: {
    id: 'swingChannel',
    name: 'Swing channel fade',
    description: 'Fade a one-and-a-half percent channel around a 20-day SMA.',
    code: `function strategy({ data, index, price, helpers, state }) {
  const mid = helpers.sma(data, index, 20);
  if (mid === null) {
    return { action: 'hold' };
  }
  const upper = mid * 1.015;
  const lower = mid * 0.985;

  if (price < lower && state.positionSize === 0) {
    return { action: 'buy', note: 'Price dipped under 1.5% band' };
  }

  if (state.positionSize > 0 && price >= upper) {
    return { action: 'exit', note: 'Tagged upper band for exit' };
  }

  return { action: 'hold' };
}`
  },
  breakout: {
    id: 'breakout',
    name: 'High breakout ride',
    description: 'Enter on 30-day highs with trailing exits under swing lows.',
    code: `function strategy({ data, index, price, helpers, state }) {
  const recentHigh = helpers.highest(data, index, 30, (bar) => bar.close);
  const trailingLow = helpers.lowest(data, index, 10, (bar) => bar.low);

  if (recentHigh === null || trailingLow === null) {
    return { action: 'hold' };
  }

  if (price >= recentHigh && state.positionSize === 0) {
    return { action: 'buy', note: 'New 30-day closing high' };
  }

  if (state.positionSize > 0 && price <= trailingLow) {
    return { action: 'exit', note: 'Fell beneath 10-day swing low' };
  }

  return { action: 'hold' };
}`
  }
};

export const DEFAULT_STRATEGY_CODE = STRATEGY_TEMPLATES.momentumPulse.code;

function compileStrategy(code) {
  if (typeof code !== 'string' || code.trim().length === 0) {
    throw new Error('Strategy code must be a non-empty string.');
  }

  const wrapped = `"use strict";${code}\nif (typeof strategy !== 'function') { throw new Error('Strategy code must define a function named "strategy".'); }\nreturn strategy;`;
  try {
    return new Function('helpers', wrapped);
  } catch (error) {
    throw new Error(`Unable to compile strategy: ${error.message}`);
  }
}

function normaliseDataset(dataset = []) {
  return dataset.map((bar, index) => {
    const open = Number.parseFloat(bar.open ?? bar.o ?? bar.Open ?? bar.close ?? bar.c ?? 0) || 0;
    const high = Number.parseFloat(bar.high ?? bar.h ?? bar.High ?? open) || open;
    const low = Number.parseFloat(bar.low ?? bar.l ?? bar.Low ?? open) || open;
    const close = Number.parseFloat(bar.close ?? bar.c ?? bar.Close ?? open) || open;
    const volume = Number.parseFloat(bar.volume ?? bar.v ?? bar.Volume ?? 0) || 0;
    const timestamp = bar.timestamp ?? bar.t ?? bar.date ?? bar.Time ?? index;
    return {
      open,
      high,
      low,
      close,
      volume,
      timestamp,
      date: bar.date ?? bar.time ?? null
    };
  });
}

function aggregateTrades(rawTrades, data) {
  const trades = [];
  let openTrade = null;
  const actionsHit = new Set();
  rawTrades.forEach((event) => {
    if (event.type === 'entry') {
      openTrade = {
        entryDate: event.time,
        entryPrice: Number(event.price.toFixed(2)),
        size: event.size,
        entryNote: event.note ?? null,
        entryIndex: event.index
      };
      actionsHit.add(event.side === 'short' ? 'sell' : 'buy');
    }
    if (event.type === 'exit' && openTrade) {
      const durationBars = event.index - openTrade.entryIndex;
      const profit = Number(event.profitLoss.toFixed(2));
      const entryPrice = openTrade.entryPrice;
      const directionalReturn = event.side === 'short' ? entryPrice - event.price : event.price - entryPrice;
      const returnPct = entryPrice === 0 ? 0 : Number(((directionalReturn / entryPrice) * 100).toFixed(2));
      trades.push({
        ...openTrade,
        exitDate: event.time,
        exitPrice: Number(event.price.toFixed(2)),
        profit,
        returnPct,
        exitNote: event.note ?? null,
        exitIndex: event.index,
        durationBars
      });
      actionsHit.add('exit');
      openTrade = null;
    }
  });
  return { trades, actionsHit };
}

function extractActionLineNumbers(code) {
  const lines = String(code || '').split('\n');
  const actions = {
    buy: [],
    sell: [],
    exit: [],
    short: []
  };
  lines.forEach((line, index) => {
    const normalized = line.trim();
    Object.keys(actions).forEach((action) => {
      if (normalized.includes(`'${action}'`) || normalized.includes(`"${action}"`)) {
        actions[action].push(index + 1);
      }
    });
  });
  return actions;
}

export function runBacktest(code, { initialCapital = STARTING_CAPITAL, dataset, timeframe = '1Day' } = {}) {
  if (!Array.isArray(dataset) || dataset.length === 0) {
    throw new Error('No brokerage market data is available. Load bars before running a backtest.');
  }

  const normalized = normaliseDataset(dataset);
  const strategyFactory = compileStrategy(code);

  const engine = new BacktestingEngine({ data: normalized, initialCapital, timeframe });
  engine.setStrategy(({ helpers, data }) => {
    const userStrategy = strategyFactory(helpers);
    return (payload) => userStrategy({ ...payload, data, helpers });
  });

  const { equityCurve: rawEquity, trades: rawTrades } = engine.run();
  const { trades, actionsHit } = aggregateTrades(rawTrades, normalized);

  const equityCurve = rawEquity.map((point) => ({
    date: normalized[point.index]?.date ?? normalized[point.index]?.timestamp ?? point.index,
    value: Number(point.equity.toFixed(2))
  }));

  const finalEquity = equityCurve.length ? equityCurve[equityCurve.length - 1].value : initialCapital;
  const totalReturn = initialCapital === 0 ? 0 : Number((((finalEquity - initialCapital) / initialCapital) * 100).toFixed(2));
  const totalTrades = trades.length;
  const wins = trades.filter((trade) => trade.profit > 0).length;
  const winRate = totalTrades ? Number(((wins / totalTrades) * 100).toFixed(2)) : 0;
  const averageReturn = totalTrades
    ? Number((trades.reduce((sum, trade) => sum + trade.returnPct, 0) / totalTrades).toFixed(2))
    : 0;

  const periodsPerYear = TIMEFRAME_TO_PERIODS_PER_YEAR[timeframe] ?? 252;
  const barsPerDay = TIMEFRAME_TO_BARS_PER_DAY[timeframe] ?? 1;
  const years = normalized.length / periodsPerYear;
  const totalReturnRatio = initialCapital === 0 ? 0 : finalEquity / initialCapital;
  const cagr = years > 0 && totalReturnRatio > 0 ? Number(((totalReturnRatio ** (1 / years) - 1) * 100).toFixed(2)) : totalReturn;

  const returns = [];
  for (let i = 1; i < equityCurve.length; i += 1) {
    const prev = equityCurve[i - 1].value;
    const curr = equityCurve[i].value;
    if (prev > 0) {
      returns.push((curr - prev) / prev);
    }
  }
  const meanReturn = returns.length ? returns.reduce((sum, value) => sum + value, 0) / returns.length : 0;
  const variance = returns.length
    ? returns.reduce((sum, value) => sum + (value - meanReturn) ** 2, 0) / returns.length
    : 0;
  const stdDev = Math.sqrt(Math.max(variance, 0));
  const annualisedReturn = meanReturn * periodsPerYear;
  const annualisedStd = stdDev * Math.sqrt(periodsPerYear);
  const sharpe = annualisedStd ? Number(((annualisedReturn - riskFreeRate) / annualisedStd).toFixed(2)) : 0;

  const downsideReturns = returns.filter((value) => value < 0);
  const downsideMean = downsideReturns.length
    ? downsideReturns.reduce((sum, value) => sum + value, 0) / downsideReturns.length
    : 0;
  const downsideVariance = downsideReturns.length
    ? downsideReturns.reduce((sum, value) => sum + (value - downsideMean) ** 2, 0) / downsideReturns.length
    : 0;
  const downsideStd = Math.sqrt(Math.max(downsideVariance, 0));
  const sortino = downsideStd ? Number(((annualisedReturn - riskFreeRate) / (downsideStd * Math.sqrt(periodsPerYear))).toFixed(2)) : 0;

  const avgHoldDays = trades.length
    ? Number((trades.reduce((sum, trade) => sum + (trade.durationBars ?? 0), 0) / trades.length / barsPerDay).toFixed(2))
    : 0;
  const timeInMarket = trades.reduce((sum, trade) => sum + (trade.durationBars ?? 0), 0);
  const exposure = normalized.length ? Number(((timeInMarket / normalized.length) * 100).toFixed(2)) : 0;

  const peakEquity = equityCurve.reduce((peak, point) => Math.max(peak, point.value), initialCapital);
  const maxDrawdown = equityCurve.reduce((max, point) => {
    const drawdown = peakEquity > 0 ? ((point.value - peakEquity) / peakEquity) * 100 : 0;
    return Math.min(max, drawdown);
  }, 0);

  const actionLineMap = extractActionLineNumbers(code);
  const coverageActions = Object.keys(actionLineMap).reduce((acc, action) => {
    if (actionLineMap[action].length === 0) {
      return acc;
    }
    acc[action] = {
      hit: actionsHit.has(action),
      lines: actionLineMap[action]
    };
    return acc;
  }, {});

  const uncoveredLineNumbers = Object.entries(coverageActions)
    .filter(([, value]) => !value.hit)
    .flatMap(([, value]) => value.lines);

  return {
    dataset: normalized,
    trades,
    equityCurve,
    metrics: {
      startingCapital: Number(initialCapital.toFixed(2)),
      endingCapital: Number(finalEquity.toFixed(2)),
      totalReturn,
      totalTrades,
      winRate,
      averageReturn,
      maxDrawdown: Number(maxDrawdown.toFixed(2)),
      cagr,
      sharpe,
      sortino,
      avgHoldDays,
      exposure
    },
    coverage: {
      bars: normalized.length,
      signals: trades.length * 2,
      actions: coverageActions,
      uncoveredLineNumbers
    },
    generatedAt: new Date().toISOString()
  };
}

export { indicatorHelpers as strategyHelpers };
