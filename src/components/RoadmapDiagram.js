'use client';

import { useMemo, useState, useCallback } from 'react';
import Xarrow, { Xwrapper } from 'react-xarrows';

const INTERACTIVE_CLASSES =
  'relative inline-flex w-full items-center justify-center rounded-2xl border border-emerald-900/15 bg-white/90 px-6 py-4 text-center shadow-[0_14px_28px_rgba(10,30,20,0.12)] transition-transform duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(10,30,20,0.18)] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-400/60 focus:ring-offset-white';

const MODULE_CLASSES =
  'relative inline-flex w-full items-center justify-center rounded-2xl border border-emerald-900/10 bg-white px-6 py-5 text-center shadow-[0_12px_26px_rgba(10,30,20,0.12)]';

const MODULE_TEXT_STYLE = {
  fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif',
  fontSize: '18px',
  fontWeight: 700,
  letterSpacing: '-0.4px',
  color: '#0f2f1f',
  textAlign: 'center'
};

const INTERACTIVE_TEXT_STYLE = {
  fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif',
  fontSize: '16px',
  fontWeight: 500,
  letterSpacing: '-0.3px',
  color: '#123827',
  textAlign: 'center'
};

const DETAIL_TEXT_STYLE = {
  ...INTERACTIVE_TEXT_STYLE,
  fontWeight: 600
};

const NODE_SURFACE_STYLE = {
  borderRadius: '5px',
  border: '1px solid #000',
  background: 'rgba(255, 255, 255, 0.73)'
};

const LEFT_TOPIC_OFFSETS = {
  'essential-terminology': { first: '0rem', rest: '0.75rem' },
  'risk-planning': { first: '6rem', rest: '1.5rem' },
  'programming-data-sources': { first: '1.5rem', rest: '0.75rem' }
};

const FIRST_LEFT_TOPIC_BY_MODULE = {
  'essential-terminology': 'long-short',
  'risk-planning': 'risk-reward',
  'programming-data-sources': 'programming-api-auth'
};

