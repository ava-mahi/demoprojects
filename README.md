# Nova Trade

A premium, real-time multi-asset trading platform built with **Next.js 15**, **Prisma**, **Supabase Postgres**, **Socket.io**, and **TradingView Lightweight Charts**. Supports **binary options** and **spot** trading on 20+ markets across crypto, forex, stocks, and commodities, with a complete admin panel.

> Built as an MVP per the project plan: full feature surface end-to-end with mocked payment/email integrations. Real money flows are admin-approved manually.

---

## Highlights

- **Live markets** — Binance WebSocket for crypto, deterministic GBM simulator for FX / stocks / commodities
- **Trading modes** — Binary UP/DOWN with payouts, or spot long/short with live P/L
- **Two accounts** — DEMO + LIVE with one-click switching, separate balances
- **Real-time everywhere** — Socket.io for ticks, candles, balances, trade outcomes, notifications
- **Premium UI** — Dark glassmorphism, Framer Motion, TradingView Lightweight Charts, mobile-first, **RAF-throttled 60fps charts**
- **Custom JWT auth** — httpOnly cookies, refresh + revocation, role-based middleware
- **Admin panel** — Users, deposits, withdrawals, methods, currencies, settings, win-rate overrides, force outcomes, **broadcast composer**, **risk dashboard**, **audit logs**
- **Multi-currency display** — USD, EUR, GBP, PKR, INR, PHP, BDT (rate table editable in admin)
- **Advanced user features** — Watchlist, price alerts, risk controls (daily loss limit, max stake, cooldown), trade journal notes

> 📘 **See [FEATURES.md](./FEATURES.md) for the complete list of advanced features and API docs.**

---

## Tech stack

- Next.js 15 (App Router, custom Node server) + React 19 + TypeScript
- Tailwind CSS + Framer Motion + Lucide
- Prisma ORM + PostgreSQL (Supabase)
- Socket.io (server + client)
- Lightweight Charts
- Zustand for state
- Zod for validation, bcryptjs for hashing, jsonwebtoken for JWT

---

## Project structure

```
app/
  (auth)/           login, register, forgot
  (app)/            dashboard, trade, wallet, history, profile
  (admin)/admin/    overview, users, deposits, withdrawals, methods, currencies, settings
  api/              REST endpoints (auth, trades, wallet, admin, market)
components/
  shell/            topbar, sidenav, notifications
  trading/          chart, asset list, trade panel, open trades/positions
  wallet/           deposit & withdrawal modals
  admin/            admin nav/topbar
  providers/        socket + auth bootstrap
hooks/, lib/, utils/, types/, store/
prisma/             schema + seed
server/             custom Next server, Socket.io, market engine, trade resolver
middleware.ts       route guards
```

---

## Setup

### 1. Prerequisites
- Node.js 20+
- A Supabase project (free tier is fine) — for Postgres
- pnpm or npm

### 2. Clone & install
```bash
git clone <repo>
cd nova-trade
npm install
```

### 3. Environment
Copy `.env.example` to `.env` and fill in your values:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?schema=public"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?schema=public"

JWT_ACCESS_SECRET="any-32+char-random-string"
JWT_REFRESH_SECRET="another-32+char-random-string"

PORT=3000
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"

SEED_ADMIN_EMAIL="admin@nova.trade"
SEED_ADMIN_PASSWORD="Admin@12345"
```

In Supabase: copy the **Connection string** (URI mode) from *Settings → Database*. Use the pooled connection for `DATABASE_URL` and the direct one for `DIRECT_URL` if you have a pooler; otherwise use the same URL for both.

### 4. Database
```bash
npx prisma generate
npx prisma db push     # creates all tables
npm run seed           # seeds assets, currencies, methods, admin + demo user
```

### 5. Run
```bash
npm run dev            # boots Next + Socket.io on the same port (3000)
```

Open <http://localhost:3000>.

**Demo logins** (after seeding):

| Role  | Email              | Password    |
|-------|--------------------|-------------|
| Admin | `admin@nova.trade` | `Admin@12345` |
| User  | `demo@nova.trade`  | `Demo@12345`  |

---

## How it works

### Market engine (`server/market/`)
- `BinanceFeed` connects to `wss://stream.binance.com/stream` and subscribes to `@trade` channels for crypto symbols. Auto-reconnects.
- `SimFeed` runs a 500 ms-tick GBM simulator for non-crypto symbols.
- `MarketEngine` aggregates ticks into 1m/5m/15m candles in memory, broadcasts to Socket.io rooms (`sym:<symbol>`) and flushes closed bars to Postgres every 30 s.

