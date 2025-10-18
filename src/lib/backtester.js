import SAMPLE_PRICE_DATA from '../data/samplePriceData';

const STARTING_CAPITAL = 10000;

const indicatorHelpers = {
  sma(data, index, length) {
    if (index + 1 < length) {
      return null;
    }

    let total = 0;
    for (let i = index - length + 1; i <= index; i += 1) {
      total += data[i].close;
    }

    return Number((total / length).toFixed(4));
  },
  ema(data, index, length) {
    if (length <= 1) {
      return Number(data[index].close.toFixed(4));
    }

    if (index + 1 < length) {
      return null;
    }

    const smoothing = 2 / (length + 1);
    let emaValue = data[index - length + 1].close;

    for (let i = index - length + 2; i <= index; i += 1) {
      emaValue = data[i].close * smoothing + emaValue * (1 - smoothing);
    }

    return Number(emaValue.toFixed(4));
  },
  rsi(data, index, length) {
    if (index < length) {
      return null;
    }

    let gains = 0;
    let losses = 0;

    for (let i = index - length + 1; i <= index; i += 1) {
      const change = data[i].close - data[i - 1].close;
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }

    if (losses === 0) {
      return 100;
    }

    const averageGain = gains / length;
    const averageLoss = losses / length;
    const rs = averageGain / averageLoss;
    const rsi = 100 - 100 / (1 + rs);

    return Number(rsi.toFixed(2));
  },
  highest(data, index, length, accessor = (bar) => bar.high) {
    if (index + 1 < length) {
      return null;
    }

    let highestValue = -Infinity;
    for (let i = index - length + 1; i <= index; i += 1) {
      highestValue = Math.max(highestValue, accessor(data[i]));
    }

    return Number(highestValue.toFixed(4));
  },
  lowest(data, index, length, accessor = (bar) => bar.low) {
    if (index + 1 < length) {
      return null;
    }

    let lowestValue = Infinity;
    for (let i = index - length + 1; i <= index; i += 1) {
      lowestValue = Math.min(lowestValue, accessor(data[i]));
    }

    return Number(lowestValue.toFixed(4));
  },
  percentChange(current, previous) {
    if (!previous || previous === 0) {
      return 0;
    }

    return Number((((current - previous) / previous) * 100).toFixed(2));
  }
};

function formatCurrency(value) {
  return Number(value.toFixed(2));
}