const NODE_DETAILS = {
  'long-short': {
    title: 'Long vs Short Positions',
    description: 'Understand how to profit from rising or falling markets and when to choose each side.',
    resources: [
      { label: 'Babypips: Long vs Short', href: 'https://www.babypips.com/learn/forex/long-and-short' },
      { label: 'Investopedia: Long Position', href: 'https://www.investopedia.com/terms/l/long.asp' }
    ]
  },
  volatility: {
    title: 'Market Volatility',
    description: 'Learn how price swings impact risk and how to adapt your strategy when markets move fast.',
    resources: [
      { label: 'Babypips: What Is Volatility?', href: 'https://www.babypips.com/learn/forex/what-is-volatility' },
      { label: 'Investopedia: Volatility', href: 'https://www.investopedia.com/terms/v/volatility.asp' }
    ]
  },
  pips: {
    title: 'Pips, Points, and Ticks',
    description: 'Master the units that measure price movement so you can size positions and track profit accurately.',
    resources: [
      { label: 'Babypips: What Is a Pip?', href: 'https://www.babypips.com/learn/forex/what-is-a-pip' },
      { label: 'Investopedia: Pip', href: 'https://www.investopedia.com/terms/p/pip.asp' }
    ]
  },
  leverage: {
    title: 'Leverage and Margin',
    description: 'See how leverage amplifies gains and losses, and learn to manage margin requirements responsibly.',
    resources: [
      { label: 'Babypips: Margin and Leverage', href: 'https://www.babypips.com/learn/forex/margin-and-leverage' },
      { label: 'Investopedia: Leverage', href: 'https://www.investopedia.com/terms/l/leverage.asp' }
    ]
  },
  timeframes: {
    title: 'Trading Timeframes',
    description: 'Compare scalping, day trading, and swing horizons to choose a timeframe that fits your routine.',
    resources: [
      { label: 'Babypips: Chart Timeframes', href: 'https://www.babypips.com/learn/forex/chart-time-frames' },
      { label: 'Investopedia: Using Time Frames', href: 'https://www.investopedia.com/trading/how-to-use-time-frames-when-trading-forex/' }
    ]
  },
  stop: {
    title: 'Stop Loss & Take Profit',
    description: 'Lock in gains and cap losses by placing stops and targets based on structure, volatility, and risk.',
    resources: [
      { label: 'Babypips: Stops & Limits', href: 'https://www.babypips.com/learn/forex/stop-loss-orders' },
      { label: 'Investopedia: Stop Order', href: 'https://www.investopedia.com/terms/s/stoporder.asp' }
    ]
  },
  'risk-plan': {
    title: 'Risk Management Plan',
    description: 'Build a written plan that defines risk per trade, drawdown limits, and review cadences.',
    resources: [
      { label: 'Babypips: Trading Plan', href: 'https://www.babypips.com/learn/forex/how-to-create-a-trading-plan' },
      { label: 'Investopedia: Risk Management', href: 'https://www.investopedia.com/articles/trading/08/risk-management.asp' }
    ]
  },
  discipline: {
    title: 'Trader Psychology',
    description: 'Stay consistent by training emotional control, journaling trades, and embracing probabilistic thinking.',
    resources: [
      { label: 'Babypips: Trading Psychology', href: 'https://www.babypips.com/learn/forex/trading-psychology' },
      { label: 'Investopedia: Trader Psychology', href: 'https://www.investopedia.com/articles/forex/09/trader-psychology.asp' }
    ]
  },
  investing: {
    title: 'Trading vs Investing',
    description: 'Contrast short-term speculation with long-term investing to match your goals and risk tolerance.',
    resources: [
      { label: 'Babypips: Trading vs Investing', href: 'https://www.babypips.com/learn/forex/trading-vs-investing' },
      { label: 'Investopedia: Trading vs Investing', href: 'https://www.investopedia.com/articles/trading/09/trading-investing-differences.asp' }
    ]
  },
  markets: {
    title: 'How Markets Work',
    description: 'Discover how orders match, what drives liquidity, and the role of market microstructure.',
    resources: [
      { label: 'Babypips: Market Structure', href: 'https://www.babypips.com/learn/forex/market-structure' },
      { label: 'Investopedia: Financial Markets', href: 'https://www.investopedia.com/terms/f/financial-market.asp' }
    ]
  },
  instruments: {
    title: 'Trading Instruments',
    description: 'Compare forex, stocks, and crypto to understand volatility, liquidity, and cost profiles.',
    resources: [
      { label: 'Babypips: Major Currency Pairs', href: 'https://www.babypips.com/learn/forex/major-currency-pairs' },
      { label: 'Investopedia: Trading Instrument', href: 'https://www.investopedia.com/terms/t/trading-instrument.asp' }
    ]
  },
  exchanges: {
    title: 'Exchanges & Brokers',
    description: 'Learn how brokers route orders, earn spreads, and why regulation matters for account safety.',
    resources: [
      { label: 'Babypips: Choosing a Broker', href: 'https://www.babypips.com/learn/forex/how-to-choose-a-broker' },
      { label: 'Investopedia: Stock Exchange', href: 'https://www.investopedia.com/terms/s/stockexchange.asp' }
    ]
  },
  participants: {
    title: 'Market Participants',
    description: 'Identify retail, institutional, and algorithmic players to see who moves price and why.',
    resources: [
      { label: 'Babypips: Market Participants', href: 'https://www.babypips.com/learn/forex/market-participants' },
      { label: 'Investopedia: Market Participant', href: 'https://www.investopedia.com/terms/m/marketparticipant.asp' }
    ]
  },
  quiz: {
    title: 'Terminology Quiz',
    description: 'Test your retention of key trading vocabulary before moving on to the next module.',
    resources: [
      { label: 'Babypips: Quizzes', href: 'https://www.babypips.com/quizzes' },
      { label: 'Investopedia: Financial Terms', href: 'https://www.investopedia.com/financial-term-dictionary-4769738' }
    ]
  },
  trend: {
    title: 'Trend Identification',
    description: 'Recognize bullish, bearish, and ranging structure to align trades with market direction.',
    resources: [
      { label: 'Babypips: Spotting Trends', href: 'https://www.babypips.com/learn/forex/trend-trading-basics' },
      { label: 'Investopedia: Trend', href: 'https://www.investopedia.com/terms/t/trend.asp' }
    ]
  },
  trendlines: {
    title: 'Drawing Trendlines',
    description: 'Plot clean trendlines using swing highs and lows to map structure and call out potential breaks.',
    resources: [
      { label: 'Babypips: Trendlines', href: 'https://www.babypips.com/learn/forex/how-to-draw-trend-lines' },
      { label: 'Investopedia: Trendline', href: 'https://www.investopedia.com/terms/t/trendline.asp' }
    ]
  },
  'support-resistance': {
    title: 'Support & Resistance',
    description: 'Map out price levels where buying or selling pressure emerges to time entries and exits.',
    resources: [
      { label: 'Babypips: Support & Resistance', href: 'https://www.babypips.com/learn/forex/support-resistance' },
      { label: 'Investopedia: Support', href: 'https://www.investopedia.com/terms/s/support.asp' }
    ]
  },
  levels: {
    title: 'Horizontal vs Dynamic Levels',
    description: 'Compare static price zones with moving averages and bands so you can trade both styles.',
    resources: [
      { label: 'Babypips: Dynamic Support', href: 'https://www.babypips.com/learn/forex/dynamic-support-and-resistance' },
      { label: 'Investopedia: Moving Average', href: 'https://www.investopedia.com/terms/m/movingaverage.asp' }
    ]
  },
  patterns: {
    title: 'Chart Patterns',
    description: 'Study classic reversals and continuations like head and shoulders, triangles, and flags.',
    resources: [
      { label: 'Babypips: Chart Patterns', href: 'https://www.babypips.com/learn/forex/major-chart-patterns' },
      { label: 'Investopedia: Chart Patterns', href: 'https://www.investopedia.com/articles/technical/112601.asp' }
    ]
  },
  volume: {
    title: 'Volume Analysis',
    description: 'Use volume as confirmation for breakouts, reversals, and trend strength across markets.',
    resources: [
      { label: 'Babypips: Volume', href: 'https://www.babypips.com/learn/forex/volume' },
      { label: 'Investopedia: Volume Analysis', href: 'https://www.investopedia.com/articles/trading/08/volume-interpretation.asp' }
    ]
  },
  'risk-reward': {
    title: 'Risk/Reward Ratio',
    description: 'Calibrate reward targets to risk so your edge holds up over many trades.',
    resources: [
      { label: 'Babypips: Risk to Reward', href: 'https://www.babypips.com/learn/forex/risk-to-reward-ratio' },
      { label: 'Investopedia: Risk/Reward Ratio', href: 'https://www.investopedia.com/terms/r/riskrewardratio.asp' }
    ]
  },
  'percent-rule': {
    title: 'Percent Risk Rule',
    description: 'Cap losses by defining the percentage of capital you are willing to risk on each trade.',
    resources: [
      { label: 'Babypips: Risk Management', href: 'https://www.babypips.com/learn/forex/risk-management' },
      { label: 'Investopedia: Two Percent Rule', href: 'https://www.investopedia.com/terms/t/twopercentrule.asp' }
    ]
  },
  stops: {
    title: 'Using Stops Effectively',
    description: 'Refine stop placement using ATR, structure, and trade invalidation signals to stay consistent.',
    resources: [
      { label: 'Babypips: Stop Strategies', href: 'https://www.babypips.com/learn/forex/stop-loss-placement' },
      { label: 'Investopedia: Stop-Loss Order', href: 'https://www.investopedia.com/terms/s/stop-lossorder.asp' }
    ]
  },
  'programming-api-auth': {
    title: 'API Authentication and Rate Limiting',
    description: 'Secure connections to market data APIs with OAuth and design throttling strategies that keep requests within vendor limits.',
    resources: [
      { label: 'OAuth 2.0 Overview', href: 'https://oauth.net/2/' },
      { label: 'AWS API Gateway Throttling', href: 'https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html' }
    ]
  },
  'programming-websocket': {
    title: 'WebSocket Streaming',
    description: 'Build low-latency data feeds using WebSockets for real-time market updates and order routing.',
    resources: [
      { label: 'MDN: WebSockets API', href: 'https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API' },
      { label: 'Binance WebSocket Streams', href: 'https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams' }
    ]
  },
  'programming-data-normalization': {
    title: 'Data Normalization & Cleaning',
    description: 'Normalize fields from mixed providers and handle missing values so indicators stay accurate across assets.',
    resources: [
      { label: 'Investopedia: Normalization', href: 'https://www.investopedia.com/terms/n/normalization.asp' },
      { label: 'pandas: Working with Missing Data', href: 'https://pandas.pydata.org/docs/user_guide/missing_data.html' }
    ]
  },
  'programming-ohlcv': {
    title: 'OHLCV Structures',
    description: 'Capture open, high, low, close, and volume (OHLCV) bars to power indicators and backtests.',
    resources: [
      { label: 'Investopedia: OHLC Definition', href: 'https://www.investopedia.com/terms/o/open-high-low-close.asp' },
      { label: 'Binance Kline Data', href: 'https://binance-docs.github.io/apidocs/spot/en/#kline-candlestick-data' }
    ]
  },
  'programming-timezones': {
    title: 'Timezone Handling',
    description: 'Convert timestamps across exchanges and keep logs, charts, and orders synchronized globally.',
    resources: [
      { label: 'Python datetime Time Zones', href: 'https://docs.python.org/3/library/datetime.html#time-zones' },
      { label: 'pandas: Time Zone Handling', href: 'https://pandas.pydata.org/docs/user_guide/timeseries.html#time-zone-handling' }
    ]
  },
  'programming-data-storage': {
    title: 'Data Storage Pipelines',
    description: 'Persist historical bars and executions with SQLite, PostgreSQL, and SQLAlchemy for resilient analytics.',
    resources: [
      { label: 'Python sqlite3 Module', href: 'https://docs.python.org/3/library/sqlite3.html' },
      { label: 'SQLAlchemy Engine Tutorial', href: 'https://docs.sqlalchemy.org/en/20/tutorial/engine.html' }
    ]
  },
  'programming-financial-data': {
    title: 'Financial Data & Technical Analysis',
    description: 'Frame how institutional desks automate trade execution and analysis with program trading.',
    resources: [
      { label: 'Investopedia: Program Trading', href: 'https://www.investopedia.com/articles/trading/07/program_trading.asp' },
      { label: 'Investopedia: Algorithmic Trading', href: 'https://www.investopedia.com/terms/a/algorithmictrading.asp' }
    ]
  },
  'programming-data-sources': {
    title: 'Market Data Sources',
    description: 'Select and orchestrate vendor APIs for equities, forex, and crypto datasets inside your pipeline.',
    resources: [
      { label: 'Alpha Vantage Documentation', href: 'https://www.alphavantage.co/documentation/' },
      { label: 'pandas-datareader Docs', href: 'https://pandas-datareader.readthedocs.io/en/latest/' }
    ]
  },
  'programming-master': {
    title: 'Master Data Hub',
    description: 'Centralize cleaned datasets for indicators, signal research, and backtesting workflows.',
    resources: [
      { label: 'Investopedia: Algorithmic Trading Overview', href: 'https://www.investopedia.com/terms/a/algorithmictrading.asp' },
      { label: 'Investopedia: Backtesting', href: 'https://www.investopedia.com/terms/b/backtesting.asp' }
    ]
  },
  'programming-technical-implementation': {
    title: 'Technical Analysis Implementation',
    description: 'Code indicators, scanners, and order logic that bridge from research to execution.',
    resources: [
      {
        label: 'Investopedia: Algorithmic Trading Strategies',
        href: 'https://www.investopedia.com/articles/active-trading/121914/algorithmic-trading-winning-strategies-and-their-rationale.asp'
      },
      {
        label: 'freeCodeCamp: Algorithmic Trading with Python',
        href: 'https://www.youtube.com/watch?v=xfzGZB4HhEE'
      }
    ]
  },
  'programming-projects-primary': {
    title: 'Programming Project Ideas',
    description:
      'Pick one of these builds to pull everything together: simulate live trading, engineer exchange mechanics, backtest event streams, or fuse sentiment with signals.',
    resources: [
      {
        label: 'Paper-Trading Simulator (Game Style)',
        description:
          'Ship a React front end that feels like a broker with a Convex or Supabase backend. Use virtual cash to route simulated trades with live Yahoo Finance or Alpha Vantage quotes, and add leaderboards so classmates can compete.'
      },
      {
        label: 'Market Order Matching Engine (Mini Exchange)',
        description:
          'Design a simplified matching engine that accepts bids and asks, prioritises by price then time, and clears orders with FIFO queues. Great for learning data structures and exchange plumbing.'
      },
      {
        label: 'Event-Driven Backtester',
        description:
          'Build a modular backtesting engine with components like DataLoader, Strategy, Broker, and Performance. Feed historical market events through the pipeline, inject slippage and transaction costs, and report metrics.'
      },
      {
        label: 'Sentiment-Driven Strategy',
        description:
          'Scrape tweets or news for a target symbol, classify sentiment, and pipe the signal into trade logic. Shows how alternative data shifts strategy behaviour.'
      }
    ]
  },
  'programming-projects-side': {
    title: 'Stretch Project Paths',
    description: 'Level up the builds with real brokerage APIs, datasets, and tournaments once the v1 prototypes work.',
    resources: [
      {
        label: 'Interactive Brokers API Guide',
        description: 'Graduate the matching engine to a production-grade API that mirrors how professional desks route real orders.'
      },
      {
        label: 'Alpaca Learning Hub',
        description: 'Use Alpaca’s paper and live trading APIs to extend the simulator into true brokerage connectivity.'
      },
      {
        label: 'QuantConnect Documentation',
        description: 'Compare your event-driven architecture with a production platform, then port strategies to their research/Live environment.'
      },
      {
        label: 'Kaggle Datasets',
        description: 'Pull alternative datasets to enrich sentiment models or broaden the backtester with new asset classes.'
      }
    ]
  }
};