### Trade resolver (`server/trading/resolver.ts`)
- Polls every 500 ms for `OPEN` binary trades whose `expiresAt` has passed.
- For each, computes natural outcome from `closePrice` vs `openPrice`, then consults `UserTradingControl`:
  - If `forceNext` ≠ `NONE` and `forceCount` > 0, applies the forced outcome and decrements the counter.
  - Else, samples a Bernoulli with the configured `winRatePct` (when control is enabled).
- Credits payout, writes a `TRADE_PAYOUT` transaction, emits `trade:result` and `balance` events to the user's room.

### Spot positions
- Open: deducts `notional` from account, records position.
- Close: P/L = (close − open) × qty × side, credits back margin + P/L.

### Deposits / withdrawals
- Deposits create a PENDING request; admin approves to credit the LIVE account.
- Withdrawals immediately debit (funds on hold); rejection refunds, approval is final.

### Admin trading control
Go to **Admin → Users → Manage**. Toggle override, set a win-rate slider, or queue forced wins/losses for the next N trades. Effect is immediate and silent to the user (close price is nudged ε so the chart remains consistent).

---

## API surface

Public:
- `GET /api/assets`, `GET /api/market/history?symbol=&tf=&n=`
- `GET /api/currencies`

Auth:
- `POST /api/auth/register | login | logout`, `GET /api/auth/me`

User:
- `GET /api/wallet`, `GET /api/wallet/methods`, `POST /api/wallet/deposit | withdraw`
- `POST /api/trades`, `GET /api/trades?mode=&status=`
- `POST /api/positions`, `GET /api/positions`, `POST /api/positions/[id]/close`
- `GET /api/notifications`, `POST /api/notifications` (mark read)
- `GET /api/profile`, `PATCH /api/profile`, `POST /api/profile` (change pw)

Admin (`role=ADMIN` required):
- `GET /api/admin/stats`
- `GET /api/admin/users`, `GET|PATCH /api/admin/users/[id]`
- `GET|POST /api/admin/deposits`, `GET|POST /api/admin/withdrawals`
- `GET|POST|DELETE /api/admin/methods`
- `GET|POST /api/admin/currencies`
- `GET|POST /api/admin/settings`

Socket.io events:
- Client → server: `subscribe:symbol`, `unsubscribe:symbol`
- Server → client: `tick`, `candle`, `balance`, `event` (`trade:result`)

---

## Deployment

Because this app uses a **persistent WebSocket server**, it does **not** run on Vercel's serverless functions as-is. Two options:

### Option A — single host (recommended)
Deploy the whole app (Next + Socket.io) to a single Node host:
- [Railway](https://railway.app), [Render](https://render.com), [Fly.io](https://fly.io), or a VPS.
- Build: `npm run build`
- Start: `npm run start` (runs `server/index.ts` via tsx)
- Set all env vars from `.env.example`.

### Option B — split deployment
- Deploy the Next app to Vercel (HTTP-only routes will work).
- Deploy `server/index.ts` separately for the WebSocket + market engine + trade resolver.
- Point `NEXT_PUBLIC_SOCKET_URL` at that host.
- Both must share the same `DATABASE_URL` so admin actions in one show up live in the other.

Either way: run `npx prisma db push` and `npm run seed` once against your production database.

---

## Roadmap (not in v1)

- Real payment gateways (Stripe, NowPayments)
- SMTP-backed email verification & password reset
- 2FA (TOTP)
- Referral system + advanced bonus campaigns
- KYC document upload & review
- Redis-backed Socket.io adapter for multi-node scale

---

## Disclaimer

This is a **demo / educational** project. It does **not** handle real money, and binary options are heavily regulated and prohibited in many jurisdictions. Do not deploy as a real trading service.
