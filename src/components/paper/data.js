export const WATCHLISTS = [
  {
    id: 'core',
    name: 'Core watch',
    description: 'Liquid names teens actually follow.',
    symbols: [
      { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Tech', price: 189.24, changePct: 0.68, volume: 81234567 },
      { symbol: 'TSLA', name: 'Tesla', sector: 'EV', price: 218.46, changePct: -1.12, volume: 46234578 },
      { symbol: 'NVDA', name: 'NVIDIA', sector: 'AI', price: 914.34, changePct: 2.14, volume: 25324567 },
      { symbol: 'MSFT', name: 'Microsoft', sector: 'Software', price: 412.19, changePct: 0.36, volume: 34587123 },
      { symbol: 'SPY', name: 'S&P 500 ETF', sector: 'ETF', price: 552.61, changePct: 0.41, volume: 76212345 }
    ]
  },
  {
    id: 'crypto',
    name: 'Crypto playground',
    description: 'High-volatility pairs for smaller accounts.',
    symbols: [
      { symbol: 'BTCUSD', name: 'Bitcoin', sector: 'Crypto', price: 64251, changePct: 1.02, volume: 489123 },
      { symbol: 'ETHUSD', name: 'Ethereum', sector: 'Crypto', price: 3411, changePct: -0.48, volume: 329012 },
      { symbol: 'SOLUSD', name: 'Solana', sector: 'Crypto', price: 146, changePct: 3.58, volume: 778901 }
    ]
  }
];

export const REALISM_LEVELS = [
  {
    id: 'simple',
    name: 'Simple',
    slippageBps: 2,
    description: 'Instant fills at next tick with a flat 2 bps slip. Use this when you are just learning the ropes.'
  },
  {
    id: 'realistic',
    name: 'Realistic',
    slippageBps: 6,
    description: 'Depth-aware fills with 6 bps base slip and partial fills if you oversize. Better for project work.'
  }
];

export const ORDER_TYPES = [
  { id: 'market', label: 'Market', description: 'Fill at the next tick including configured slippage.' },
  { id: 'limit', label: 'Limit', description: 'Fill only at your price or better. Stays working until hit.' },
  {
    id: 'stop',
    label: 'Stop / Stop-Limit',
    description: 'Trigger when price touches the stop. Optional limit to control slippage.'
  }
];

export const DAILY_LOSS_LIMITS = [
  { id: 'off', label: 'Off', value: null },
  { id: '1', label: '1%', value: 0.01 },
  { id: '2', label: '2%', value: 0.02 },
  { id: '5', label: '5%', value: 0.05 }
];

export const JOURNAL_TAGS = ['Setup', 'Mistake', 'News catalyst', 'Breakout', 'Mean reversion'];