const leftTopics = [
  { id: 'long-short', label: 'Long vs Short positions', module: 'essential-terminology' },
  { id: 'volatility', label: 'Volatility', module: 'essential-terminology' },
  { id: 'pips', label: 'Pips, Points, and Ticks', module: 'essential-terminology' },
  { id: 'leverage', label: 'Leverage and Margin', module: 'essential-terminology' },
  { id: 'stop', label: 'Stop Loss and Take Profit', module: 'essential-terminology' },
  { id: 'risk-reward', label: 'Risk-reward ratio', module: 'risk-planning', startSpacing: true },
  { id: 'risk-plan', label: 'Creating a risk management plan', module: 'risk-planning' },
  { id: 'discipline', label: 'Emotional control and discipline', module: 'risk-planning' },
  { id: 'percent-rule', label: 'The % rule', module: 'risk-planning' },
  { id: 'stops', label: 'Using stop losses effectively', module: 'risk-planning' }
];

const modules = [
  { id: 'module-title', label: 'Module 1: Trading' },
  { id: 'trading-basics', label: 'Trading Basics' },
  { id: 'essential-terminology', label: 'Essential Trading Terminology' },
  { id: 'setup', label: 'Setting Up For Trading' },
  { id: 'chart-reading', label: 'Chart Reading & Analysis' },
  { id: 'risk-planning', label: 'Risk Management' },
  { id: 'module-end', label: 'End of Module 1' }
];

