import { PrismaClient, AssetKind, AccountMode, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ASSETS: Array<{
  symbol: string; name: string; kind: AssetKind; feed: 'binance' | 'sim';
  feedSym?: string; priceHint: number; volatility: number; precision: number; payoutPct?: number;
}> = [
  // Crypto (Binance live)
  { symbol: 'BTC/USDT', name: 'Bitcoin', kind: 'CRYPTO', feed: 'binance', feedSym: 'btcusdt', priceHint: 67000, volatility: 0.001, precision: 2, payoutPct: 87 },
  { symbol: 'ETH/USDT', name: 'Ethereum', kind: 'CRYPTO', feed: 'binance', feedSym: 'ethusdt', priceHint: 3500, volatility: 0.0012, precision: 2, payoutPct: 87 },
  { symbol: 'SOL/USDT', name: 'Solana', kind: 'CRYPTO', feed: 'binance', feedSym: 'solusdt', priceHint: 180, volatility: 0.0015, precision: 3, payoutPct: 86 },
  { symbol: 'XRP/USDT', name: 'XRP', kind: 'CRYPTO', feed: 'binance', feedSym: 'xrpusdt', priceHint: 0.6, volatility: 0.0015, precision: 4, payoutPct: 85 },
  { symbol: 'BNB/USDT', name: 'BNB', kind: 'CRYPTO', feed: 'binance', feedSym: 'bnbusdt', priceHint: 600, volatility: 0.001, precision: 2, payoutPct: 86 },
  // Forex (sim)
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', kind: 'FOREX', feed: 'sim', priceHint: 1.085, volatility: 0.0003, precision: 5, payoutPct: 82 },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', kind: 'FOREX', feed: 'sim', priceHint: 154.2, volatility: 0.0004, precision: 3, payoutPct: 82 },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', kind: 'FOREX', feed: 'sim', priceHint: 1.265, volatility: 0.0003, precision: 5, payoutPct: 82 },
  { symbol: 'USD/PKR', name: 'US Dollar / Pak Rupee', kind: 'FOREX', feed: 'sim', priceHint: 278.5, volatility: 0.0006, precision: 3, payoutPct: 84 },
  { symbol: 'USD/INR', name: 'US Dollar / Indian Rupee', kind: 'FOREX', feed: 'sim', priceHint: 84.3, volatility: 0.0005, precision: 3, payoutPct: 83 },
  // Stocks (sim)
  { symbol: 'AAPL', name: 'Apple Inc.', kind: 'STOCK', feed: 'sim', priceHint: 225, volatility: 0.0008, precision: 2, payoutPct: 80 },
  { symbol: 'TSLA', name: 'Tesla Inc.', kind: 'STOCK', feed: 'sim', priceHint: 280, volatility: 0.0015, precision: 2, payoutPct: 84 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', kind: 'STOCK', feed: 'sim', priceHint: 425, volatility: 0.0007, precision: 2, payoutPct: 80 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', kind: 'STOCK', feed: 'sim', priceHint: 175, volatility: 0.0008, precision: 2, payoutPct: 81 },
  { symbol: 'AMZN', name: 'Amazon.com', kind: 'STOCK', feed: 'sim', priceHint: 200, volatility: 0.0009, precision: 2, payoutPct: 81 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', kind: 'STOCK', feed: 'sim', priceHint: 145, volatility: 0.0014, precision: 2, payoutPct: 83 },
  { symbol: 'META', name: 'Meta Platforms', kind: 'STOCK', feed: 'sim', priceHint: 560, volatility: 0.001, precision: 2, payoutPct: 82 },
  { symbol: 'NFLX', name: 'Netflix Inc.', kind: 'STOCK', feed: 'sim', priceHint: 750, volatility: 0.0011, precision: 2, payoutPct: 82 },
  // Commodities (sim)
  { symbol: 'XAU/USD', name: 'Gold', kind: 'COMMODITY', feed: 'sim', priceHint: 2680, volatility: 0.0005, precision: 2, payoutPct: 83 },
  { symbol: 'XAG/USD', name: 'Silver', kind: 'COMMODITY', feed: 'sim', priceHint: 31.5, volatility: 0.0008, precision: 3, payoutPct: 83 },
  { symbol: 'WTI/USD', name: 'Crude Oil (WTI)', kind: 'COMMODITY', feed: 'sim', priceHint: 71.4, volatility: 0.0009, precision: 2, payoutPct: 82 },
];

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', rateToUsd: 1 },
  { code: 'EUR', name: 'Euro', symbol: '€', rateToUsd: 1.08 },
  { code: 'GBP', name: 'British Pound', symbol: '£', rateToUsd: 1.27 },
  { code: 'PKR', name: 'Pak Rupee', symbol: '₨', rateToUsd: 1 / 278.5 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', rateToUsd: 1 / 84.3 },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', rateToUsd: 1 / 58 },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', rateToUsd: 1 / 119 },
];

