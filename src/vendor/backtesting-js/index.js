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
  }
};

function formatCurrency(value) {
  return Number(value.toFixed(2));
}

const TIMEFRAME_TO_PERIODS_PER_YEAR = {
  '1Day': 252,
  '4Hour': 252 * 6,
  '1Hour': 252 * 24,
  '15Min': 252 * 24 * 4
};

function ensureStrategy(strategyFactory, data) {
  let strategy;
  try {
    strategy = strategyFactory({ helpers: indicatorHelpers, data });
  } catch (error) {
    throw new Error(`Failed to initialize strategy: ${error.message}`);
  }
  if (typeof strategy !== 'function') {
    throw new Error('Strategy factory must return a function.');
  }
  return strategy;
}

function computeMetrics({ equityCurve, trades, initialCapital, timeframe }) {
  if (!equityCurve.length) {
    return {
      totalReturn: 0,
      maxDrawdown: 0,
      winRate: 0,
      sharpeRatio: 0,
      trades: 0
    };
  }

  const finalEquity = equityCurve[equityCurve.length - 1].equity;
  const totalReturn = ((finalEquity - initialCapital) / initialCapital) * 100;

  let peakEquity = initialCapital;
  let maxDrawdown = 0;
  equityCurve.forEach((point) => {
    peakEquity = Math.max(peakEquity, point.equity);
    const drawdown = peakEquity > 0 ? ((peakEquity - point.equity) / peakEquity) * 100 : 0;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  });

  const wins = trades.filter((trade) => trade.profitLoss > 0).length;
  const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;

  const returns = [];
  for (let i = 1; i < equityCurve.length; i += 1) {
    const prev = equityCurve[i - 1].equity;
    const curr = equityCurve[i].equity;
    if (prev > 0) {
      returns.push((curr - prev) / prev);
    }
  }
  const averageReturn = returns.length ? returns.reduce((sum, value) => sum + value, 0) / returns.length : 0;
  const variance =
    returns.length > 1
      ? returns.reduce((sum, value) => sum + (value - averageReturn) ** 2, 0) / (returns.length - 1)
      : 0;
  const stdDev = Math.sqrt(variance);
  const periodsPerYear = TIMEFRAME_TO_PERIODS_PER_YEAR[timeframe] ?? 252;
  const sharpeRatio = stdDev === 0 ? 0 : ((averageReturn * periodsPerYear) / stdDev) * Math.sqrt(periodsPerYear);

  return {
    totalReturn: Number(totalReturn.toFixed(2)),
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    winRate: Number(winRate.toFixed(2)),
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    trades: trades.length
  };
}

export class BacktestingEngine {
  constructor({ data = [], initialCapital = STARTING_CAPITAL, timeframe = '1Day' } = {}) {
    this.data = data;
    this.initialCapital = initialCapital;
    this.timeframe = timeframe;
    this.strategyFactory = null;
  }

  setStrategy(strategyFactory) {
    this.strategyFactory = strategyFactory;
  }

  run() {
    if (!Array.isArray(this.data) || this.data.length === 0) {
      throw new Error('No market data provided to the backtesting engine.');
    }
    if (!this.strategyFactory) {
      throw new Error('No strategy factory provided to the backtesting engine.');
    }

    const strategy = ensureStrategy(this.strategyFactory, this.data);

    const trades = [];
    const equityCurve = [];
    const logs = [];

    let cash = this.initialCapital;
    let positionSize = 0;
    let entryPrice = 0;
    let peakEquity = this.initialCapital;

    this.data.forEach((bar, index) => {
      const state = {
        positionSize,
        entryPrice,
        cash: formatCurrency(cash),
        equity: formatCurrency(cash + positionSize * bar.close)
      };

      let decision;
      try {
        decision = strategy({
          data: this.data,
          index,
          price: bar.close,
          bar,
          state,
          helpers: indicatorHelpers
        });
      } catch (error) {
        logs.push({
          level: 'error',
          message: `Error while executing strategy on ${bar.date ?? bar.timestamp ?? index}: ${error.message}`
        });
        throw error;
      }

      if (decision && typeof decision === 'object') {
        const action = decision.action;
        const size = Number.isFinite(decision.size) ? Math.max(0, decision.size) : 1;

        if (action === 'buy' && positionSize === 0) {
          const cost = bar.close * size;
          if (cost > cash) {
            throw new Error(
              `Buy signal on ${bar.date ?? bar.timestamp ?? index} requires ${formatCurrency(cost)} but only ${formatCurrency(
                cash
              )} is available.`
            );
          }
          cash -= cost;
          positionSize = size;
          entryPrice = bar.close;
          trades.push({
            type: 'entry',
            side: 'long',
            price: bar.close,
            size,
            index,
            time: bar.timestamp ?? bar.date ?? index,
            note: decision.note ?? null
          });
        } else if (action === 'sell' && positionSize === 0) {
          const proceeds = bar.close * size;
          cash += proceeds;
          positionSize = -size;
          entryPrice = bar.close;
          trades.push({
            type: 'entry',
            side: 'short',
            price: bar.close,
            size,
            index,
            time: bar.timestamp ?? bar.date ?? index,
            note: decision.note ?? null
          });
        } else if (action === 'exit' && positionSize !== 0) {
          const proceeds = bar.close * positionSize;
          cash += proceeds;
          const profitLoss = (bar.close - entryPrice) * positionSize;
          trades.push({
            type: 'exit',
            price: bar.close,
            size: Math.abs(positionSize),
            index,
            time: bar.timestamp ?? bar.date ?? index,
            profitLoss: Number(profitLoss.toFixed(2)),
            note: decision.note ?? null,
            side: positionSize < 0 ? 'short' : 'long'
          });
          positionSize = 0;
          entryPrice = 0;
        }
      }

      const equity = formatCurrency(cash + positionSize * bar.close);
      equityCurve.push({
        index,
        time: bar.timestamp ?? bar.date ?? index,
        equity
      });
      peakEquity = Math.max(peakEquity, equity);
    });

    if (positionSize !== 0) {
      const lastBar = this.data[this.data.length - 1];
      const proceeds = lastBar.close * positionSize;
      cash += proceeds;
      const profitLoss = (lastBar.close - entryPrice) * positionSize;
      trades.push({
        type: 'exit',
        price: lastBar.close,
        size: Math.abs(positionSize),
        index: this.data.length - 1,
        time: lastBar.timestamp ?? lastBar.date ?? this.data.length - 1,
        profitLoss: Number(profitLoss.toFixed(2)),
        note: 'Forced exit at end of series',
        side: positionSize < 0 ? 'short' : 'long'
      });
      const equity = formatCurrency(cash);
      equityCurve.push({
        index: this.data.length,
        time: lastBar.timestamp ?? lastBar.date ?? this.data.length,
        equity
      });
    }

    const metrics = computeMetrics({
      equityCurve,
      trades: trades.filter((trade) => trade.type === 'exit'),
      initialCapital: this.initialCapital,
      timeframe: this.timeframe
    });

    return {
      metrics,
      trades,
      equityCurve,
      logs
    };
  }
}

export function runBacktest({ data, strategy, initialCapital = STARTING_CAPITAL, timeframe = '1Day' }) {
  const engine = new BacktestingEngine({ data, initialCapital, timeframe });
  engine.setStrategy(() => strategy);
  return engine.run();
}

export const helpers = indicatorHelpers;
export const DEFAULT_INITIAL_CAPITAL = STARTING_CAPITAL;