const rightTopics = [
  { id: 'investing', label: 'Trading vs Investing', source: 'trading-basics' },
  { id: 'markets', label: 'How financial markets work', source: 'trading-basics' },
  { id: 'instruments', label: 'Stocks, Forex and Crypto', source: 'trading-basics' },
  { id: 'exchanges', label: 'The role of exchanges and brokers', source: 'trading-basics' },
  { id: 'participants', label: 'Understanding market participants', source: 'trading-basics' },
  { id: 'quiz', label: 'QUIZ', source: 'trading-basics' },
  { id: 'timeframes', label: 'Timeframes (M1, M5, H1, D1, etc.)', source: 'chart-reading', startSpacing: true },
  { id: 'trend', label: 'Trend identification (uptrend, downtrend, sideways)', source: 'chart-reading' },
  { id: 'trendlines', label: 'Drawing trendlines', source: 'chart-reading' },
  { id: 'support-resistance', label: 'Support and resistance levels', source: 'chart-reading' },
  { id: 'levels', label: 'Horizontal levels vs Dynamic levels', source: 'chart-reading' },
  { id: 'patterns', label: 'Chart patterns (Head & Shoulders, Double Top/Bottom, Triangles, Flags)', source: 'chart-reading' },
  { id: 'volume', label: 'Volume analysis basics', source: 'chart-reading' }
];

