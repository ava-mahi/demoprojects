import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type AssetData = {
  symbol: string;
  name: string;
  category: string;
};

// GET /api/market/prices - Get current prices for all assets
export async function GET() {
  try {
    const assets = await prisma.asset.findMany({
      where: { active: true },
      select: {
        symbol: true,
        name: true,
        category: true,
      },
    });

    // Generate mock prices (in production, this would come from a real data source)
    const prices = assets.map((asset: AssetData) => ({
      symbol: asset.symbol,
      name: asset.name,
      category: asset.category,
      price: generateMockPrice(asset.symbol),
      change24h: (Math.random() * 10 - 5).toFixed(2),
      timestamp: new Date().toISOString(),
    }));

    return NextResponse.json({ prices });
  } catch (error) {
    console.error('Error fetching prices:', error);
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}

// Simple mock price generator (replace with real data source)
function generateMockPrice(symbol: string): string {
  const basePrice: Record<string, number> = {
    BTCUSD: 45000,
    ETHUSD: 2500,
    EURUSD: 1.08,
    GBPUSD: 1.27,
    USDJPY: 150,
    XAUUSD: 2050,
  };

  const base = basePrice[symbol] || 100;
  const variation = base * 0.001 * (Math.random() - 0.5);
  return (base + variation).toFixed(symbol.includes('JPY') ? 2 : 4);
}
