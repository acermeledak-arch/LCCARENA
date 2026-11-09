// Shared client utilities: escaping, RTT clock calibration, API & SSE stream with auto-resync.

const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function esc(val) {
  return String(val ?? '').replace(/[&<>"']/g, (ch) => ESC_MAP[ch]);
}

export function formatDateTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function modeLabel(mode) {
  if (mode === 'FULL') return 'Full Competition';
  if (mode === 'CATEGORY') return 'Category Challenge';
  if (mode === 'QUICK') return 'Quick Match';
  return mode;
}

// --- Monotonic Clock Calibration (immune to client wall-clock drift / NTP jumps) ---
let clockOffsetMs = 0;
let bestRttMs = Infinity;

function monoWallNow() {
  return performance.timeOrigin + performance.now();
}

export function ingestServerTime(serverNow, rttMs = null) {
  if (typeof serverNow !== 'number') return;
  if (typeof rttMs === 'number' && rttMs >= 0) {
    const midClient = monoWallNow() - rttMs / 2;
    const sampleOffset = serverNow - midClient;
    if (rttMs <= bestRttMs * 1.4 || bestRttMs === Infinity) {
      clockOffsetMs = sampleOffset;
      bestRttMs = Math.min(bestRttMs, rttMs);
    }
  } else if (bestRttMs === Infinity) {
    clockOffsetMs = serverNow - monoWallNow();
  }
}

export async function calibrateClock() {
  try {
    const t0 = performance.now();
    const res = await fetch('/api/time', { cache: 'no-store' });
    const t1 = performance.now();
    if (res.ok) {
      const data = await res.json();
      ingestServerTime(data.serverNow, t1 - t0);
    }
  } catch {
    // Ignore when offline; SSE reconnect will resync
  }
}

export function estimatedServerNow() {
  return monoWallNow() + clockOffsetMs;
}

export function computeRemainingMs(snapshot) {
  const q = snapshot?.currentQuestion;
  if (!q) return 0;
  if (snapshot.match.status === 'RUNNING' && typeof q.deadlineAt === 'number') {
    return Math.max(0, q.deadlineAt - estimatedServerNow());
  }
  return Math.max(0, Number(q.remainingMs ?? 0));
}

export function formatSeconds(ms) {
  const clamped = Math.max(0, ms);
  return (clamped / 1000).toFixed(1);
}

// --- Token Storage (Session + Local fallback, scrubbed from URL bar) ---
export function saveRoomToken(roomCode, token) {
  if (!roomCode || !token) return;
  const key = `lcc_ctrl_${roomCode.toUpperCase()}`;
  const clean = token.trim().toUpperCase();
  try { sessionStorage.setItem(key, clean); } catch { /* ignore */ }
  try { localStorage.setItem(key, clean); } catch { /* ignore */ }
}

export function loadRoomToken(roomCode) {
  const key = `lcc_ctrl_${roomCode.toUpperCase()}`;
  try {
    return sessionStorage.getItem(key) || localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

export function extractHashToken(roomCode) {
  const hash = window.location.hash || '';
  const m = hash.match(/(?:^|[#&])t=([^&]+)/i);
  if (m) {
    const token = decodeURIComponent(m[1]).trim().toUpperCase();
    saveRoomToken(roomCode, token);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    return token;
  }
  return loadRoomToken(roomCode);
}

// --- API Wrapper (Hybrid: Convex Cloud when configured, Local Server fallback) ---
let convexInstance = null;

export async function getConvexClient() {
  if (convexInstance) return convexInstance;
  let url = (typeof window !== 'undefined' && window.__CONVEX_URL__) || '';
  if (!url) {
    try {
      const cfg = await import('./convex-config.js').catch(() => ({}));
      url = cfg.CONVEX_URL || '';
    } catch { /* ignore */ }
  }
  if (!url) {
    try {
      url = localStorage.getItem('lcc_convex_url') || '';
    } catch { /* ignore */ }
  }
  if (url && typeof url === 'string' && url.startsWith('http')) {
    try {
      const { ConvexClient } = await import('./convex-client.js');
      convexInstance = new ConvexClient(url);
      return convexInstance;
    } catch {
      return null;
    }
  }
  return null;
}

export async function apiFetch(url, { method = 'GET', body, token } = {}) {
  if (url === '/api/server-info' && method === 'GET') {
    return {
      port: window.location.port ? Number(window.location.port) : (window.location.protocol === 'https:' ? 443 : 80),
      lanOrigins: [window.location.origin],
      serverNow: Date.now(),
    };
  }
  if (url === '/api/time' && method === 'GET') {
    return { serverNow: Date.now() };
  }

  const convex = await getConvexClient();

  if (convex) {
    // 1. Bank Summary
    if (url === '/api/bank' && method === 'GET') {
      await convex.mutation('matches:ensureSeed', {}); // adds new seed packs to an already-seeded DB
      return await convex.query('matches:getBankSummary', {});
    }

    // 2. Create Match
    if (url === '/api/matches' && method === 'POST') {
      return await convex.mutation('matches:createMatch', body);
    }

    // 3. Verify Token
    const verifyMatch = url.match(/^\/api\/matches\/([A-Za-z0-9-]+)\/verify$/);
    if (verifyMatch && method === 'POST') {
      const roomCode = verifyMatch[1];
      const tok = token || body?.token || '';
      await convex.mutation('matches:verifyToken', { roomCode, token: tok });
      const snap = await convex.query('matches:getSnapshot', { roomCode, role: 'controller' });
      return { valid: true, ...snap };
    }

    // 4. Dispatch Action
    const actionMatch = url.match(/^\/api\/matches\/([A-Za-z0-9-]+)\/action$/);
    if (actionMatch && method === 'POST') {
      const roomCode = actionMatch[1];
      const result = await convex.mutation('matches:dispatchAction', {
        roomCode,
        token: token || '',
        action: body,
      });
      const snap = await convex.query('matches:getSnapshot', { roomCode, role: 'controller' });
      return { ...result, ...snap };
    }

    // 5. Get Snapshot
    const getMatch = url.match(/^\/api\/matches\/([A-Za-z0-9-]+)$/);
    if (getMatch && method === 'GET') {
      const roomCode = getMatch[1];
      const role = token ? 'controller' : 'display';
      const snap = await convex.query('matches:getSnapshot', { roomCode, role });
      if (!snap) throw new Error('Ruang tidak ditemukan.');
      return snap;
    }

    // 6. History List
    if (url.startsWith('/api/history') && method === 'GET' && !url.includes('/api/history/')) {
      const parsed = new URL(url, 'http://localhost');
      const dateFilter = parsed.searchParams.get('date') || undefined;
      const items = await convex.query('matches:listHistory', { dateFilter });
      return { items };
    }

    // 7. History Detail & Delete
    const histDetailMatch = url.match(/^\/api\/history\/([A-Za-z0-9-]+)$/);
    if (histDetailMatch) {
      const matchId = histDetailMatch[1];
      if (method === 'GET') {
        return await convex.query('matches:getHistoryDetail', { matchId });
      }
      if (method === 'DELETE') {
        return await convex.mutation('matches:deleteHistory', { matchId });
      }
    }
  }

  // Local HTTP Fallback
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['X-Controller-Token'] = token;

  const t0 = performance.now();
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const t1 = performance.now();
  const data = await res.json().catch(() => ({}));

  if (typeof data?.serverNow === 'number') {
    ingestServerTime(data.serverNow, t1 - t0);
  }
  if (!res.ok) {
    const err = new Error(data?.error?.message || `Gagal memproses permintaan (${res.status})`);
    err.status = res.status;
    err.code = data?.error?.code || 'HTTP_ERROR';
    throw err;
  }
  return data;
}

export function makeActionId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// --- SSE / Convex Room Stream with Auto-Resync ---
export function connectRoomStream({ roomCode, role, token, onSnapshot, onConnectionChange }) {
  let closed = false;
  let es = null;
  let unsubscribeConvex = null;

  const openSse = () => {
    if (closed) return;
    const params = new URLSearchParams({ role });
    if (role === 'controller' && token) params.set('token', token);
    const url = `/api/matches/${encodeURIComponent(roomCode.toUpperCase())}/stream?${params.toString()}`;
    es = new EventSource(url);

    let hadOpen = false;
    es.onopen = async () => {
      onConnectionChange?.(true);
      if (hadOpen) {
        await calibrateClock();
        try {
          const fresh = await apiFetch(`/api/matches/${encodeURIComponent(roomCode)}`, {
            token: role === 'controller' ? token : undefined,
          });
          onSnapshot?.(fresh);
        } catch { /* ignore */ }
      }
      hadOpen = true;
    };

    es.addEventListener('snapshot', (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        ingestServerTime(payload.serverNow);
        onSnapshot?.(payload);
      } catch { /* ignore malformed frame */ }
    });

    es.addEventListener('ping', (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        ingestServerTime(payload.serverNow);
      } catch { /* ignore */ }
    });

    es.onerror = () => {
      onConnectionChange?.(false);
    };
  };

  getConvexClient().then((convex) => {
    if (closed) return;
    if (convex) {
      onConnectionChange?.(true);
      unsubscribeConvex = convex.onUpdate('matches:getSnapshot', { roomCode, role }, (snapshot) => {
        if (!snapshot) return;
        onSnapshot?.(snapshot);
      });
      return;
    }
    openSse();
  });

  const onOnline = () => calibrateClock();
  window.addEventListener('online', onOnline);

  return () => {
    closed = true;
    window.removeEventListener('online', onOnline);
    try { es?.close(); } catch { /* ignore */ }
    try { unsubscribeConvex?.(); } catch { /* ignore */ }
  };
}

// --- Toast & Modal Helpers ---
export function showToast(message, kind = 'info') {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => el.remove(), 3400);
}

export function openModal(html, onMount) {
  const root = document.getElementById('modal-root');
  if (!root) return;
  root.innerHTML = `<div class="modal-backdrop" id="modal-bg"><div class="modal-box" role="dialog" aria-modal="true">${html}</div></div>`;
  const bg = document.getElementById('modal-bg');
  bg?.addEventListener('click', (e) => {
    if (e.target === bg) closeModal();
  });
  onMount?.(root);
}

export function closeModal() {
  const root = document.getElementById('modal-root');
  if (root) root.innerHTML = '';
}

// --- SPA Router Helper ---
let routeHandler = null;
export function setRouteHandler(fn) {
  routeHandler = fn;
}

export function navigate(to, replace = false) {
  if (replace) window.history.replaceState(null, '', to);
  else window.history.pushState(null, '', to);
  routeHandler?.();
}