const programmingLeftTopics = [
  { id: 'programming-api-auth', label: 'API authentication and rate limiting', module: 'programming-data-sources', startSpacing: true },
  { id: 'programming-websocket', label: 'WebSocket connections for real-time streaming', module: 'programming-data-sources' },
  { id: 'programming-data-normalization', label: 'Data normalization and handling missing values', module: 'programming-data-sources' },
  { id: 'programming-ohlcv', label: 'OHLCV data structure (Open, High, Low, Close, Volume)', module: 'programming-data-sources' },
  { id: 'programming-timezones', label: 'Timezone handling for global markets', module: 'programming-data-sources' },
  { id: 'programming-data-storage', label: 'Data storage (SQLite, PostgreSQL with SQLAlchemy)', module: 'programming-data-sources' }
];

const programmingModules = [
  { id: 'programming-financial-data', label: 'Financial Data & Technical Analysis' },
  { id: 'programming-data-sources', label: 'Data Sources and APIs' },
  { id: 'programming-master', label: 'Master' },
  { id: 'programming-technical-implementation', label: 'Technical Analysis Implementation' },
  {
    id: 'programming-projects-primary',
    label: 'PROJECTS :D',
    surfaceStyle: { background: '#0f7bff', border: '1px solid #0f7bff' },
    textStyle: { color: '#ffffff' }
  }
];