export function runBacktest(code, { initialCapital = STARTING_CAPITAL } = {}) {
  if (typeof code !== 'string' || code.trim().length === 0) {
    throw new Error('Strategy code must be a non-empty string.');
  }

  let strategyFactory;

  try {
    strategyFactory = new Function(
      'helpers',
      `${code}\nif (typeof strategy !== 'function') { throw new Error('Strategy code must define a function named "strategy".'); }\nreturn strategy;`
    );
  } catch (error) {
    throw new Error(`Unable to compile strategy: ${error.message}`);
  }

  let strategy;

  try {
    strategy = strategyFactory(indicatorHelpers);
  } catch (error) {
    throw new Error(`Failed to initialize strategy: ${error.message}`);
  }

  if (typeof strategy !== 'function') {
    throw new Error('Compiled strategy is not a function.');
  }

  const trades = [];
  const equityCurve = [];

  let cash = initialCapital;
  let positionSize = 0;
  let entryPrice = 0;
  let openTrade = null;
  let peakEquity = initialCapital;
  let maxDrawdown = 0;

  SAMPLE_PRICE_DATA.forEach((bar, index) => {
    const state = {
      positionSize,
      entryPrice,
      cash: formatCurrency(cash),
      equity: formatCurrency(cash + positionSize * bar.close)
    };

    let decision;

    try {
      decision = strategy({
        data: SAMPLE_PRICE_DATA,
        index,
        price: bar.close,
        bar,
        state,
        helpers: indicatorHelpers
      });
    } catch (error) {
      throw new Error(`Error while executing strategy on ${bar.date}: ${error.message}`);
    }

    if (decision && typeof decision === 'object') {
      const action = decision.action;
      const size = Number.isFinite(decision.size) ? Math.max(0, decision.size) : 1;

      if (action === 'buy' && positionSize === 0) {
        const cost = bar.close * size;
        if (cost > cash) {
          throw new Error(`Buy signal on ${bar.date} requires ${formatCurrency(cost)} but only ${formatCurrency(cash)} is available.`);
        }

        cash -= cost;
        positionSize = size;
        entryPrice = bar.close;
        openTrade = {
          entryDate: bar.date,
          entryPrice: formatCurrency(bar.close),
          size,
          entryNote: decision.note || 'Buy signal'
        };
      }

      if ((action === 'sell' || action === 'exit') && positionSize > 0) {
        cash += bar.close * positionSize;
        const profit = (bar.close - entryPrice) * positionSize;
        const returnPct = indicatorHelpers.percentChange(bar.close, entryPrice);

        trades.push({
          ...openTrade,
          exitDate: bar.date,
          exitPrice: formatCurrency(bar.close),
          profit: formatCurrency(profit),
          returnPct,
          exitNote: decision.note || 'Exit signal'
        });

        positionSize = 0;
        entryPrice = 0;
        openTrade = null;
      }
    }

    const equity = cash + positionSize * bar.close;
    equityCurve.push({ date: bar.date, value: formatCurrency(equity) });
    peakEquity = Math.max(peakEquity, equity);
    const drawdown = (equity - peakEquity) / peakEquity;
    maxDrawdown = Math.min(maxDrawdown, drawdown);
  });

  if (positionSize > 0) {
    const lastBar = SAMPLE_PRICE_DATA[SAMPLE_PRICE_DATA.length - 1];
    cash += lastBar.close * positionSize;
    const profit = (lastBar.close - entryPrice) * positionSize;
    const returnPct = indicatorHelpers.percentChange(lastBar.close, entryPrice);

    trades.push({
      ...openTrade,
      exitDate: lastBar.date,
      exitPrice: formatCurrency(lastBar.close),
      profit: formatCurrency(profit),
      returnPct,
      exitNote: 'Auto-closed at end of sample'
    });

    positionSize = 0;
  }

  const finalEquity = cash;
  const totalReturn = indicatorHelpers.percentChange(finalEquity, initialCapital);
  const totalTrades = trades.length;
  const wins = trades.filter((trade) => trade.profit > 0).length;
  const winRate = totalTrades ? Number(((wins / totalTrades) * 100).toFixed(2)) : 0;
  const averageReturn = totalTrades
    ? Number((trades.reduce((sum, trade) => sum + trade.returnPct, 0) / totalTrades).toFixed(2))
    : 0;

  return {
    dataset: SAMPLE_PRICE_DATA,
    trades,
    equityCurve,
    metrics: {
      startingCapital: formatCurrency(initialCapital),
      endingCapital: formatCurrency(finalEquity),
      totalReturn,
      totalTrades,
      winRate,
      averageReturn,
      maxDrawdown: Number((maxDrawdown * 100).toFixed(2))
    },
    generatedAt: new Date().toISOString()
  };
}

export const STRATEGY_TEMPLATES = {
  momentumPulse: {
    id: 'momentumPulse',
    name: 'Momentum Pulse',
    description: 'Dual-EMA crossover with protective exits when momentum cools.',
    code: `function strategy({ data, index, price, helpers, state }) {
  const fast = helpers.ema(data, index, 8);
  const slow = helpers.ema(data, index, 21);

  if (fast === null || slow === null) {
    return { action: 'hold' };
  }

  if (fast > slow && state.positionSize === 0) {
    return { action: 'buy', note: 'Fast EMA crossed above slow EMA' };
  }

  const rsi = helpers.rsi(data, index, 14);
  if (state.positionSize > 0 && (fast < slow || (rsi !== null && rsi > 68))) {
    return { action: 'exit', note: 'Momentum fading or RSI overbought' };
  }

  return { action: 'hold' };
}`
  },
  meanRevert: {
    id: 'meanRevert',
    name: 'Mean Reversion Bands',
    description: 'Buy dips below a 20-day average and exit near the median.',
    code: `function strategy({ data, index, price, helpers, state }) {
  const basis = helpers.sma(data, index, 20);
  if (basis === null) {
    return { action: 'hold' };
  }

  const lower = basis * 0.985;
  const upper = basis * 1.015;

  if (price < lower && state.positionSize === 0) {
    return { action: 'buy', note: 'Price dipped under 1.5% band' };
  }

  if (state.positionSize > 0 && price >= upper) {
    return { action: 'sell', note: 'Tagged upper band for exit' };
  }

  return { action: 'hold' };
}`
  },
  breakout: {
    id: 'breakout',
    name: 'High Breakout Ride',
    description: 'Enter on 30-day highs with trailing exit under swing lows.',
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

export { indicatorHelpers as strategyHelpers, STARTING_CAPITAL };
