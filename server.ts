import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LccEngine, AppError, type GameAction } from './src/engine.ts';
import { renderQrSvg } from './src/qr.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
};

interface SseClient {
  res: http.ServerResponse;
  role: 'display' | 'controller';
}

function discoverLanOrigins(port: number): string[] {
  const nets = os.networkInterfaces();
  const preferred: string[] = [];
  const fallback: string[] = [];
  for (const [name, list] of Object.entries(nets)) {
    if (!list) continue;
    const lower = name.toLowerCase();
    const isVirtual = /vethernet|wsl|hyper-v|docker|vmware|vbox|loopback/.test(lower);
    for (const addr of list) {
      if (addr.family === 'IPv4' && !addr.internal) {
        const origin = `http://${addr.address}:${port}`;
        if (!isVirtual && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(addr.address)) {
          preferred.push(origin);
        } else {
          fallback.push(origin);
        }
      }
    }
  }
  return [...preferred, ...fallback];
}

async function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > 64 * 1024) throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'Ukuran request melebihi batas 64KB.');
    chunks.push(buf);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new AppError(400, 'INVALID_JSON', 'Body JSON tidak valid.');
  }
}

function sendJson(res: http.ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

export function createAppServer(customEngine?: LccEngine) {
  const engine = customEngine ?? new LccEngine();
  const rooms = new Map<string, Set<SseClient>>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const authFailures = new Map<string, { count: number; resetAt: number }>();

  function checkAuthRateLimit(ip: string): void {
    const now = Date.now();
    const rec = authFailures.get(ip);
    if (rec && now < rec.resetAt && rec.count >= 15) {
      throw new AppError(429, 'TOO_MANY_ATTEMPTS', 'Terlalu banyak percobaan token gagal. Coba lagi dalam 1 menit.');
    }
  }

  function recordAuthFailure(ip: string): void {
    const now = Date.now();
    const rec = authFailures.get(ip);
    if (!rec || now >= rec.resetAt) {
      authFailures.set(ip, { count: 1, resetAt: now + 60_000 });
    } else {
      rec.count += 1;
    }
  }

  function getConnections(roomCode: string) {
    const set = rooms.get(roomCode.toUpperCase());
    let display = 0;
    let controller = 0;
    if (set) {
      for (const c of set) {
        if (c.role === 'display') display++;
        else controller++;
      }
    }
    return { display, controller };
  }

  function broadcastRoom(roomCode: string, eventType = 'SNAPSHOT'): void {
    const code = roomCode.toUpperCase();
    const clients = rooms.get(code);
    if (!clients || clients.size === 0) return;

    const now = Date.now();
    const connections = getConnections(code);
    let dispSnap: unknown = null;
    let ctrlSnap: unknown = null;

    for (const client of clients) {
      try {
        if (client.role === 'display') {
          dispSnap ??= { eventType, connections, ...engine.getSnapshot(code, 'display', now) };
          client.res.write(`event: snapshot\ndata: ${JSON.stringify(dispSnap)}\n\n`);
        } else {
          ctrlSnap ??= { eventType, connections, ...engine.getSnapshot(code, 'controller', now) };
          client.res.write(`event: snapshot\ndata: ${JSON.stringify(ctrlSnap)}\n\n`);
        }
      } catch {
        clients.delete(client);
      }
    }
  }

  function scheduleRoomDeadline(roomCode: string): void {
    const code = roomCode.toUpperCase();
    const existing = timers.get(code);
    if (existing) {
      clearTimeout(existing);
      timers.delete(code);
    }
    const deadlineAt = engine.getNextDeadline(code);
    if (deadlineAt === null) return;

    const delayMs = Math.max(0, deadlineAt - Date.now() + 8);
    const handle = setTimeout(() => {
      timers.delete(code);
      if (engine.reconcileTimeout(code, Date.now())) {
        broadcastRoom(code, 'QUESTION_TIMEOUT');
      } else {
        scheduleRoomDeadline(code);
      }
    }, delayMs);
    handle.unref?.();
    timers.set(code, handle);
  }

  // Re-arm timers for any running matches recovered from SQLite on server restart
  const runningRows = engine.db
    .prepare(`SELECT room_code FROM matches WHERE status = 'RUNNING'`)
    .all() as { room_code: string }[];
  for (const r of runningRows) scheduleRoomDeadline(r.room_code);

  const heartbeat = setInterval(() => {
    const now = Date.now();
    for (const [, clients] of rooms) {
      for (const client of clients) {
        try {
          client.res.write(`event: ping\ndata: {"serverNow":${now}}\n\n`);
        } catch {
          clients.delete(client);
        }
      }
    }
  }, 15_000);
  heartbeat.unref?.();

  const server = http.createServer(async (req, res) => {
    try {
      const method = req.method ?? 'GET';
      const parsedUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
      const pathname = decodeURIComponent(parsedUrl.pathname);
      const clientIp = req.socket.remoteAddress ?? 'unknown';

      // --- API Routes ---
      if (pathname === '/api/time' && method === 'GET') {
        return sendJson(res, 200, { serverNow: Date.now() });
      }

      if (pathname === '/api/server-info' && method === 'GET') {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : Number(process.env.PORT || 3000);
        return sendJson(res, 200, {
          port,
          lanOrigins: discoverLanOrigins(port),
          serverNow: Date.now(),
        });
      }

      if (pathname === '/api/bank' && method === 'GET') {
        return sendJson(res, 200, engine.getBankSummary());
      }

      if (pathname === '/api/qr' && method === 'GET') {
        const text = parsedUrl.searchParams.get('text') ?? '';
        if (!text || text.length > 134) {
          throw new AppError(400, 'INVALID_QR_TEXT', 'Teks QR harus antara 1–134 karakter.');
        }
        const svg = renderQrSvg(text);
        if (!svg) throw new AppError(400, 'QR_ENCODE_FAILED', 'Gagal membuat kode QR.');
        res.writeHead(200, {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        res.end(svg);
        return;
      }

      if (pathname === '/api/matches' && method === 'POST') {
        const body = await readJsonBody(req);
        const created = engine.createMatch(body as Parameters<LccEngine['createMatch']>[0]);
        return sendJson(res, 201, created);
      }

      const streamMatch = pathname.match(/^\/api\/matches\/([A-Za-z0-9-]+)\/stream$/);
      if (streamMatch && method === 'GET') {
        const code = streamMatch[1].toUpperCase();
        const role = parsedUrl.searchParams.get('role') === 'controller' ? 'controller' : 'display';
        if (role === 'controller') {
          checkAuthRateLimit(clientIp);
          const token = parsedUrl.searchParams.get('token') ?? '';
          if (!engine.verifyToken(code, token)) {
            recordAuthFailure(clientIp);
            throw new AppError(401, 'INVALID_CONTROLLER_TOKEN', 'Token controller tidak valid.');
          }
        }
        // Verify room exists before opening SSE stream
        const initialSnap = engine.getSnapshot(code, role);

        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        });

        let set = rooms.get(code);
        if (!set) {
          set = new Set();
          rooms.set(code, set);
        }
        const clientObj: SseClient = { res, role };
        set.add(clientObj);

        const connections = getConnections(code);
        res.write(`event: snapshot\ndata: ${JSON.stringify({ eventType: 'CONNECTED', connections, ...initialSnap })}\n\n`);
        // Notify sibling clients (e.g., Lobby connection counter!)
        for (const peer of set) {
          if (peer !== clientObj) {
            const peerSnap = engine.getSnapshot(code, peer.role);
            peer.res.write(
              `event: snapshot\ndata: ${JSON.stringify({ eventType: 'PRESENCE_UPDATED', connections, ...peerSnap })}\n\n`,
            );
          }
        }

        req.on('close', () => {
          set?.delete(clientObj);
          if (set && set.size === 0) rooms.delete(code);
          else broadcastRoom(code, 'PRESENCE_UPDATED');
        });
        return;
      }

      const verifyMatch = pathname.match(/^\/api\/matches\/([A-Za-z0-9-]+)\/verify$/);
      if (verifyMatch && method === 'POST') {
        checkAuthRateLimit(clientIp);
        const code = verifyMatch[1].toUpperCase();
        const body = (await readJsonBody(req)) as { token?: string };
        const headerToken = req.headers['x-controller-token'];
        const token = (typeof headerToken === 'string' ? headerToken : body?.token) ?? '';
        // Ensure room exists (404 before 401)
        engine.getSnapshot(code, 'display');
        if (!engine.verifyToken(code, token)) {
          recordAuthFailure(clientIp);
          throw new AppError(401, 'INVALID_CONTROLLER_TOKEN', 'Token controller tidak sesuai untuk ruang ini.');
        }
        return sendJson(res, 200, {
          valid: true,
          connections: getConnections(code),
          ...engine.getSnapshot(code, 'controller'),
        });
      }

      const actionMatch = pathname.match(/^\/api\/matches\/([A-Za-z0-9-]+)\/action$/);
      if (actionMatch && method === 'POST') {
        checkAuthRateLimit(clientIp);
        const code = actionMatch[1].toUpperCase();
        const rawHeader = req.headers['x-controller-token'];
        const token = typeof rawHeader === 'string' ? rawHeader : '';
        const body = (await readJsonBody(req)) as GameAction;
        try {
          const result = engine.dispatchAction(code, token, body);
          scheduleRoomDeadline(code);
          broadcastRoom(code, result.eventType);
          return sendJson(res, 200, {
            eventType: result.eventType,
            connections: getConnections(code),
            ...result.snapshotController,
          });
        } catch (err) {
          if (err instanceof AppError && err.statusCode === 401) recordAuthFailure(clientIp);
          throw err;
        }
      }

      const roomGetMatch = pathname.match(/^\/api\/matches\/([A-Za-z0-9-]+)$/);
      if (roomGetMatch && method === 'GET') {
        const code = roomGetMatch[1].toUpperCase();
        const rawHeader = req.headers['x-controller-token'];
        const token = typeof rawHeader === 'string' ? rawHeader.trim() : '';
        if (token) {
          checkAuthRateLimit(clientIp);
          if (!engine.verifyToken(code, token)) {
            recordAuthFailure(clientIp);
            throw new AppError(401, 'INVALID_CONTROLLER_TOKEN', 'Token controller tidak valid.');
          }
          return sendJson(res, 200, {
            connections: getConnections(code),
            ...engine.getSnapshot(code, 'controller'),
          });
        }
        return sendJson(res, 200, {
          connections: getConnections(code),
          ...engine.getSnapshot(code, 'display'),
        });
      }

      if (pathname === '/api/history' && method === 'GET') {
        const date = parsedUrl.searchParams.get('date') ?? undefined;
        return sendJson(res, 200, { items: engine.listHistory(date) });
      }

      const histItemMatch = pathname.match(/^\/api\/history\/([A-Za-z0-9-]+)$/);
      if (histItemMatch) {
        const id = histItemMatch[1];
        if (method === 'GET') return sendJson(res, 200, engine.getHistoryDetail(id));
        if (method === 'DELETE') return sendJson(res, 200, engine.deleteHistory(id));
      }

      if (pathname.startsWith('/api/')) {
        throw new AppError(404, 'API_NOT_FOUND', 'Endpoint API tidak ditemukan.');
      }

      // --- Static Assets & SPA Fallback ---
      const requestedRel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
      const candidatePath = path.resolve(PUBLIC_DIR, requestedRel);
      if (!candidatePath.startsWith(PUBLIC_DIR)) {
        throw new AppError(403, 'FORBIDDEN', 'Akses ditolak.');
      }

      let fileToServe = candidatePath;
      if (!fs.existsSync(fileToServe) || fs.statSync(fileToServe).isDirectory()) {
        fileToServe = path.join(PUBLIC_DIR, 'index.html');
      }

      if (!fs.existsSync(fileToServe)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Frontend belum tersedia.');
        return;
      }

      const ext = path.extname(fileToServe).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      });
      fs.createReadStream(fileToServe).pipe(res);
    } catch (err) {
      if (err instanceof AppError) {
        sendJson(res, err.statusCode, { error: { code: err.code, message: err.message } });
      } else {
        console.error('[SERVER ERROR]', err);
        sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan internal pada server.' } });
      }
    }
  });

  function shutdown(): Promise<void> {
    clearInterval(heartbeat);
    for (const [, t] of timers) clearTimeout(t);
    timers.clear();
    for (const [, set] of rooms) {
      for (const c of set) {
        try { c.res.end(); } catch { /* ignore */ }
      }
    }
    rooms.clear();
    return new Promise((resolve) => {
      server.close(() => {
        if (!customEngine) engine.close();
        resolve();
      });
    });
  }

  return { server, engine, shutdown };
}

// Run directly if invoked as main entry point
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';
  const { server, shutdown } = createAppServer();

  server.listen(port, host, () => {
    const lan = discoverLanOrigins(port);
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          LCC ARENA — Server Kelas Siap Digunakan           ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`  Lokal (IFP/Laptop) : http://localhost:${port}`);
    if (lan.length > 0) {
      for (const url of lan) {
        console.log(`  Jaringan Wi-Fi/HP  : ${url}`);
      }
    } else {
      console.log('  Jaringan Wi-Fi/HP  : (Hubungkan ke Wi-Fi/Hotspot yang sama)');
    }
    console.log('\n  Tekan Ctrl+C untuk menghentikan server.\n');
  });

  process.on('SIGINT', () => shutdown().then(() => process.exit(0)));
  process.on('SIGTERM', () => shutdown().then(() => process.exit(0)));
}