const programmingRightNodes = [

  {
    id: 'programming-data-api-stack',
    type: 'panel',
    title: 'Data Source APIs',
    items: [
      {
        label: 'yfinance - Free historical data from Yahoo Finance',
        href: 'https://pypi.org/project/yfinance/'
      },
      {
        label: 'Alpha Vantage - Stocks, forex, crypto APIs',
        href: 'https://www.alphavantage.co/documentation/'
      },
      {
        label: 'Binance API - Cryptocurrency real-time data',
        href: 'https://binance-docs.github.io/apidocs/spot/en/'
      },
      {
        label: 'Alpaca API - Stock market data and trading',
        href: 'https://alpaca.markets/docs/api-references/market-data-api/stock-pricing-data/'
      },
      {
        label: 'Interactive Brokers API - Professional trading data',
        href: 'https://interactivebrokers.github.io/'
      },
      {
        label: 'pandas-datareader - Multiple data sources',
        href: 'https://pandas-datareader.readthedocs.io/en/latest/'
      }
    ],
    startSpacing: true,
    source: 'programming-data-sources'
  }
];

const connectorEdges = [
  { id: 'module-flow-1', source: 'module-title', target: 'trading-basics', startAnchor: 'bottom', endAnchor: 'top' },
  { id: 'module-flow-2', source: 'trading-basics', target: 'essential-terminology', startAnchor: 'bottom', endAnchor: 'top' },
  { id: 'module-flow-3', source: 'essential-terminology', target: 'setup', startAnchor: 'bottom', endAnchor: 'top' },
  { id: 'module-flow-4', source: 'setup', target: 'chart-reading', startAnchor: 'bottom', endAnchor: 'top' },
  { id: 'module-flow-5', source: 'chart-reading', target: 'risk-planning', startAnchor: 'bottom', endAnchor: 'top' }
];

const programmingConnectorEdges = [
  { id: 'programming-flow-1', source: 'programming-financial-data', target: 'programming-data-sources', startAnchor: 'bottom', endAnchor: 'top' },
  { id: 'programming-flow-2', source: 'programming-data-sources', target: 'programming-master', startAnchor: 'bottom', endAnchor: 'top' },
  { id: 'programming-flow-3', source: 'programming-master', target: 'programming-technical-implementation', startAnchor: 'bottom', endAnchor: 'top' },
  { id: 'programming-flow-4', source: 'programming-technical-implementation', target: 'programming-projects-primary', startAnchor: 'bottom', endAnchor: 'top' }
];

function NodeCard({ node, variant, onClick }) {
  if (variant === 'module') {
    const moduleSurfaceStyle = node.surfaceStyle
      ? { ...NODE_SURFACE_STYLE, ...node.surfaceStyle }
      : NODE_SURFACE_STYLE;
    const moduleTextStyle = node.textStyle
      ? { ...MODULE_TEXT_STYLE, ...node.textStyle }
      : MODULE_TEXT_STYLE;

    const Tag = onClick ? 'button' : 'div';

    return (
      <Tag
        type={onClick ? 'button' : undefined}
        id={node.id}
        className={`${MODULE_CLASSES}${onClick ? ' transition-transform duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(10,30,20,0.18)] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-400/60 focus:ring-offset-white' : ''}`}
        style={{ ...moduleSurfaceStyle, ...moduleTextStyle }}
        onClick={onClick ? () => onClick(node.id) : undefined}
      >
        {node.label}
      </Tag>
    );
  }

  const isFuture = node.italic;
  const isDisabled = isFuture || node.disabled;
  const baseStyle = isFuture ? { ...INTERACTIVE_TEXT_STYLE, fontStyle: 'italic' } : INTERACTIVE_TEXT_STYLE;
  const surfaceStyle = node.surfaceStyle
    ? { ...NODE_SURFACE_STYLE, ...node.surfaceStyle }
    : NODE_SURFACE_STYLE;
  const textStyle = node.textStyle ? { ...baseStyle, ...node.textStyle } : baseStyle;

  return (
    <button
      type="button"
      id={node.id}
      className={`${INTERACTIVE_CLASSES}${isFuture ? ' italic text-emerald-900/60' : ''}`}
      style={{ ...surfaceStyle, ...textStyle }}
      onClick={isDisabled ? undefined : () => onClick?.(node.id)}
      disabled={isDisabled}
    >
      {node.label}
    </button>
  );
}

function DetailNode({ node, onClick }) {
  const isFuture = node.italic;
  const baseClass = INTERACTIVE_CLASSES;
  const baseStyle = isFuture ? { ...DETAIL_TEXT_STYLE, fontStyle: 'italic' } : DETAIL_TEXT_STYLE;
  const surfaceStyle = node.surfaceStyle
    ? { ...NODE_SURFACE_STYLE, ...node.surfaceStyle }
    : NODE_SURFACE_STYLE;
  const textStyle = node.textStyle ? { ...baseStyle, ...node.textStyle } : baseStyle;

  return (
    <button
      type="button"
      id={node.id}
      className={`${baseClass}${isFuture ? ' italic text-emerald-900/60' : ''}`}
      style={{ ...surfaceStyle, ...textStyle }}
      onClick={isFuture ? undefined : () => onClick?.(node.id)}
      disabled={isFuture}
    >
      {node.label}
    </button>
  );
}

