import {
  esc,
  modeLabel,
  calibrateClock,
  computeRemainingMs,
  formatSeconds,
  extractHashToken,
  saveRoomToken,
  apiFetch,
  makeActionId,
  connectRoomStream,
  showToast,
  openModal,
  closeModal,
  navigate,
} from './client.js';

export async function renderControllerView(root, roomCode) {
  const code = roomCode.toUpperCase();
  let token = extractHashToken(code);
  let snap = null;
  let online = true;
  let busy = false;
  let showOperatorKey = true;
  let cleanupStream = null;
  let tickId = null;

  await calibrateClock();

  const renderTokenGate = (errMessage = '') => {
    root.innerHTML = `
      <div class="ctrl-shell" style="justify-content:center;">
        <div class="panel">
          <div class="brand" style="margin-bottom:14px;" id="gate-home">
            <div class="brand-mark">LCC</div>
            <div>
              <div>MOBILE CONTROLLER</div>
              <div style="font-size:0.78rem; color:var(--text-muted);">Ruang #${esc(code)}</div>
            </div>
          </div>
          <h1 style="font-size:1.3rem; margin:0 0 8px;">Verifikasi Token Operator</h1>
          <p style="color:var(--text-muted); font-size:0.9rem; margin:0 0 16px;">
            Masukkan token kontrol 12 karakter yang tampil pada layar pembuatan ruang atau scan ulang QR Controller.
          </p>
          ${errMessage ? `<div class="card" style="border-color:var(--err); background:var(--err-bg); color:#fecaca; margin-bottom:14px; font-size:0.9rem;">${esc(errMessage)}</div>` : ''}
          <form id="token-form">
            <div class="field">
              <label for="token-inp">Token Kontrol</label>
              <input id="token-inp" class="input tabular" placeholder="XXXX-XXXX-XXXX" value="${esc(token)}" required style="text-transform:uppercase; letter-spacing:0.08em; font-weight:800;" />
            </div>
            <div style="display:flex; gap:10px;">
              <button type="button" class="btn" id="btn-gate-back">Beranda</button>
              <button type="submit" class="btn btn-primary" style="flex:1;">Masuk Controller →</button>
            </div>
          </form>
        </div>
      </div>
    `;

    root.querySelector('#gate-home')?.addEventListener('click', () => navigate('/'));
    root.querySelector('#btn-gate-back')?.addEventListener('click', () => navigate('/'));
    root.querySelector('#token-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const candidate = root.querySelector('#token-inp').value.trim().toUpperCase();
      try {
        const verified = await apiFetch(`/api/matches/${encodeURIComponent(code)}/verify`, {
          method: 'POST',
          body: { token: candidate },
        });
        token = candidate;
        saveRoomToken(code, token);
        snap = verified;
        startLiveSession();
      } catch (err) {
        if (err.status === 404) renderRoomNotFound(err.message);
        else renderTokenGate(err.message);
      }
    });
  };

  const renderRoomNotFound = (msg) => {
    root.innerHTML = `
      <div class="ctrl-shell" style="justify-content:center;">
        <div class="panel" style="text-align:center;">
          <h2 style="margin:0 0 8px;">Ruang Tidak Ditemukan</h2>
          <p style="color:var(--text-muted); margin:0 0 18px;">${esc(msg)}</p>
          <button class="btn btn-primary btn-block" id="nf-home">Kembali ke Beranda</button>
        </div>
      </div>
    `;
    root.querySelector('#nf-home')?.addEventListener('click', () => navigate('/'));
  };

  const sendAction = async (actionObj) => {
    if (busy) return;
    busy = true;
    const actionWithId = { ...actionObj, actionId: makeActionId() };
    // Disable action buttons immediately to prevent accidental double-tap
    root.querySelectorAll('[data-act]').forEach((b) => { b.disabled = true; });
    try {
      const updated = await apiFetch(`/api/matches/${encodeURIComponent(code)}/action`, {
        method: 'POST',
        token,
        body: actionWithId,
      });
      snap = updated;
      busy = false;
      renderController();
    } catch (err) {
      busy = false;
      showToast(err.message, 'err');
      // Refresh authoritative state on conflict/error
      try {
        snap = await apiFetch(`/api/matches/${encodeURIComponent(code)}`, { token });
      } catch { /* ignore */ }
      renderController();
    }
  };

  const openScoreAdjustModal = () => {
    if (!snap) return;
    openModal(
      `
      <h3 style="margin:0 0 6px;">Koreksi Skor Manual</h3>
      <p style="margin:0 0 14px; font-size:0.86rem; color:var(--text-muted);">
        Setiap perubahan skor wajib disertai alasan dan tercatat pada log audit pertandingan.
      </p>
      <form id="adj-form">
        <div class="field">
          <label for="adj-player">Pilih Peserta</label>
          <select id="adj-player" class="input">
            ${snap.players
              .map((p) => `<option value="${esc(p.id)}">Kursi ${p.seatNumber} — ${esc(p.displayName)} (Skor: ${p.score})</option>`)
              .join('')}
          </select>
        </div>
        <div class="field">
          <label for="adj-delta">Perubahan Poin (+/-)</label>
          <div style="display:flex; gap:8px;">
            <input id="adj-delta" type="number" class="input tabular" value="10" required style="flex:1;" />
            <button type="button" class="btn btn-sm adj-pre" data-d="10">+10</button>
            <button type="button" class="btn btn-sm adj-pre" data-d="-10">-10</button>
          </div>
        </div>
        <div class="field">
          <label for="adj-reason">Alasan Koreksi (Wajib)</label>
          <input id="adj-reason" class="input" required minlength="3" maxlength="200" placeholder="Mis. Salah tekan tombol pada Soal 2" />
        </div>
        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:16px;">
          <button type="button" class="btn btn-sm" id="adj-cancel">Batal</button>
          <button type="submit" class="btn btn-sm btn-primary">Simpan Koreksi</button>
        </div>
      </form>
    `,
      (mRoot) => {
        const deltaInp = mRoot.querySelector('#adj-delta');
        mRoot.querySelectorAll('.adj-pre').forEach((b) =>
          b.addEventListener('click', () => { deltaInp.value = b.dataset.d; }),
        );
        mRoot.querySelector('#adj-cancel')?.addEventListener('click', closeModal);
        mRoot.querySelector('#adj-form')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const playerId = mRoot.querySelector('#adj-player').value;
          const delta = Number(deltaInp.value);
          const reason = mRoot.querySelector('#adj-reason').value;
          closeModal();
          await sendAction({ type: 'ADJUST_SCORE', playerId, delta, reason });
          showToast('Koreksi skor tersimpan.', 'ok');
        });
      },
    );
  };

  const openEndMatchModal = () => {
    openModal(
      `
      <h3 style="margin:0 0 8px;">Akhiri Pertandingan Sekarang?</h3>
      <p style="color:var(--text-muted); font-size:0.9rem; margin:0 0 18px;">
        Pertandingan akan langsung ditutup dan layar IFP akan menampilkan Podium Hasil Akhir berdasarkan skor saat ini.
      </p>
      <div style="display:flex; gap:10px; justify-content:flex-end;">
        <button class="btn btn-sm" id="end-cancel">Batal</button>
        <button class="btn btn-sm btn-err" id="end-confirm">Ya, Akhiri Pertandingan</button>
      </div>
    `,
      (mRoot) => {
        mRoot.querySelector('#end-cancel')?.addEventListener('click', closeModal);
        mRoot.querySelector('#end-confirm')?.addEventListener('click', async () => {
          closeModal();
          await sendAction({ type: 'END_MATCH' });
        });
      },
    );
  };

  const renderController = () => {
    if (!snap) return;
    const m = snap.match;
    const q = snap.currentQuestion;
    const dispCount = snap.connections?.display ?? 0;
    const remMs = computeRemainingMs(snap);
    const pts = m.settings.pointsCorrect;

    // Top sticky bar
    const topBarHtml = `
      <header class="ctrl-topbar">
        <div>
          <div style="display:flex; align-items:center; gap:7px;">
            <span class="dot ${online ? 'dot-online' : 'dot-offline'}" data-ctrl-dot></span>
            <strong class="tabular" style="letter-spacing:0.06em;">#${esc(m.roomCode)}</strong>
            <span class="badge ${dispCount > 0 ? 'badge-ok' : 'badge-warn'}" style="padding:2px 8px; font-size:0.74rem;">
              IFP: ${dispCount}
            </span>
          </div>
          <div style="font-size:0.76rem; color:var(--text-muted);" data-ctrl-conn-label>
            ${online ? (q ? `Soal ${q.sequenceNumber}/${q.totalQuestions} • ${m.status}` : `Lobby • ${m.totalQuestions} Soal`) : 'Koneksi terputus — menyambung...'}
          </div>
        </div>
        <div class="ctrl-timer tabular" data-ctrl-timer style="color:${remMs <= 5000 && m.status === 'RUNNING' ? 'var(--warn)' : '#fff'};">
          ${q ? `${formatSeconds(remMs)}s` : `${m.settings.durationSeconds}.0s`}
        </div>
      </header>
    `;

    if (m.status === 'MATCH_FINISHED') {
      root.innerHTML = `
        <div class="ctrl-shell">
          ${topBarHtml}
          <section class="panel" style="text-align:center;">
            <span class="badge badge-ok" style="margin-bottom:8px;">PERTANDINGAN SELESAI</span>
            <h1 style="font-size:1.45rem; margin:0 0 14px;">Hasil Akhir Podium</h1>
            <div style="display:grid; gap:10px; text-align:left; margin-bottom:18px;">
              ${snap.standings
                .map(
                  (p) => `
                <div class="card" style="border-left:6px solid ${esc(p.themeColor)}; display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <div style="font-size:0.78rem; color:var(--text-muted); font-weight:800;">JUARA ${p.rank}${p.isTied ? ' (SERI)' : ''}</div>
                    <div style="font-weight:800; font-size:1.1rem;">${esc(p.displayName)}</div>
                  </div>
                  <div class="tabular" style="font-size:1.65rem; font-weight:900;">${p.score}</div>
                </div>
              `,
                )
                .join('')}
            </div>
            <div style="display:grid; gap:10px;">
              <button class="btn btn-primary btn-block" id="c-new-match">+ Buat Pertandingan Baru</button>
              <button class="btn btn-block" id="c-hist-detail">📋 Lihat Laporan Lengkap</button>
              <button class="btn btn-block" id="c-home">Beranda</button>
            </div>
          </section>
        </div>
      `;
      root.querySelector('#c-new-match')?.addEventListener('click', () => navigate('/setup'));
      root.querySelector('#c-hist-detail')?.addEventListener('click', () => navigate(`/history/${encodeURIComponent(m.id)}`));
      root.querySelector('#c-home')?.addEventListener('click', () => navigate('/'));
      return;
    }

    if (m.status === 'LOBBY') {
      root.innerHTML = `
        <div class="ctrl-shell">
          ${topBarHtml}
          <section class="panel">
            <span class="badge badge-cyan" style="margin-bottom:8px;">${esc(modeLabel(m.mode))}${m.settings.bank === 'ADVANCED' ? ' • Bank Lanjutan' : ''} • ${m.totalQuestions} Soal</span>
            <h1 style="font-size:1.35rem; margin:0 0 8px;">Ruang Siap Dimulai</h1>
            <p style="font-size:0.9rem; color:var(--text-muted); margin:0 0 16px;">
              Pastikan layar Display pada IFP sudah terbuka (${dispCount > 0 ? '✅ Terhubung' : '⚠️ Belum terdeteksi'}), lalu tekan tombol di bawah.
            </p>
            <div style="display:grid; gap:8px; margin-bottom:18px;">
              ${snap.players
                .map(
                  (p) => `
                <div class="card" style="padding:10px 14px; border-left:5px solid ${esc(p.themeColor)}; display:flex; justify-content:space-between;">
                  <strong>Kursi ${p.seatNumber}: ${esc(p.displayName)}</strong>
                  <span class="tabular">${p.score} poin</span>
                </div>
              `,
                )
                .join('')}
            </div>
            <button class="btn btn-primary btn-xl btn-block" data-act="START_MATCH" ${!online ? 'disabled' : ''}>
              🚀 MULAI PERTANDINGAN
            </button>
            <div style="display:flex; gap:8px; margin-top:10px;">
              <button class="btn btn-sm" id="c-go-launchpad" style="flex:1;">QR &amp; Tautan Ruang</button>
              <button class="btn btn-sm btn-err" id="c-end-early">Batalkan</button>
            </div>
          </section>
        </div>
      `;
      root.querySelector('[data-act="START_MATCH"]')?.addEventListener('click', () => sendAction({ type: 'START_MATCH' }));
      root.querySelector('#c-go-launchpad')?.addEventListener('click', () => navigate(`/lobby/${encodeURIComponent(code)}`));
      root.querySelector('#c-end-early')?.addEventListener('click', openEndMatchModal);
      return;
    }

    // Active Question States: READY, RUNNING, ANSWERING, PAUSED, QUESTION_FINISHED
    const attempted = new Set(q?.attemptedPlayerIds || []);
    const selectedPlayer = snap.players.find((p) => p.id === q?.selectedPlayerId);
    const isLastQuestion = q && q.sequenceNumber >= q.totalQuestions;

    let actionAreaHtml = '';
    if (m.status === 'READY') {
      actionAreaHtml = `
        <div class="panel" style="text-align:center;">
          <div style="font-size:0.86rem; color:var(--text-muted); margin-bottom:10px;">
            Teks soal belum ditampilkan di IFP. Tekan tombol berikut untuk menampilkan soal &amp; menjalankan timer ${m.settings.durationSeconds} detik.
          </div>
          <button class="btn btn-primary btn-xl btn-block" data-act="START_QUESTION" ${!online ? 'disabled' : ''}>
            ▶ MULAI SOAL #${q.sequenceNumber}
          </button>
        </div>
      `;
    } else if (m.status === 'RUNNING') {
      actionAreaHtml = `
        <div class="panel">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <strong style="font-size:0.95rem;">Pilih Peserta yang Mengangkat Tangan:</strong>
            <button class="btn btn-sm btn-warn" data-act="PAUSE_MATCH" ${!online ? 'disabled' : ''}>⏸ Pause</button>
          </div>
          <div style="display:grid; gap:10px;">
            ${snap.players
              .map((p) => {
                const tried = attempted.has(p.id);
                return `
                  <button class="ctrl-player-btn"
                          style="--player-color:${esc(p.themeColor)};"
                          data-select-player="${esc(p.id)}"
                          data-act="SELECT_PLAYER"
                          ${tried || !online ? 'disabled' : ''}>
                    <div>
                      <div style="font-size:0.75rem; font-weight:800; color:${esc(p.themeColor)};">
                        PESERTA ${p.seatNumber} ${tried ? '• ✕ SUDAH MENCOBA' : ''}
                      </div>
                      <div style="font-size:1.12rem; font-weight:800;">${esc(p.displayName)}</div>
                    </div>
                    <div class="tabular" style="font-size:1.35rem; font-weight:900;">${p.score}</div>
                  </button>
                `;
              })
              .join('')}
          </div>
        </div>
      `;
    } else if (m.status === 'ANSWERING') {
      actionAreaHtml = `
        <div class="panel" style="border-color:var(--warn);">
          <div class="badge badge-warn" style="margin-bottom:8px;">✋ TIMER DIBEKUKAN (${formatSeconds(remMs)}s)</div>
          <div style="font-size:1.18rem; font-weight:800; margin-bottom:14px;">
            Dengarkan Jawaban: <span style="color:#fcd34d;">${esc(selectedPlayer?.displayName || 'Peserta')}</span>
          </div>
          <div class="judge-grid" style="margin-bottom:12px;">
            <button class="btn btn-ok judge-btn" data-act="JUDGE_CORRECT" ${!online ? 'disabled' : ''}>
              <span>✓ BENAR</span>
              <span style="font-size:0.86rem; font-weight:700;">+${pts} Poin</span>
            </button>
            <button class="btn btn-err judge-btn" data-act="JUDGE_WRONG" ${!online ? 'disabled' : ''}>
              <span>✕ SALAH</span>
              <span style="font-size:0.86rem; font-weight:700;">0 Poin • Lempar</span>
            </button>
          </div>
          <button class="btn btn-block" data-act="CANCEL_SELECTION" ${!online ? 'disabled' : ''}>
            ↩ BATALKAN PEMILIHAN (Lanjut Timer)
          </button>
        </div>
      `;
    } else if (m.status === 'PAUSED') {
      actionAreaHtml = `
        <div class="panel" style="border-color:var(--warn); text-align:center;">
          <div class="badge badge-warn" style="margin-bottom:10px;">⏸ PERTANDINGAN DIJEDA (${formatSeconds(remMs)}s)</div>
          <button class="btn btn-primary btn-xl btn-block" data-act="RESUME_MATCH" ${!online ? 'disabled' : ''}>
            ▶ LANJUTKAN TIMER (RESUME)
          </button>
        </div>
      `;
    } else if (m.status === 'QUESTION_FINISHED') {
      actionAreaHtml = `
        <div class="panel">
          <div style="margin-bottom:12px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
            <span class="badge ${q?.result === 'CORRECT' ? 'badge-ok' : 'badge-err'}">
              SOAL SELESAI • ${esc(q?.result || 'FINISHED')}
            </span>
            ${
              m.settings.allowAnswerReveal
                ? `<button class="btn btn-sm ${q?.answerRevealed ? '' : 'btn-cyan'}" data-act="REVEAL_ANSWER" ${!online ? 'disabled' : ''}>
                    ${q?.answerRevealed ? '🙈 Sembunyikan Kunci di IFP' : '👁 Lihat Kunci Jawaban di IFP'}
                  </button>`
                : ''
            }
          </div>
          <button class="btn btn-primary btn-xl btn-block" data-act="NEXT_QUESTION" ${!online ? 'disabled' : ''}>
            ${isLastQuestion ? '🏆 SELESAIKAN & TAMPILKAN PODIUM' : `SOAL BERIKUTNYA (#${q.sequenceNumber + 1}) →`}
          </button>
        </div>
      `;
    }

    // Operator Private Question + Answer Key Card
    const questionCardHtml = q
      ? `
      <section class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px;">
          <span style="font-size:0.78rem; font-weight:800; color:var(--accent-cyan);">
            ${esc(q.questionId)} • ${esc(q.topic)} (L${q.level} ${{ easy: 'Mudah', medium: 'Menengah', hard: 'Sulit' }[q.difficulty] ?? ''})
          </span>
          <button class="btn btn-sm" id="btn-toggle-key" style="min-height:30px; padding:3px 10px; font-size:0.76rem;">
            ${showOperatorKey ? 'Sembunyikan Kunci' : 'Lihat Kunci'}
          </button>
        </div>
        <div style="font-weight:700; font-size:0.98rem; margin-bottom:8px;">${esc(q.questionText)}</div>
        ${
          q.options
            ? `<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:0.86rem; margin-bottom:8px;">
                ${['A', 'B', 'C', 'D']
                  .map(
                    (k) => `
                  <div style="padding:6px 8px; border-radius:8px; background:#0a1122; border:1px solid ${showOperatorKey && q.correctOption === k ? 'var(--ok)' : 'var(--border)'};">
                    <strong style="color:${showOperatorKey && q.correctOption === k ? '#6ee7b7' : 'var(--accent-cyan)'};">${k}.</strong> ${esc(q.options[k])}
                  </div>
                `,
                  )
                  .join('')}
              </div>`
            : ''
        }
        ${
          showOperatorKey
            ? `<div style="padding:8px 10px; border-radius:8px; background:var(--ok-bg); border:1px solid var(--ok); font-size:0.86rem;">
                <strong style="color:#6ee7b7;">Kunci: ${esc(q.correctOption)}</strong> — ${esc(q.explanation)}
              </div>`
            : ''
        }
      </section>
    `
      : '';

    // Compact scoreboard + utility actions
    const footerHtml = `
      <section class="card">
        <div style="font-size:0.78rem; font-weight:800; color:var(--text-muted); margin-bottom:8px;">RINGKASAN SKOR SEMENTARA</div>
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-bottom:12px; text-align:center;">
          ${snap.players
            .map(
              (p) => `
            <div style="padding:8px 6px; border-radius:10px; background:#091020; border-top:3px solid ${esc(p.themeColor)};">
              <div style="font-size:0.78rem; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(p.displayName)}</div>
              <div class="tabular" style="font-size:1.25rem; font-weight:900;">${p.score}</div>
            </div>
          `,
            )
            .join('')}
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-sm" id="btn-adj-score" style="flex:1;">⚖ Koreksi Skor</button>
          <button class="btn btn-sm btn-err" id="btn-end-match">⏹ Akhiri Lomba</button>
        </div>
      </section>
    `;

    root.innerHTML = `
      <div class="ctrl-shell">
        ${topBarHtml}
        ${actionAreaHtml}
        ${questionCardHtml}
        ${footerHtml}
      </div>
    `;

    // Wire handlers
    root.querySelector('#btn-toggle-key')?.addEventListener('click', () => {
      showOperatorKey = !showOperatorKey;
      renderController();
    });
    root.querySelector('[data-act="START_QUESTION"]')?.addEventListener('click', () => sendAction({ type: 'START_QUESTION' }));
    root.querySelector('[data-act="PAUSE_MATCH"]')?.addEventListener('click', () => sendAction({ type: 'PAUSE_MATCH' }));
    root.querySelector('[data-act="RESUME_MATCH"]')?.addEventListener('click', () => sendAction({ type: 'RESUME_MATCH' }));
    root.querySelector('[data-act="JUDGE_CORRECT"]')?.addEventListener('click', () => sendAction({ type: 'JUDGE_CORRECT' }));
    root.querySelector('[data-act="JUDGE_WRONG"]')?.addEventListener('click', () => sendAction({ type: 'JUDGE_WRONG' }));
    root.querySelector('[data-act="CANCEL_SELECTION"]')?.addEventListener('click', () => sendAction({ type: 'CANCEL_SELECTION' }));
    root.querySelector('[data-act="REVEAL_ANSWER"]')?.addEventListener('click', () => sendAction({ type: 'REVEAL_ANSWER' }));
    root.querySelector('[data-act="NEXT_QUESTION"]')?.addEventListener('click', () => sendAction({ type: 'NEXT_QUESTION' }));
    root.querySelectorAll('[data-select-player]').forEach((btn) => {
      btn.addEventListener('click', () => sendAction({ type: 'SELECT_PLAYER', playerId: btn.dataset.selectPlayer }));
    });
    root.querySelector('#btn-adj-score')?.addEventListener('click', openScoreAdjustModal);
    root.querySelector('#btn-end-match')?.addEventListener('click', openEndMatchModal);
  };

  const startLiveSession = () => {
    cleanupStream?.();
    if (tickId) clearInterval(tickId);

    renderController();

    cleanupStream = connectRoomStream({
      roomCode: code,
      role: 'controller',
      token,
      onSnapshot: (incoming) => {
        snap = incoming;
        if (!busy) renderController();
      },
      onConnectionChange: (isOnline) => {
        if (online !== isOnline) {
          online = isOnline;
          if (!busy) renderController();
        }
      },
    });

    tickId = setInterval(() => {
      if (!snap || snap.match.status !== 'RUNNING') return;
      const remMs = computeRemainingMs(snap);
      const tEl = root.querySelector('[data-ctrl-timer]');
      if (tEl) {
        tEl.textContent = `${formatSeconds(remMs)}s`;
        tEl.style.color = remMs <= 5000 ? 'var(--warn)' : '#fff';
      }
    }, 80);
  };

  // Initial load: if we already have a token, verify it; otherwise show token gate
  if (!token) {
    // Check if room even exists first so 404 shows helpful message
    try {
      await apiFetch(`/api/matches/${encodeURIComponent(code)}`);
      renderTokenGate();
    } catch (err) {
      renderRoomNotFound(err.message);
    }
  } else {
    try {
      snap = await apiFetch(`/api/matches/${encodeURIComponent(code)}`, { token });
      startLiveSession();
    } catch (err) {
      if (err.status === 404) renderRoomNotFound(err.message);
      else renderTokenGate(err.message);
    }
  }

  return () => {
    if (tickId) clearInterval(tickId);
    cleanupStream?.();
  };
}
