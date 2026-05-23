import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { MarketEngine, setEngine } from './market/engine';
import { TradeResolver } from './trading/resolver';
import { createSocket, setHub } from './socket';

const port = parseInt(process.env.SOCKET_PORT || '3001', 10);
const SECRET = process.env.INTERNAL_API_SECRET || 'nova-internal-shared-secret-change-me';

function readJson(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

function json(res: ServerResponse, status: number, payload: any) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

async function main() {
  let engine: MarketEngine;
  let hub: ReturnType<typeof createSocket>;

  const httpServer = createServer(async (req, res) => {
    // CORS for browser sockets (handled by socket.io itself), but allow simple HTTP from same origin
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    const url = new URL(req.url || '/', 'http://internal');
    try {
      if (url.pathname === '/health') return json(res, 200, { ok: true });

      // Internal API — require shared secret
      if (url.pathname.startsWith('/internal/')) {
        if (req.headers['x-internal'] !== SECRET) return json(res, 401, { error: 'unauthorized' });
        if (url.pathname === '/internal/price') {
          const symbol = url.searchParams.get('symbol') || '';
          return json(res, 200, { price: engine?.current(symbol) ?? null });
        }
        if (url.pathname === '/internal/notify' && req.method === 'POST') {
          const body = await readJson(req);
          hub?.notifyUser(body.userId, body.event || 'event', body.payload);
          return json(res, 200, { ok: true });
        }
        if (url.pathname === '/internal/balance' && req.method === 'POST') {
          const body = await readJson(req);
          hub?.io.to(`user:${body.userId}`).emit('balance', { accountId: body.accountId, balance: body.balance });
          return json(res, 200, { ok: true });
        }
        if (url.pathname === '/internal/broadcast' && req.method === 'POST') {
          const body = await readJson(req);
          const payload = { type: 'broadcast', title: body.title, body: body.body };
          if (!body.segment) hub?.io.emit('event', payload);
          else hub?.io.to(`segment:${body.segment}`).emit('event', payload);
          return json(res, 200, { ok: true });
        }
        return json(res, 404, { error: 'not found' });
      }
      return json(res, 404, { error: 'not found' });
    } catch (e: any) {
      return json(res, 500, { error: e.message || 'internal' });
    }
  });

  engine = new MarketEngine();
  await engine.init();
  setEngine(engine);

  const resolver = new TradeResolver(engine);
  resolver.start();

  hub = createSocket(httpServer, engine, resolver);
  setHub(hub);

  httpServer.listen(port, () => {
    console.log(`\n  Nova Trade socket+engine on http://localhost:${port}\n`);
  });

  const shutdown = () => {
    console.log('Shutting down...');
    resolver.stop();
    engine.stop();
    httpServer.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