function InfoPanel({ node }) {
  const makeItemContent = (item) => {
    if (typeof item === 'string') {
      return <span>{item}</span>;
    }

    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-emerald-700 transition hover:text-emerald-900"
      >
        {item.label}
      </a>
    );
  };

  return (
    <div
      id={node.id}
      className="w-full max-w-[22rem] rounded-2xl border border-emerald-900/15 bg-white/90 p-6 shadow-[0_12px_26px_rgba(10,30,20,0.12)]"
      style={{
        ...NODE_SURFACE_STYLE,
        ...(node.surfaceStyle ?? {}),
        fontFamily: INTERACTIVE_TEXT_STYLE.fontFamily,
        color: '#123827'
      }}
    >
      {node.title && (
        <p className="text-lg font-semibold" style={{ letterSpacing: '-0.3px' }}>
          {node.title}
        </p>
      )}
      <ul className="mt-4 space-y-2 text-sm leading-5">
        {node.items.map((item) => (
          <li key={typeof item === 'string' ? item : item.label} className="flex items-start gap-2">
            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-700" />
            {makeItemContent(item)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RoadmapDiagram() {
  const [selectedDetail, setSelectedDetail] = useState(null);

  const edges = useMemo(() => {
    const topicEdges = leftTopics
      .filter((topic) => topic.module)
      .map((topic) => ({
        id: `edge-left-${topic.module}-${topic.id}`,
        source: topic.module,
        target: topic.id,
        startAnchor: 'left',
        endAnchor: 'right'
      }));

    const detailEdges = rightTopics
      .filter((topic) => topic.source)
      .map((topic) => ({
        id: `edge-right-${topic.source}-${topic.id}`,
        source: topic.source,
        target: topic.id,
        startAnchor: 'right',
        endAnchor: 'left'
      }));

    const programmingTopicEdges = programmingLeftTopics.map((topic) => ({
      id: `edge-left-${topic.module}-${topic.id}`,
      source: topic.module,
      target: topic.id,
      startAnchor: 'left',
      endAnchor: 'right'
    }));

    const programmingRightEdges = programmingRightNodes
      .filter((node) => node.source)
      .map((node) => ({
        id: `edge-right-${node.source}-${node.id}`,
        source: node.source,
        target: node.id,
        startAnchor: 'right',
        endAnchor: 'left'
      }));

    return [
      ...connectorEdges,
      ...topicEdges,
      ...detailEdges,
      ...programmingConnectorEdges,
      ...programmingTopicEdges,
      ...programmingRightEdges
    ];
  }, []);

  const handleNodeClick = useCallback((nodeId) => {
    const detail = NODE_DETAILS[nodeId];
    if (detail) {
      setSelectedDetail(detail);
    }
  }, []);

  const closeModal = useCallback(() => {
    setSelectedDetail(null);
  }, []);

  return (
    <div
      className="relative w-full overflow-visible pt-10 md:pt-14"
      style={{
        marginTop: 'clamp(80px, 10vw, 300px)',
        width: '90%',
        maxWidth: 'none',
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingLeft: 'clamp(0.85rem, 2vw, 1.6rem)',
        paddingRight: 'clamp(0.85rem, 2vw, 1.6rem)',
        paddingBottom: 'clamp(0.85rem, 2vw, 1.6rem)'
      }}
    >
      <Xwrapper>
        <div className="relative w-full overflow-visible pb-1 pt-20">
          <div className="flex flex-col gap-24">
            <div className="rounded-[26px] bg-[#D9D9D9] p-10">
              <div className="grid grid-cols-3 gap-x-20">
                <div className="flex flex-col items-start gap-6">
                  {leftTopics.map((topic) => {
                    const offsets = LEFT_TOPIC_OFFSETS[topic.module];
                    const marginTop = offsets
                      ? topic.id === FIRST_LEFT_TOPIC_BY_MODULE[topic.module]
                        ? offsets.first
                        : offsets.rest
                      : undefined;

                    return (
                      <div
                        key={topic.id}
                        className="w-full max-w-[16rem]"
                        style={marginTop ? { marginTop } : undefined}
                      >
                        <NodeCard node={topic} variant="interactive" onClick={handleNodeClick} />
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col items-center gap-24">
                  {modules.map((module) => (
                    <div
                      key={module.id}
                      className="w-full max-w-[18rem]"
                      style={module.id === 'risk-planning' ? { marginTop: '3rem' } : undefined}
                    >
                      <NodeCard node={module} variant="module" />
                    </div>
                  ))}
                </div>

                <div className="flex flex-col items-end gap-6">
                  {rightTopics.map((topic) => (
                    <div
                      key={topic.id}
                      className="w-full max-w-[16rem]"
                      style={topic.startSpacing ? { marginTop: '2.5rem' } : undefined}
                    >
                      <DetailNode node={topic} onClick={handleNodeClick} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[26px] bg-[#D9D9D9] p-10">
              <div className="flex flex-col gap-8">
                <h3
                  className="text-left text-2xl font-semibold text-emerald-950"
                  style={{ fontFamily: MODULE_TEXT_STYLE.fontFamily, letterSpacing: '-0.4px' }}
                >
                  Final Module: Programming Your Trades
                </h3>

                <div className="grid grid-cols-3 gap-x-20">
                  <div className="flex flex-col items-start gap-5">
                    {programmingLeftTopics.map((topic) => {
                      const offsets = LEFT_TOPIC_OFFSETS[topic.module];
                      const marginTop = offsets
                        ? topic.id === FIRST_LEFT_TOPIC_BY_MODULE[topic.module]
                          ? offsets.first
                          : offsets.rest
                        : undefined;

                      return (
                        <div
                          key={topic.id}
                          className="w-full max-w-[18rem]"
                          style={marginTop ? { marginTop } : undefined}
                        >
                          <NodeCard node={topic} variant="interactive" onClick={handleNodeClick} />
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-col items-center gap-20">
                    {programmingModules.map((module) => (
                      <div
                        key={module.id}
                        className="w-full max-w-[18rem]"
                        style={module.id === 'programming-technical-implementation' ? { marginTop: '3rem' } : undefined}
                      >
                        <NodeCard
                          node={module}
                          variant="module"
                          onClick={NODE_DETAILS[module.id] ? handleNodeClick : undefined}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col items-end gap-6">
                    {programmingRightNodes.map((node) => (
                      <div
                        key={node.id}
                        className="w-full max-w-[22rem]"
                        style={node.startSpacing ? { marginTop: '2.5rem' } : undefined}
                      >
                        {node.type === 'panel' ? (
                          <InfoPanel node={node} />
                        ) : (
                          <NodeCard node={node} variant="module" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {edges.map((edge) => (
            <Xarrow
              key={edge.id}
              start={edge.source}
              end={edge.target}
              path="smooth"
              curveness={0.3}
              strokeWidth={2.4}
              headSize={6}
              color="#0a7a4b"
              startAnchor={edge.startAnchor}
              endAnchor={edge.endAnchor}
              animateDrawing
            />
          ))}
        </div>
      </Xwrapper>

      {selectedDetail && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedDetail.title} resources`}
          onClick={closeModal}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-8"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="relative w-full max-w-2xl rounded-3xl border border-emerald-900/15 bg-white p-10 shadow-[0_40px_80px_rgba(8,26,18,0.35)] max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-6">
              <h3 className="text-3xl font-semibold text-emerald-950" style={MODULE_TEXT_STYLE}>
                {selectedDetail.title}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full bg-emerald-900/10 px-4 py-1 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-900/20 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                Close
              </button>
            </div>
            <p className="mt-5 text-lg leading-7 text-emerald-900/90" style={{ fontFamily: INTERACTIVE_TEXT_STYLE.fontFamily }}>
              {selectedDetail.description}
            </p>
            <div className="mt-8">
              <p className="text-base font-semibold uppercase tracking-[0.14em] text-emerald-900/80">
                Suggested resources
              </p>
              <ul className="mt-4 grid gap-4">
                {selectedDetail.resources.map((resource) => {
                  const key = resource.href ?? resource.label;
                  const LabelTag = resource.href ? 'a' : 'span';
                  const labelProps = resource.href
                    ? {
                        href: resource.href,
                        target: '_blank',
                        rel: 'noopener noreferrer',
                        className: 'text-sm font-semibold tracking-wide text-emerald-700 transition hover:text-emerald-900'
                      }
                    : {
                        className: 'text-sm font-semibold tracking-wide text-emerald-900'
                      };

                  return (
                    <li key={key} className="flex gap-3">
                      <span className="mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-emerald-600" />
                      <div className="space-y-2">
                        <LabelTag style={{ fontFamily: INTERACTIVE_TEXT_STYLE.fontFamily }} {...labelProps}>
                          {resource.label}
                        </LabelTag>
                        {resource.description && (
                          <p className="text-sm leading-6 text-emerald-900/80" style={{ fontFamily: INTERACTIVE_TEXT_STYLE.fontFamily }}>
                            {resource.description}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
