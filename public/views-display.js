import {
  esc,
  modeLabel,
  calibrateClock,
  computeRemainingMs,
  formatSeconds,
  apiFetch,
  connectRoomStream,
  navigate,
} from './client.js';
import {
  isSoundEnabled,
  setSoundEnabled,
  playCorrectSound,
  playWrongSound,
} from './audio.js';

function statusInfo(snap) {
  const mStatus = snap.match.status;
  const q = snap.currentQuestion;
  const players = snap.players;
  const selected = players.find((p) => p.id === q?.selectedPlayerId);

  if (mStatus === 'READY') {
    return { cls: '', badge: 'SIAP', headline: `Bersiap untuk Soal #${q?.sequenceNumber ?? 1}` };
  }
  if (mStatus === 'PAUSED') {
    return { cls: 'answering', badge: '⏸ DIJEDA', headline: 'Timer Dijeda Sementara oleh Operator' };
  }
  if (mStatus === 'ANSWERING') {
    return {
      cls: 'answering',
      badge: '✋ MENJAWAB',
      headline: `${selected ? selected.displayName : 'Peserta'} Sedang Menjawab — Timer Dibekukan`,
    };
  }
  if (mStatus === 'RUNNING') {
    if (q?.status === 'WRONG_RETRY') {
      const lastAttempt = q.attempts?.[q.attempts.length - 1];
      return {
        cls: 'wrong',
        badge: 'SALAH • LEMPAR SOAL',
        headline: `${lastAttempt ? `${lastAttempt.playerName} belum tepat — ` : ''}Kesempatan terbuka bagi peserta lain!`,
      };
    }
    return { cls: '', badge: 'BERLANGSUNG', headline: 'Angkat tangan untuk menjawab!' };
  }
  if (mStatus === 'QUESTION_FINISHED') {
    if (q?.result === 'CORRECT') {
      return {
        cls: 'correct',
        badge: '✓ BENAR',
        headline: `Jawaban Benar! +${snap.match.settings.pointsCorrect} Poin untuk ${selected ? selected.displayName : 'Peserta'}`,
      };
    }
    if (q?.result === 'TIMEOUT') {
      return { cls: 'wrong', badge: '⏱ WAKTU HABIS', headline: 'Waktu Habis — Tidak ada poin pada soal ini' };
    }
    return { cls: 'wrong', badge: '✕ SALAH', headline: 'Ketiga peserta belum tepat — Soal selesai tanpa poin' };
  }
  return { cls: '', badge: mStatus, headline: '' };
}

function renderScoreboard(snap) {
  const q = snap.currentQuestion;
  const attempted = new Set(q?.attemptedPlayerIds || []);
  const isAnswering = snap.match.status === 'ANSWERING';
  const isQFinishedCorrect = snap.match.status === 'QUESTION_FINISHED' && q?.result === 'CORRECT';

  return `
    <footer class="scoreboard">
      ${snap.players
        .map((p) => {
          const isSelected = q?.selectedPlayerId === p.id;
          const isActive = isAnswering && isSelected;
          const isWinner = isQFinishedCorrect && isSelected;
          const hasTriedWrong = !isWinner && !isActive && attempted.has(p.id);
          return `
            <div class="player-card ${isActive ? 'active' : ''} ${isWinner ? 'winner-flash' : ''} ${hasTriedWrong ? 'attempted' : ''}"
                 style="--player-color:${esc(p.themeColor)};">
              <div style="min-width:0;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap;">
                  <span style="font-size:0.8rem; font-weight:800; color:${esc(p.themeColor)};">PESERTA ${p.seatNumber}</span>
                  ${isActive ? `<span class="badge badge-warn">✋ MENJAWAB</span>` : ''}
                  ${isWinner ? `<span class="badge badge-ok">✓ +${snap.match.settings.pointsCorrect}</span>` : ''}
                  ${hasTriedWrong ? `<span class="badge badge-err">✕ SUDAH MENCOBA</span>` : ''}
                </div>
                <div class="player-name" title="${esc(p.displayName)}">${esc(p.displayName)}</div>
              </div>
              <div class="player-score tabular">${p.score}</div>
            </div>
          `;
        })
        .join('')}
    </footer>
  `;
}

