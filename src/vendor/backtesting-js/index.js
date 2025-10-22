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

// Simulate realistic trading costs and execution
function calculateCommission(symbol, quantity, price, commissionConfig = {}) {
  const { perTrade = 0, perShare = 0, percentage = 0 } = commissionConfig;
  let commission = perTrade;
  commission += perShare * Math.abs(quantity);
  commission += percentage * Math.abs(quantity) * price;
  return formatCurrency(commission);
}

function simulateSlippage(price, slippageConfig = {}) {
  const { fixed = 0, percentage = 0 } = slippageConfig;
  const slippageAmount = fixed + (percentage * price);
  // Random direction for slippage
  const direction = Math.random() > 0.5 ? 1 : -1;
  return formatCurrency(price + (slippageAmount * direction));
}

function calculatePositionSize(cash, price, sizeConfig = {}) {
  const { type = 'fixed', value = 1 } = sizeConfig;
  if (type === 'percentage') {
    return Math.floor((cash * value / 100) / price);
  } else if (type === 'fixed') {
    return Math.min(value, Math.floor(cash / price));
  }
  return 1;
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
  constructor({ data = [], initialCapital = STARTING_CAPITAL, timeframe = '1Day', commission = {}, slippage = {}, positionSize = {} } = {}) {
    this.data = data;
    this.initialCapital = initialCapital;
    this.timeframe = timeframe;
    this.commissionConfig = commission;
    this.slippageConfig = slippage;
    this.positionSizeConfig = positionSize;
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
    let stopLossPrice = null;
    let takeProfitPrice = null;
    let totalCommission = 0;

    this.data.forEach((bar, index) => {
      const currentPrice = bar.close;
      const state = {
        positionSize,
        entryPrice,
        cash: formatCurrency(cash),
        equity: formatCurrency(cash + positionSize * currentPrice),
        stopLoss: stopLossPrice,
        takeProfit: takeProfitPrice
      };

      // Check stop-loss and take-profit first
      let forcedExit = false;
      let exitReason = null;
      if (positionSize > 0) {
        if (stopLossPrice && currentPrice <= stopLossPrice) {
          forcedExit = true;
          exitReason = 'Stop-loss triggered';
        } else if (takeProfitPrice && currentPrice >= takeProfitPrice) {
          forcedExit = true;
          exitReason = 'Take-profit triggered';
        }
      } else if (positionSize < 0) {
        if (stopLossPrice && currentPrice >= stopLossPrice) {
          forcedExit = true;
          exitReason = 'Stop-loss triggered';
        } else if (takeProfitPrice && currentPrice <= takeProfitPrice) {
          forcedExit = true;
          exitReason = 'Take-profit triggered';
        }
      }

      if (forcedExit) {
        const executionPrice = simulateSlippage(currentPrice, this.slippageConfig);
        const commission = calculateCommission('', Math.abs(positionSize), executionPrice, this.commissionConfig);
        const proceeds = executionPrice * Math.abs(positionSize);
        cash += proceeds - commission;
        totalCommission += commission;
        const profitLoss = (executionPrice - entryPrice) * positionSize - commission;

        trades.push({
          type: 'exit',
          price: executionPrice,
          size: Math.abs(positionSize),
          index,
          time: bar.timestamp ?? bar.date ?? index,
          profitLoss: Number(profitLoss.toFixed(2)),
          note: exitReason,
          side: positionSize < 0 ? 'short' : 'long',
          commission
        });
        positionSize = 0;
        entryPrice = 0;
        stopLossPrice = null;
        takeProfitPrice = null;
      }

      // Get strategy decision
      let decision;
      try {
        decision = strategy({
          data: this.data,
          index,
          price: currentPrice,
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

      if (decision && typeof decision === 'object' && !forcedExit) {
        const action = decision.action;
        const size = decision.size || this.positionSizeConfig;
        const stopLoss = decision.stopLoss;
        const takeProfit = decision.takeProfit;

        if ((action === 'buy' || action === 'sell') && positionSize === 0) {
          const executionPrice = simulateSlippage(currentPrice, this.slippageConfig);
          const calculatedSize = calculatePositionSize(cash, executionPrice, size);
          const cost = executionPrice * calculatedSize;
          const commission = calculateCommission('', calculatedSize, executionPrice, this.commissionConfig);

          if (cost + commission > cash) {
            logs.push({
              level: 'warning',
              message: `Insufficient funds for ${action} on ${bar.date ?? bar.timestamp ?? index}: need ${formatCurrency(cost + commission)}, have ${formatCurrency(cash)}`
            });
          } else {
            cash -= cost + commission;
            totalCommission += commission;
            positionSize = action === 'buy' ? calculatedSize : -calculatedSize;
            entryPrice = executionPrice;

            // Set stop-loss and take-profit if provided
            if (stopLoss) {
              stopLossPrice = action === 'buy' ? executionPrice * (1 - stopLoss / 100) : executionPrice * (1 + stopLoss / 100);
            }
            if (takeProfit) {
              takeProfitPrice = action === 'buy' ? executionPrice * (1 + takeProfit / 100) : executionPrice * (1 - takeProfit / 100);
            }

            trades.push({
              type: 'entry',
              side: action === 'buy' ? 'long' : 'short',
              price: executionPrice,
              size: calculatedSize,
              index,
              time: bar.timestamp ?? bar.date ?? index,
              note: decision.note ?? null,
              commission
            });
          }
        } else if (action === 'exit' && positionSize !== 0) {
          const executionPrice = simulateSlippage(currentPrice, this.slippageConfig);
          const commission = calculateCommission('', Math.abs(positionSize), executionPrice, this.commissionConfig);
          const proceeds = executionPrice * Math.abs(positionSize);
          cash += proceeds - commission;
          totalCommission += commission;
          const profitLoss = (executionPrice - entryPrice) * positionSize - commission;

          trades.push({
            type: 'exit',
            price: executionPrice,
            size: Math.abs(positionSize),
            index,
            time: bar.timestamp ?? bar.date ?? index,
            profitLoss: Number(profitLoss.toFixed(2)),
            note: decision.note ?? null,
            side: positionSize < 0 ? 'short' : 'long',
            commission
          });
          positionSize = 0;
          entryPrice = 0;
          stopLossPrice = null;
          takeProfitPrice = null;
        }
      }

      const equity = formatCurrency(cash + positionSize * currentPrice);
      equityCurve.push({
        index,
        time: bar.timestamp ?? bar.date ?? index,
        equity
      });
    });

    // Handle open position at end
    if (positionSize !== 0) {
      const lastBar = this.data[this.data.length - 1];
      const executionPrice = simulateSlippage(lastBar.close, this.slippageConfig);
      const commission = calculateCommission('', Math.abs(positionSize), executionPrice, this.commissionConfig);
      const proceeds = executionPrice * Math.abs(positionSize);
      cash += proceeds - commission;
      totalCommission += commission;
      const profitLoss = (executionPrice - entryPrice) * positionSize - commission;

      trades.push({
        type: 'exit',
        price: executionPrice,
        size: Math.abs(positionSize),
        index: this.data.length - 1,
        time: lastBar.timestamp ?? lastBar.date ?? this.data.length - 1,
        profitLoss: Number(profitLoss.toFixed(2)),
        note: 'Forced exit at end of series',
        side: positionSize < 0 ? 'short' : 'long',
        commission
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

    // Add commission to metrics
    metrics.totalCommission = formatCurrency(totalCommission);

    return {
      metrics,
      trades,
      equityCurve,
      logs
    };
  }
}

export function runBacktest({ data, strategy, initialCapital = STARTING_CAPITAL, timeframe = '1Day', commission = {}, slippage = {}, positionSize = {} }) {
  const engine = new BacktestingEngine({ data, initialCapital, timeframe, commission, slippage, positionSize });
  engine.setStrategy(() => strategy);
  return engine.run();
}

export const helpers = indicatorHelpers;
export const DEFAULT_INITIAL_CAPITAL = STARTING_CAPITAL;
