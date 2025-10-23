export const WATCHLIST_PRESETS = [
  {
    id: 'core',
    name: 'Core watch',
    description: 'Liquid names teens actually follow.',
    assetClass: 'stocks',
    symbols: [
      { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Tech', assetClass: 'stocks' },
      { symbol: 'TSLA', name: 'Tesla', sector: 'EV', assetClass: 'stocks' },
      { symbol: 'NVDA', name: 'NVIDIA', sector: 'AI', assetClass: 'stocks' },
      { symbol: 'MSFT', name: 'Microsoft', sector: 'Software', assetClass: 'stocks' },
      { symbol: 'SPY', name: 'S&P 500 ETF', sector: 'ETF', assetClass: 'stocks' }
    ]
  },
  {
    id: 'crypto',
    name: 'Crypto playground',
    description: 'High-volatility pairs for smaller accounts.',
    assetClass: 'crypto',
    symbols: [
      { symbol: 'BTC/USD', name: 'Bitcoin', sector: 'Crypto', assetClass: 'crypto' },
      { symbol: 'ETH/USD', name: 'Ethereum', sector: 'Crypto', assetClass: 'crypto' },
      { symbol: 'SOL/USD', name: 'Solana', sector: 'Crypto', assetClass: 'crypto' }
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