function renderPodium(snap, online) {
  // Order visually: Rank 2 left, Rank 1 center, Rank 3 right when distinct; otherwise clean 3-column order
  const st = snap.standings;
  const visualOrder = st.length === 3 ? [st[1], st[0], st[2]] : st;
  const medalIcon = (rank) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉');

  return `
    <div class="display-shell" style="grid-template-rows: auto 1fr auto;">
      <header class="display-header">
        <div class="brand">
          <div class="brand-mark">LCC</div>
          <div>
            <div>LCC ARENA — HASIL AKHIR</div>
            <div style="font-size:0.8rem; color:var(--text-muted);">${esc(modeLabel(snap.match.mode))} • Ruang #${esc(snap.match.roomCode)}</div>
          </div>
        </div>
        <div class="display-meta">
          <span class="badge"><span class="dot ${online ? 'dot-online' : 'dot-offline'}" data-conn-dot></span> <span data-conn-text>${online ? 'ONLINE' : 'MENYAMBUNG ULANG'}</span></span>
        </div>
      </header>

      <main style="display:flex; flex-direction:column; justify-content:center; text-align:center;">
        <div style="margin-bottom:8px;">
          <span class="badge badge-cyan" style="font-size:0.95rem; padding:7px 18px;">PERTANDINGAN SELESAI • ${snap.match.totalQuestions} SOAL</span>
        </div>
        <h1 style="font-size:clamp(2rem, 3.6vw, 3.2rem); margin:6px 0 18px;">Podium Juara LCC ARENA</h1>

        <div class="podium-grid">
          ${visualOrder
            .map(
              (p) => `
            <div class="podium-col ${p.rank === 1 ? 'rank-1' : ''}" style="--player-color:${esc(p.themeColor)};">
              <div style="font-size:2.8rem; line-height:1;">${medalIcon(p.rank)}</div>
              <div style="margin:10px 0 6px;">
                <span class="badge ${p.rank === 1 ? 'badge-warn' : 'badge-cyan'}" style="font-size:0.92rem;">
                  JUARA ${p.rank}${p.isTied ? ' (SERI)' : ''}
                </span>
              </div>
              <div style="font-size:clamp(1.4rem, 2.2vw, 2rem); font-weight:900; margin:8px 0;">${esc(p.displayName)}</div>
              <div style="font-size:clamp(2.4rem, 4vw, 3.6rem); font-weight:900;" class="tabular">
                ${p.score} <span style="font-size:1.1rem; font-weight:600; color:var(--text-muted);">poin</span>
              </div>
            </div>
          `,
            )
            .join('')}
        </div>
      </main>

      <footer style="display:flex; justify-content:center; gap:14px; padding-top:12px; flex-wrap:wrap;">
        <button class="btn btn-primary" id="disp-new-match">+ Pertandingan Baru</button>
        <button class="btn" id="disp-go-history">Lihat Laporan Detail</button>
        <button class="btn" id="disp-go-home">Kembali ke Beranda</button>
      </footer>
    </div>
  `;
}

