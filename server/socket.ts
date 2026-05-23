import { Server as IOServer, type Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { readAuthFromCookieHeader } from '../lib/auth';
import { prisma } from '../lib/prisma';
import type { MarketEngine } from './market/engine';
import type { TradeResolver } from './trading/resolver';

export function createSocket(httpServer: HttpServer, engine: MarketEngine, resolver: TradeResolver) {
  const io = new IOServer(httpServer, {
    cors: { origin: true, credentials: true },
    path: '/socket.io',
  });

  // Auth middleware (optional — public room for prices anyway)
  io.use((socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie;
    const payload = readAuthFromCookieHeader(cookieHeader);
    (socket.data as any).user = payload || null;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const u = (socket.data as any).user as { sub: string; role: string } | null;
    if (u) {
      socket.join(`user:${u.sub}`);
    }
    socket.join('ticks');

    socket.on('subscribe:symbol', (symbol: string) => {
      socket.join(`sym:${symbol}`);
      // send snapshot
      const ticks = engine.lastTick.get(symbol);
      if (ticks) socket.emit('tick', ticks);
    });
    socket.on('unsubscribe:symbol', (symbol: string) => {
      socket.leave(`sym:${symbol}`);
    });
  });

  // Broadcast ticks
  engine.onTick((t) => {
    io.to(`sym:${t.symbol}`).emit('tick', t);
  });
  // Broadcast candles
  engine.onCandle((c, closed) => {
    io.to(`sym:${c.symbol}`).emit('candle', { ...c, closed });
  });

  // Hook resolver notifications
  resolver.setNotifier((userId, payload) => {
    io.to(`user:${userId}`).emit('event', payload);
  });
  resolver.setBalanceEmitter((userId, accountId, balance) => {
    io.to(`user:${userId}`).emit('balance', { accountId, balance });
  });

  // Helper to emit notifications from elsewhere
  return {
    io,
    notifyUser(userId: string, event: string, payload: any) {
      io.to(`user:${userId}`).emit(event, payload);
    },
    notifyBalance: async (userId: string, accountId: string) => {
      const acct = await prisma.account.findUnique({ where: { id: accountId } });
      if (acct) io.to(`user:${userId}`).emit('balance', { accountId, balance: acct.balance.toString() });
    },
  };
}

export type SocketHub = ReturnType<typeof createSocket>;

let _hub: SocketHub | null = null;
export function setHub(h: SocketHub) {
  _hub = h;
}
export function getHub() {
  return _hub;
}
