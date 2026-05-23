# Nova Trade — Advanced Features

## Performance Optimizations

### Chart Smoothness
- **RAF-throttled rendering**: Tick updates coalesced into animation frames (60fps max)
- **Intra-bar aggregation**: Live ticks update the current 1m/5m/15m candle bucket instead of appending infinite points
- **Batch price updates**: Asset list receives batched price updates per frame to avoid React thrashing
- **Result**: Silky smooth charts even with 50+ ticks/sec from Binance WebSocket

---

## User Features

### 1. Watchlist
- **Star/unstar assets** from the asset list or chart header
- Persisted per user in `WatchlistItem` table
- API: `GET/POST/DELETE /api/me/watchlist`
- Auto-loaded on app mount and synced to Zustand store

### 2. Price Alerts
- **Create alerts** from chart: "Notify me when BTC/USD ≥ $50,000"
- Direction: `ABOVE` or `BELOW`
- Engine checks every 5 seconds (throttled to avoid DB pool exhaustion)
- When triggered:
  - Alert marked `fired: true`
  - Notification created
  - Socket event `alert:fired` pushed to user
  - Toast appears in UI
- API: `GET/POST/DELETE /api/me/alerts`

### 3. Risk Controls (Self-Imposed Limits)
- **Daily loss limit**: Stop trading after losing X USD today
- **Max stake**: Cap individual trade size
- **Cooldown**: Enforce N seconds between trades
- Enforced at trade placement in `/api/trades` route
- `lastTradeAt` updated after each trade
- API: `GET/POST /api/me/risk`

### 4. Trade Notes / Journal
- Attach a personal note to any trade (e.g., "Breakout play on 15m resistance")
- Stored in `TradeNote` table with 1:1 relation to `Trade`
- API: `GET/POST /api/trades/[id]/note`
- Useful for reviewing strategy performance

### 5. Keyboard Hotkeys (Planned UI)
- **B**: Buy (UP)
- **S**: Sell (DOWN)
- **T**: Toggle direction
- **+/-**: Increase/decrease stake
- **1/5/10/25/50/100**: Quick stake presets
- Implementation: `useEffect` with `keydown` listener in `TradePanel`

### 6. Theme Toggle (Planned)
- Dark / Midnight / Light modes
- Persisted in `User.theme` column
- CSS variables updated via `data-theme` attribute on `<html>`

---

## Admin Features

### 7. Live Activity Feed (Planned)
- Real-time stream of:
  - New signups
  - Trades placed
  - Deposits/withdrawals requested
- Pushed via socket to `admin:activity` room
- Displayed in admin dashboard sidebar

### 8. Audit Log Viewer
- Paginated list of all admin actions
- Includes actor email, action type, target ID, metadata JSON
- API: `GET /api/admin/logs?page=1`
- Page: `/admin/logs`

### 9. Broadcast Composer
- Send push notifications to:
  - **All users**
  - **Segment**: `DEMO`, `LIVE`, or `ADMIN`
- Stored in `Broadcast` table
- Delivered via socket `event` with `type: 'broadcast'`
- Toast appears for all online users in segment
- API: `POST /api/admin/broadcast`
- Page: `/admin/broadcast`

### 10. Symbol Manager
- Add/edit/enable assets
- Tune per-asset parameters:
  - **Payout %**: Binary options payout (default 85%)
  - **Volatility**: GBM sigma for simulated feed
  - **Drift**: Simulated price drift per tick
  - **Precision**: Decimal places for display
- API: `GET/POST/PATCH /api/admin/assets`
- Page: `/admin/assets`

### 11. Risk Dashboard
- **Total exposure**: Sum of all open binary stakes
- **Max payout liability**: Worst-case payout if all trades win
- **Hot symbols**: Top 10 assets by open interest
- **Open trades count**
- API: `GET /api/admin/risk`
- Page: `/admin/risk`

---

## Database Schema Additions

```prisma
model WatchlistItem {
  id        String   @id @default(cuid())
  userId    String
  assetId   String
  createdAt DateTime @default(now())
  user  User  @relation(...)
  asset Asset @relation(...)
  @@unique([userId, assetId])
}

model PriceAlert {
  id        String         @id @default(cuid())
  userId    String
  assetId   String
  direction AlertDirection // ABOVE | BELOW
  price     Float
  fired     Boolean        @default(false)
  firedAt   DateTime?
  createdAt DateTime       @default(now())
  ...
}

model RiskControl {
  id              String   @id @default(cuid())
  userId          String   @unique
  dailyLossLimit  Decimal?
  maxStake        Decimal?
  cooldownSec     Int?
  lastTradeAt     DateTime?
  ...
}

model TradeNote {
  id        String   @id @default(cuid())
  tradeId   String   @unique
  userId    String
  note      String
  ...
}

model Broadcast {
  id        String   @id @default(cuid())
  title     String
  body      String
  segment   String?  // null=all, "DEMO", "LIVE", "ADMIN"
  sentAt    DateTime @default(now())
}

// Asset extended with:
drift     Float     @default(0)  // simulated drift

// User extended with:
theme     String   @default("dark")
```

---

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/me/watchlist` | GET/POST/DELETE | Manage watchlist |
| `/api/me/alerts` | GET/POST/DELETE | Manage price alerts |
| `/api/me/risk` | GET/POST | Get/update risk controls |
| `/api/trades/[id]/note` | GET/POST | Trade journal notes |
| `/api/admin/broadcast` | GET/POST | Send/list broadcasts |
| `/api/admin/assets` | GET/POST/PATCH | Manage assets |
| `/api/admin/logs` | GET | Audit log viewer |
| `/api/admin/risk` | GET | Risk dashboard stats |

---

## Internal Bridge Extensions

### `lib/bridge.ts`
```ts
export async function notifyBroadcast(title: string, body: string, segment?: string)
```

### `server/standalone.ts`
- `/internal/broadcast` endpoint: pushes to socket rooms by segment

---

## Socket Events

| Event | Payload | Description |
|-------|---------|-------------|
| `alert:fired` | `{ symbol, direction, price }` | Price alert triggered |
| `broadcast` | `{ title, body }` | Admin broadcast |

---

## Next Steps (Phase 2)

- **2FA**: TOTP via `speakeasy` + QR code
- **KYC**: Document upload + admin approval workflow
- **Referral system**: Unique codes, tiered rewards
- **Achievements/badges**: Gamification (e.g., "100 winning trades")
- **Social trading**: Copy trades from top performers
- **Advanced charting**: Drawing tools, indicators (RSI, MACD)
- **Mobile app**: React Native or Flutter
- **Real payment gateways**: Stripe, PayPal, crypto on-chain
- **Email notifications**: SMTP integration for trade results, deposits
- **Multi-language**: i18n with `next-intl`

---

**Built with care. Trade responsibly. 🚀**
