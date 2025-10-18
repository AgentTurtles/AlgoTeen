import { NextResponse } from 'next/server';

function buildMockPrice(symbol) {
  const charCodeSum = symbol
    .toUpperCase()
    .split('')
    .reduce((total, char) => total + char.charCodeAt(0), 0);

  const base = 75 + (charCodeSum % 50);
  return Number((base + (charCodeSum % 7) * 0.45).toFixed(2));
}

export async function POST(request) {
  try {
    const body = await request.json();
    const action = body?.action || 'place';

    if (action === 'cancel') {
      const orderId = body?.orderId;
      if (!orderId) {
        return NextResponse.json({ error: 'An orderId is required to cancel an order.' }, { status: 400 });
      }

      return NextResponse.json({
        orderId,
        status: 'canceled',
        canceledAt: new Date().toISOString(),
        message: 'Order canceled inside the simulated paper desk.'
      });
    }

    const { symbol, side, quantity, strategyId, takeProfit } = body;

    if (!symbol || !side || !quantity) {
      return NextResponse.json(
        { error: 'Symbol, side, and quantity are required to route an order.' },
        { status: 400 }
      );
    }

    if (!['buy', 'sell'].includes(side)) {
      return NextResponse.json(
        { error: 'Side must be "buy" or "sell".' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be a positive number.' },
        { status: 400 }
      );
    }

    const submittedAt = new Date().toISOString();
    const price = buildMockPrice(symbol);

    const numericTakeProfit = takeProfit !== undefined && takeProfit !== null && takeProfit !== ''
      ? Number(takeProfit)
      : null;

    return NextResponse.json({
      orderId: `paper-${Date.now().toString(36)}`,
      status: 'filled',
      filledQuantity: quantity,
      averagePrice: price,
      submittedAt,
      symbol: symbol.toUpperCase(),
      side,
      strategyId: strategyId || null,
      takeProfit: numericTakeProfit,
      message: 'Order filled against simulated market depth.'
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload received.' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoints: {
      post: {
        description: 'Route a paper trade order into the simulated execution desk.',
        requiredFields: ['symbol', 'side', 'quantity'],
        optionalFields: ['strategyId']
      }
    }
  });
}