export async function renderDisplayView(root, roomCode) {
  const code = roomCode.toUpperCase();
  let snap = null;
  let online = true;

  await calibrateClock();

  try {
    snap = await apiFetch(`/api/matches/${encodeURIComponent(code)}`);
  } catch (err) {
    root.innerHTML = `
      <div class="container">
        <div class="panel" style="text-align:center; padding:42px 24px; margin-top:48px;">
          <h1 style="margin:0 0 10px;">Ruang Tidak Ditemukan</h1>
          <p style="color:var(--text-muted); margin:0 0 22px;">${esc(err.message)}</p>
          <button class="btn btn-primary" id="err-home">Kembali ke Beranda</button>
        </div>
      </div>
    `;
    root.querySelector('#err-home')?.addEventListener('click', () => navigate('/'));
    return null;
  }

  const render = () => {
    if (!snap) return;

    if (snap.match.status === 'MATCH_FINISHED') {
      root.innerHTML = renderPodium(snap, online);
      root.querySelector('#disp-new-match')?.addEventListener('click', () => navigate('/setup'));
      root.querySelector('#disp-go-history')?.addEventListener('click', () => navigate(`/history/${encodeURIComponent(snap.match.id)}`));
      root.querySelector('#disp-go-home')?.addEventListener('click', () => navigate('/'));
      return;
    }

    if (snap.match.status === 'LOBBY') {
      root.innerHTML = `
        <div class="display-shell" style="grid-template-rows: auto 1fr auto;">
          <header class="display-header">
            <div class="brand">
              <div class="brand-mark">LCC</div>
              <div>
                <div>LCC ARENA</div>
                <div style="font-size:0.8rem; color:var(--text-muted);">${esc(modeLabel(snap.match.mode))} • ${snap.match.totalQuestions} Soal</div>
              </div>
            </div>
            <div class="display-meta">
              <span class="badge badge-cyan tabular" style="font-size:1rem;">RUANG #${esc(snap.match.roomCode)}</span>
              <span class="badge"><span class="dot ${online ? 'dot-online' : 'dot-offline'}" data-conn-dot></span> <span data-conn-text>${online ? 'ONLINE' : 'OFFLINE'}</span></span>
              <button class="btn btn-sm" id="btn-sound" title="Pengaturan Suara">${isSoundEnabled() ? '🔊 Suara: ON' : '🔇 Suara: OFF'}</button>
              <button class="btn btn-sm" id="btn-fs" title="Layar Penuh">⛶ Layar Penuh</button>
            </div>
          </header>

          <main class="question-stage" style="text-align:center; align-items:center;">
            <span class="badge badge-purple" style="font-size:1rem; padding:8px 20px;">MENUNGGU PERTANDINGAN DIMULAI</span>
            <h1 style="font-size:clamp(2.2rem, 4.4vw, 4rem); margin:0;">Selamat Datang di LCC ARENA!</h1>
            <p style="font-size:clamp(1.1rem, 1.8vw, 1.55rem); color:var(--text-muted); max-width:860px; margin:0;">
              Waktu per soal <strong>${snap.match.settings.durationSeconds} detik</strong> • Jawaban Benar <strong>+${snap.match.settings.pointsCorrect} poin</strong> • Jawaban Salah <strong>0 poin</strong> (tanpa pengurangan).
            </p>
          </main>

          ${renderScoreboard(snap)}
        </div>
      `;
      root.querySelector('#btn-fs')?.addEventListener('click', toggleFullscreen);
      root.querySelector('#btn-sound')?.addEventListener('click', () => {
        setSoundEnabled(!isSoundEnabled());
        render();
      });
      return;
    }

    const q = snap.currentQuestion;
    const st = statusInfo(snap);
    const remMs = computeRemainingMs(snap);
    const durMs = snap.match.settings.durationSeconds * 1000;
    const pct = durMs > 0 ? Math.min(100, Math.max(0, (remMs / durMs) * 100)) : 0;
    const isFrozen = ['ANSWERING', 'PAUSED'].includes(snap.match.status);
    const isWarn = snap.match.status === 'RUNNING' && remMs > 0 && remMs <= 5000;
    const isDanger = remMs <= 0 && snap.match.status !== 'READY';
    const qLen = (q?.questionText || '').length;

    root.innerHTML = `
      <div class="display-shell">
        <header class="display-header">
          <div class="brand">
            <div class="brand-mark">LCC</div>
            <div>
              <div>LCC ARENA</div>
              <div style="font-size:0.8rem; color:var(--text-muted);">${esc(modeLabel(snap.match.mode))} • Ruang #${esc(snap.match.roomCode)}</div>
            </div>
          </div>
          <div class="display-meta">
            ${q ? `<span class="badge badge-purple">${esc(q.category)} — ${esc(q.topic)}</span>` : ''}
            ${q ? `<span class="badge badge-cyan tabular" style="font-size:0.98rem;">SOAL ${q.sequenceNumber} / ${q.totalQuestions}</span>` : ''}
            <span class="badge"><span class="dot ${online ? 'dot-online' : 'dot-offline'}" data-conn-dot></span> <span data-conn-text>${online ? 'ONLINE' : 'OFFLINE'}</span></span>
            <button class="btn btn-sm" id="btn-sound" title="Pengaturan Suara">${isSoundEnabled() ? '🔊 Suara: ON' : '🔇 Suara: OFF'}</button>
            <button class="btn btn-sm" id="btn-fs" title="Layar Penuh">⛶</button>
          </div>
        </header>

        <section class="display-hud">
          <div class="timer-card ${isFrozen ? 'frozen' : isDanger ? 'danger' : isWarn ? 'warn' : ''}" id="disp-timer-card">
            <div style="font-size:0.8rem; font-weight:800; color:var(--text-muted); letter-spacing:0.08em;">
              ${isFrozen ? 'SISA WAKTU (BEKU)' : 'WAKTU TERSISA'}
            </div>
            <div class="timer-digits tabular" data-timer-text>${formatSeconds(remMs)}s</div>
            <div class="timer-bar-track">
              <div class="timer-bar-fill ${isDanger ? 'danger' : isWarn ? 'warn' : ''}" data-timer-bar style="width:${pct.toFixed(1)}%;"></div>
            </div>
          </div>

          <div class="status-banner ${st.cls}">
            <div>
              <div style="margin-bottom:4px;"><span class="badge ${st.cls === 'correct' ? 'badge-ok' : st.cls === 'wrong' ? 'badge-err' : st.cls === 'answering' ? 'badge-warn' : 'badge-cyan'}">${esc(st.badge)}</span></div>
              <div class="status-headline">${esc(st.headline)}</div>
            </div>
            ${
              q
                ? `<div style="text-align:right; flex-shrink:0;">
                    <span class="badge">${q.difficulty === 'easy' ? 'Level 1 • Mudah' : `Level ${q.level} • Menengah`}</span>
                  </div>`
                : ''
            }
          </div>
        </section>

        <main class="question-stage">
          ${
            snap.match.status === 'READY'
              ? `
              <div style="text-align:center; padding:18px 0;">
                <div style="color:var(--accent-cyan); font-weight:800; font-size:1.15rem; margin-bottom:8px;">
                  ${esc(q?.indicatorId)} • ${esc(q?.category)}: ${esc(q?.topic)}
                </div>
                <p class="question-text" style="margin-bottom:10px;">Soal #${q?.sequenceNumber} Siap Dimulai</p>
                <div style="color:var(--text-muted); font-size:1.15rem;">Perhatikan layar dan angkat tangan setelah soal ditampilkan!</div>
              </div>
            `
              : `
              <p class="question-text ${qLen > 140 ? 'long' : ''}">${esc(q?.questionText || '')}</p>
              ${
                q?.options
                  ? `
                  <div class="options-grid">
                    ${['A', 'B', 'C', 'D']
                      .map(
                        (key) => `
                      <div class="option-tile ${q.correctOption === key ? 'correct' : ''}">
                        <div class="option-key">${key}</div>
                        <div>${esc(q.options[key])}</div>
                      </div>
                    `,
                      )
                      .join('')}
                  </div>
                `
                  : ''
              }
              ${
                q?.correctOption && q?.explanation
                  ? `
                  <div class="explanation-box">
                    <strong style="color:#6ee7b7;">Kunci Jawaban: ${esc(q.correctOption)}</strong> — ${esc(q.explanation)}
                  </div>
                `
                  : ''
              }
            `
          }
        </main>

        ${renderScoreboard(snap)}
      </div>
    `;

    root.querySelector('#btn-fs')?.addEventListener('click', toggleFullscreen);
    root.querySelector('#btn-sound')?.addEventListener('click', () => {
      setSoundEnabled(!isSoundEnabled());
      render();
    });
  };

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  let lastSeenAttemptId = null;
  const initialAttempts = snap?.currentQuestion?.attempts || [];
  if (initialAttempts.length > 0) {
    lastSeenAttemptId = initialAttempts[initialAttempts.length - 1].id;
  }

  render();

  const updateConnectionUi = (isOnline) => {
    online = isOnline;
    const dot = root.querySelector('[data-conn-dot]');
    const txt = root.querySelector('[data-conn-text]');
    if (dot) dot.className = `dot ${online ? 'dot-online' : 'dot-offline'}`;
    if (txt) txt.textContent = online ? 'ONLINE' : 'MENYAMBUNG ULANG...';
  };

  const disconnect = connectRoomStream({
    roomCode: code,
    role: 'display',
    onSnapshot: (incoming) => {
      const q = incoming.currentQuestion;
      const attempts = q?.attempts || [];
      const last = attempts.length > 0 ? attempts[attempts.length - 1] : null;

      if (incoming.eventType === 'ANSWER_CORRECT') {
        playCorrectSound();
      } else if (incoming.eventType === 'ANSWER_WRONG') {
        playWrongSound();
      } else if (last && last.id !== lastSeenAttemptId) {
        if (last.result === 'CORRECT') playCorrectSound();
        else if (last.result === 'WRONG') playWrongSound();
      }

      if (last) {
        lastSeenAttemptId = last.id;
      } else if (q && snap && q.sequenceNumber !== snap.currentQuestion?.sequenceNumber) {
        lastSeenAttemptId = null;
      }

      snap = incoming;
      render();
    },
    onConnectionChange: updateConnectionUi,
  });

  // Smooth 80ms DOM-targeted countdown tick (never re-renders full stage)
  const tickId = setInterval(() => {
    if (!snap || snap.match.status !== 'RUNNING') return;
    const remMs = computeRemainingMs(snap);
    const durMs = snap.match.settings.durationSeconds * 1000;
    const pct = durMs > 0 ? Math.min(100, Math.max(0, (remMs / durMs) * 100)) : 0;
    const tText = root.querySelector('[data-timer-text]');
    const tBar = root.querySelector('[data-timer-bar]');
    const tCard = root.querySelector('#disp-timer-card');
    if (tText) tText.textContent = `${formatSeconds(remMs)}s`;
    if (tBar) {
      tBar.style.width = `${pct.toFixed(1)}%`;
      tBar.className = `timer-bar-fill ${remMs <= 0 ? 'danger' : remMs <= 5000 ? 'warn' : ''}`;
    }
    if (tCard) {
      tCard.className = `timer-card ${remMs <= 0 ? 'danger' : remMs <= 5000 ? 'warn' : ''}`;
    }
  }, 80);

  return () => {
    clearInterval(tickId);
    disconnect();
  };
}