async function main() {
  console.log('Seeding currencies...');
  for (const c of CURRENCIES) {
    await prisma.currency.upsert({ where: { code: c.code }, update: c, create: c });
  }

  console.log('Seeding assets...');
  for (const a of ASSETS) {
    await prisma.asset.upsert({
      where: { symbol: a.symbol },
      update: { ...a, payoutPct: a.payoutPct ?? 85 },
      create: { ...a, payoutPct: a.payoutPct ?? 85 },
    });
  }

  console.log('Seeding payment methods...');
  const methods = [
    { name: 'Bitcoin', kind: 'crypto', network: 'BTC', address: 'bc1qexampleadminbtcaddressxxxxxxxxxxxxxx', minAmount: 20, maxAmount: 100000, instructions: 'Send BTC to this address. Submit txHash after sending.' },
    { name: 'USDT', kind: 'crypto', network: 'TRC20', address: 'TExampleAdminUsdtTrc20AddressXXXXXXXXX', minAmount: 10, maxAmount: 100000, instructions: 'Send USDT (TRC20). Network fees apply.' },
    { name: 'USDT', kind: 'crypto', network: 'ERC20', address: '0xExampleAdminUsdtErc20AddressXXXXXXXXX', minAmount: 50, maxAmount: 100000, instructions: 'Send USDT (ERC20). Higher gas fees.' },
    { name: 'Card (Mock)', kind: 'card', minAmount: 10, maxAmount: 5000, instructions: 'Mock card processor — auto-pending for admin approval.' },
  ];
  for (const m of methods) {
    const existing = await prisma.paymentMethod.findFirst({ where: { name: m.name, network: m.network ?? null } });
    if (!existing) await prisma.paymentMethod.create({ data: m as any });
  }

  console.log('Seeding admin...');
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@nova.trade';
  const adminPass = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
  const adminHash = await bcrypt.hash(adminPass, 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.ADMIN, passwordHash: adminHash },
    create: { email: adminEmail, name: 'Admin', passwordHash: adminHash, role: Role.ADMIN, emailVerified: true },
  });
  await prisma.account.upsert({
    where: { userId_mode: { userId: admin.id, mode: AccountMode.DEMO } },
    update: {},
    create: { userId: admin.id, mode: AccountMode.DEMO, balance: 10000 },
  });
  await prisma.account.upsert({
    where: { userId_mode: { userId: admin.id, mode: AccountMode.LIVE } },
    update: {},
    create: { userId: admin.id, mode: AccountMode.LIVE, balance: 0 },
  });

  console.log('Seeding demo user...');
  const demoHash = await bcrypt.hash('Demo@12345', 10);
  const demo = await prisma.user.upsert({
    where: { email: 'demo@nova.trade' },
    update: { passwordHash: demoHash },
    create: { email: 'demo@nova.trade', name: 'Demo User', passwordHash: demoHash, emailVerified: true },
  });
  await prisma.account.upsert({
    where: { userId_mode: { userId: demo.id, mode: AccountMode.DEMO } },
    update: {},
    create: { userId: demo.id, mode: AccountMode.DEMO, balance: 10000 },
  });
  await prisma.account.upsert({
    where: { userId_mode: { userId: demo.id, mode: AccountMode.LIVE } },
    update: {},
    create: { userId: demo.id, mode: AccountMode.LIVE, balance: 250 },
  });

  console.log('Seeding settings...');
  await prisma.setting.upsert({
    where: { key: 'platform' },
    update: {},
    create: {
      key: 'platform',
      value: {
        defaultPayoutPct: 85,
        minStake: 1,
        maxStake: 10000,
        expiryOptions: [30, 60, 120, 300, 900],
        minWithdrawal: 20,
        withdrawalFeePct: 0,
        maintenance: false,
      },
    },
  });

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
