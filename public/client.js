import { ConvexClient } from './convex-client.js';
import { CONVEX_URL } from './convex-config.js';

let routeHandler = null;
let convexInstance = null;

export function setRouteHandler(fn) {
  routeHandler = fn;
}

export function navigate(path, { replace = false } = {}) {
  if (replace) {
    window.history.replaceState(null, '', path);
  } else {
    window.history.pushState(null, '', path);
  }
  if (typeof routeHandler === 'function') {
    routeHandler();
  }
}

export function esc(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// --- 3 Readable Themes (Dark Arena, Papan Tulis, Kelas Terang) ---
export const APP_THEMES = [
  { id: 'dark', label: 'Dark Arena', icon: '🌙' },
  { id: 'chalkboard', label: 'Papan Tulis', icon: '🟩' },
  { id: 'light', label: 'Kelas Terang', icon: '☀️' },
];

export function getActiveTheme() {
  try {
    const saved = localStorage.getItem('simulasi_cpns_theme');
    return APP_THEMES.find((t) => t.id === saved) || APP_THEMES[0];
  } catch {
    return APP_THEMES[0];
  }
}

export function setActiveTheme(themeId) {
  const t = APP_THEMES.find((item) => item.id === themeId) || APP_THEMES[0];
  try {
    localStorage.setItem('simulasi_cpns_theme', t.id);
  } catch {
    /* ignore */
  }
  document.documentElement.setAttribute('data-theme', t.id);
  return t;
}

export function cycleActiveTheme() {
  const cur = getActiveTheme();
  const idx = APP_THEMES.findIndex((t) => t.id === cur.id);
  const next = APP_THEMES[(idx + 1) % APP_THEMES.length];
  return setActiveTheme(next.id);
}

// --- Host & Participant Token Persistence ---
export function saveHostToken(joinCode, token) {
  if (!joinCode || !token) return;
  try {
    localStorage.setItem(
      `cpns_host_${joinCode.toUpperCase()}`,
      token.trim().toUpperCase(),
    );
  } catch {
    /* ignore */
  }
}

export function getHostToken(joinCode) {
  if (!joinCode) return '';
  try {
    return localStorage.getItem(`cpns_host_${joinCode.toUpperCase()}`) || '';
  } catch {
    return '';
  }
}

export function saveParticipantIdentity(joinCode, data) {
  if (!joinCode || !data?.participantToken) return;
  try {
    localStorage.setItem(
      `cpns_part_${joinCode.toUpperCase()}`,
      JSON.stringify({
        participantId: data.participantId,
        displayName: data.displayName,
        participantToken: data.participantToken,
      }),
    );
  } catch {
    /* ignore */
  }
}

export function getParticipantIdentity(joinCode) {
  if (!joinCode) return null;
  try {
    const raw = localStorage.getItem(`cpns_part_${joinCode.toUpperCase()}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearParticipantIdentity(joinCode) {
  if (!joinCode) return;
  try {
    localStorage.removeItem(`cpns_part_${joinCode.toUpperCase()}`);
  } catch {
    /* ignore */
  }
}

// --- Toasts & Modals ---
export function showToast(msg, type = 'info') {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 3400);
}

export function openModal(html, onMount) {
  const root = document.getElementById('modal-root');
  if (!root) return;
  root.innerHTML = `
    <div class="modal-backdrop" id="modal-bg">
      <div class="modal-box" role="dialog" aria-modal="true">
        ${html}
      </div>
    </div>
  `;
  const bg = document.getElementById('modal-bg');
  bg?.addEventListener('click', (e) => {
    if (e.target === bg) closeModal();
  });
  if (typeof onMount === 'function') onMount(root);
}

export function closeModal() {
  const root = document.getElementById('modal-root');
  if (root) root.innerHTML = '';
}

export function statusBadgeInfo(status) {
  switch (status) {
    case 'waiting':
      return { label: 'MENUNGGU PESERTA', cls: 'badge-warn' };
    case 'in_progress':
      return { label: 'SEDANG BERLANGSUNG', cls: 'badge-cyan' };
    case 'completed':
      return { label: 'SELESAI DIKERJAKAN', cls: 'badge-ok' };
    case 'review_open':
      return { label: 'MODE PEMBAHASAN TERBUKA', cls: 'badge-purple' };
    default:
      return { label: String(status || '').toUpperCase(), cls: '' };
  }
}

// --- Convex Client & API ---
export async function getConvexClient() {
  if (convexInstance) return convexInstance;
  if (CONVEX_URL && CONVEX_URL.startsWith('https://')) {
    convexInstance = new ConvexClient(CONVEX_URL);
    return convexInstance;
  }
  throw new Error('Konfigurasi CONVEX_URL belum tersedia.');
}

function cleanConvexError(err) {
  const raw = err?.message || String(err || 'Terjadi kesalahan.');
  const m = raw.match(/Uncaught Error:\s*([^\n]+)/);
  if (m) return m[1].replace(/\s+at handler.*$/, '').trim();
  return raw;
}

export async function apiCall(fnName, args = {}, isMutation = false) {
  try {
    const convex = await getConvexClient();
    if (isMutation) {
      return await convex.mutation(fnName, args);
    }
    return await convex.query(fnName, args);
  } catch (err) {
    throw new Error(cleanConvexError(err));
  }
}

export async function fetchBankSummary() {
  await apiCall('matches:ensureSeed', {}, true);
  return await apiCall('matches:getBankSummary', {}, false);
}

export function subscribeQuery(fnName, args, { onData, onError, onConnectionChange }) {
  let closed = false;
  let unsubConvex = null;
  let unsubConn = null;
  let fallbackTimer = null;

  getConvexClient()
    .then((convex) => {
      if (closed) return;
      unsubConn = convex.subscribeToConnectionState((state) => {
        if (typeof onConnectionChange === 'function') {
          onConnectionChange(Boolean(state.isWebSocketConnected));
        }
      });

      unsubConvex = convex.onUpdate(
        fnName,
        args,
        (snap) => {
          if (closed || !snap) return;
          if (typeof onConnectionChange === 'function') onConnectionChange(true);
          onData(snap);
        },
        (err) => {
          if (closed) return;
          if (typeof onError === 'function') onError(new Error(cleanConvexError(err)));
        },
      );

      // Periodic fallback refresh in case a mobile connection stalls
      fallbackTimer = setInterval(async () => {
        if (closed) return;
        try {
          const fresh = await convex.query(fnName, args);
          if (!closed && fresh) onData(fresh);
        } catch {
          /* ignore transient poll error */
        }
      }, 6000);
    })
    .catch((err) => {
      if (typeof onError === 'function') onError(err);
    });

  return () => {
    closed = true;
    if (typeof unsubConvex === 'function') {
      try {
        unsubConvex();
      } catch {
        /* ignore */
      }
    }
    if (typeof unsubConn === 'function') {
      try {
        unsubConn();
      } catch {
        /* ignore */
      }
    }
    if (fallbackTimer) clearInterval(fallbackTimer);
  };
}

// --- Structured 8-Part Educational Explanation Renderer (Bagian F.4) ---
export function renderStructuredExplanationHtml(q) {
  const p = q?.explanationParts;
  if (!p) {
    return `<div class="explanation-box"><p style="margin:0; white-space:pre-line;">${esc(q?.explanation || '')}</p></div>`;
  }

  const sections = [
    { num: '1', title: 'Inti Soal', body: p.coreQuestion },
    { num: '2', title: 'Informasi yang Diketahui', body: p.knownInformation },
    { num: '3', title: 'Cara Berpikir / Strategi', body: p.strategy },
    { num: '4', title: 'Langkah Penyelesaian', body: p.solutionSteps },
    { num: '5', title: 'Menentukan Jawaban', body: p.correctAnswerReason },
    { num: '6', title: 'Mengapa Opsi Lain Salah', body: p.distractorAnalysis },
    { num: '7', title: 'Tips Mengenali Pola', body: p.patternTip },
    { num: '8', title: 'Pemeriksaan Akhir', body: p.finalCheck },
  ];

  return `
    <div class="explanation-box">
      <div class="exp-header">
        <span class="badge badge-ok" style="font-size:0.95rem;">✓ KUNCI JAWABAN: ${esc(q.correctOption)}</span>
        <span style="font-weight:700; color:var(--text-muted); font-size:0.9rem;">Pembahasan Terstruktur 8 Langkah</span>
      </div>
      <div class="exp-grid">
        ${sections
          .map(
            (s) => `
          <div class="exp-step-card">
            <div class="exp-step-title">
              <span class="exp-step-num">${s.num}</span>
              <span>${esc(s.title)}</span>
            </div>
            <div class="exp-step-body">${esc(s.body)}</div>
          </div>
        `,
          )
          .join('')}
      </div>
    </div>
  `;
}

// --- CSV Exporter for Host Live Scoring ---
export function exportLeaderboardCsv(snap) {
  if (!snap?.leaderboard) return;
  const s = snap.session;
  const headers = [
    'Peringkat',
    'Status Seri',
    'Nama Peserta',
    'Status Pengerjaan',
    'Soal Dijawab',
    'Benar',
    'Salah',
    'Belum Dijawab',
    'Skor',
    'Akurasi (%)',
  ];

  const rows = snap.leaderboard.map((r) => [
    r.rank,
    r.isTied ? 'SERI' : '-',
    `"${String(r.displayName).replace(/"/g, '""')}"`,
    r.status === 'finished' ? 'Selesai' : 'Mengerjakan',
    r.answeredCount,
    r.correctCount,
    r.wrongCount,
    r.unansweredCount,
    r.score,
    r.accuracy,
  ]);

  const csvContent =
    '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Simulasi_CPNS_${s.joinCode}_Leaderboard.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
