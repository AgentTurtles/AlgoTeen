export const WATCHLISTS = [
  {
    id: 'core',
    name: 'Core watch',
    description: 'Liquid names teens actually follow.',
    assetClass: 'stocks',
    symbols: [
      { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Tech', price: 189.24, changePct: 0.68, volume: 81234567, assetClass: 'stocks' },
      { symbol: 'TSLA', name: 'Tesla', sector: 'EV', price: 218.46, changePct: -1.12, volume: 46234578, assetClass: 'stocks' },
      { symbol: 'NVDA', name: 'NVIDIA', sector: 'AI', price: 914.34, changePct: 2.14, volume: 25324567, assetClass: 'stocks' },
      { symbol: 'MSFT', name: 'Microsoft', sector: 'Software', price: 412.19, changePct: 0.36, volume: 34587123, assetClass: 'stocks' },
      { symbol: 'SPY', name: 'S&P 500 ETF', sector: 'ETF', price: 552.61, changePct: 0.41, volume: 76212345, assetClass: 'stocks' }
    ]
  },
  {
    id: 'crypto',
    name: 'Crypto playground',
    description: 'High-volatility pairs for smaller accounts.',
    assetClass: 'crypto',
    symbols: [
      { symbol: 'BTCUSD', name: 'Bitcoin', sector: 'Crypto', price: 64251, changePct: 1.02, volume: 489123, assetClass: 'crypto' },
      { symbol: 'ETHUSD', name: 'Ethereum', sector: 'Crypto', price: 3411, changePct: -0.48, volume: 329012, assetClass: 'crypto' },
      { symbol: 'SOLUSD', name: 'Solana', sector: 'Crypto', price: 146, changePct: 3.58, volume: 778901, assetClass: 'crypto' }
    ]
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
  { id: '3', label: '3%', value: 0.03 },
  { id: '2', label: '2%', value: 0.02 },
  { id: '5', label: '5%', value: 0.05 },
  { id: '1', label: '1%', value: 0.01 },
  { id: 'off', label: 'Off', value: null }
];

export const JOURNAL_TAGS = ['Setup', 'Mistake', 'News catalyst', 'Breakout', 'Mean reversion'];
