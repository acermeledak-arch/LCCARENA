import {
  esc,
  navigate,
  showToast,
  openModal,
  closeModal,
  apiCall,
  subscribeQuery,
  getHostToken,
  saveHostToken,
  getActiveTheme,
  cycleActiveTheme,
  statusBadgeInfo,
  renderStructuredExplanationHtml,
  exportLeaderboardCsv,
} from './client.js';
import { renderQrSvg } from './qr.js';
import { renderFiguralStemHtml, renderFiguralOptionHtml } from './figural.js';

export async function renderHostScreen(root, rawCode) {
  const code = (rawCode || '').trim().toUpperCase();
  let snap = null;
  let online = true;
  let viewMode = 'leaderboard'; // 'leaderboard' | 'review'
  let hostToken = getHostToken(code);

  try {
    snap = await apiCall('matches:getHostSnapshot', { joinCode: code }, false);
    if (snap?.session?.status === 'review_open') {
      viewMode = 'review';
    }
  } catch (err) {
    root.innerHTML = `
      <div class="container">
        <div class="panel" style="text-align:center; padding:42px 24px; margin-top:48px;">
          <h1 style="margin:0 0 10px;">Sesi Tidak Ditemukan</h1>
          <p style="color:var(--text-muted); margin:0 0 22px;">${esc(err.message)}</p>
          <button class="btn btn-primary" id="err-home">Kembali ke Beranda</button>
        </div>
      </div>
    `;
    root.querySelector('#err-home')?.addEventListener('click', () => navigate('/'));
    return null;
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  function promptHostToken(onSuccess) {
    openModal(
      `
      <h2 style="margin:0 0 8px;">Otorisasi Host Sesi #${esc(code)}</h2>
      <p style="margin:0 0 14px; color:var(--text-muted); font-size:0.9rem;">
        Masukkan Token Host untuk mengelola sesi ini dari perangkat baru.
      </p>
      <div class="field">
        <label for="inp-host-tok">Token Host</label>
        <input id="inp-host-tok" class="input tabular" placeholder="HOST-XXXX-XXXX-XXXX" value="${esc(hostToken)}" />
      </div>
      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:16px;">
        <button class="btn btn-sm" id="btn-cancel-tok">Batal</button>
        <button class="btn btn-primary btn-sm" id="btn-save-tok">Verifikasi</button>
      </div>
    `,
      (mRoot) => {
        mRoot.querySelector('#btn-cancel-tok')?.addEventListener('click', closeModal);
        mRoot.querySelector('#btn-save-tok')?.addEventListener('click', async () => {
          const val = mRoot.querySelector('#inp-host-tok')?.value.trim().toUpperCase() || '';
          if (!val) return showToast('Token Host tidak boleh kosong.', 'err');
          try {
            await apiCall('matches:verifyHostToken', { joinCode: code, hostToken: val }, true);
            hostToken = val;
            saveHostToken(code, val);
            closeModal();
            showToast('Otorisasi Host berhasil.', 'ok');
            if (typeof onSuccess === 'function') onSuccess();
            else render();
          } catch (err) {
            showToast(err.message, 'err');
          }
        });
      },
    );
  }

  async function dispatchHostAction(action) {
    if (!hostToken) {
      promptHostToken(() => dispatchHostAction(action));
      return;
    }
    try {
      await apiCall(
        'matches:hostDispatch',
        {
          joinCode: code,
          hostToken,
          action,
        },
        true,
      );
      snap = await apiCall('matches:getHostSnapshot', { joinCode: code }, false);
      if (action.type === 'OPEN_REVIEW') {
        viewMode = 'review';
      }
      render();
    } catch (err) {
      if (err.message.includes('Otorisasi Host tidak valid')) {
        promptHostToken(() => dispatchHostAction(action));
        return;
      }
      showToast(err.message, 'err');
    }
  }

  function handleEndSessionClick() {
    if (!snap) return;
    const unfinishedNames = snap.participantSummary?.unfinishedNames || [];
    if (unfinishedNames.length > 0) {
      openModal(
        `
        <h2 style="margin:0 0 8px;">Konfirmasi Akhiri Sesi</h2>
        <p style="margin:0 0 12px; color:var(--text-muted); font-size:0.93rem;">
          Masih ada <strong>${unfinishedNames.length} peserta</strong> yang belum menyelesaikan seluruh paket soal:
        </p>
        <div class="card" style="max-height:160px; overflow-y:auto; margin-bottom:16px; font-size:0.9rem;">
          ${unfinishedNames.map((n) => `<span class="badge" style="margin:3px;">${esc(n)}</span>`).join(' ')}
        </div>
        <p style="margin:0 0 16px; font-size:0.88rem; color:var(--warn-text);">
          Jika sesi diakhiri sekarang, jawaban yang sudah masuk akan dikunci dan syarat pembukaan pembahasan akan langsung terpenuhi.
        </p>
        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button class="btn btn-sm" id="btn-cancel-end">Batal</button>
          <button class="btn btn-err btn-sm" id="btn-confirm-end">Akhiri Sesi &amp; Kunci Skor</button>
        </div>
      `,
        (mRoot) => {
          mRoot.querySelector('#btn-cancel-end')?.addEventListener('click', closeModal);
          mRoot.querySelector('#btn-confirm-end')?.addEventListener('click', async () => {
            closeModal();
            await dispatchHostAction({ type: 'END_SESSION', confirmUnfinished: true });
            showToast('Sesi resmi diakhiri.', 'ok');
          });
        },
      );
    } else {
      dispatchHostAction({ type: 'END_SESSION', confirmUnfinished: true });
    }
  }

  function renderHeader(s, stBadge, theme) {
    const isReviewOpen = s.status === 'review_open';
    return `
      <header class="display-header">
        <div class="brand" id="host-brand-home" role="button" tabindex="0">
          <div class="brand-mark">CPNS</div>
          <div>
            <div style="font-size:1.22rem; font-weight:900;">Simulasi CPNS — ${esc(s.title)}</div>
            <div style="font-size:0.82rem; color:var(--text-muted);">
              Kode Sesi: <strong>#${esc(s.joinCode)}</strong> • ${s.totalQuestions} Soal TIU (Opsi A–E) • Skor Maks: ${s.maxPossibleScore}
            </div>
          </div>
        </div>
        <div class="display-meta">
          <span class="badge ${stBadge.cls}">${esc(stBadge.label)}</span>
          <span class="badge">
            <span class="dot ${online ? 'dot-online' : 'dot-offline'}" data-conn-dot></span>
            <span data-conn-text>${online ? 'REALTIME AKTIF' : 'MENYAMBUNG ULANG'}</span>
          </span>
          ${
            isReviewOpen
              ? `<button class="btn btn-sm ${viewMode === 'review' ? 'btn-cyan' : 'btn-primary'}" id="btn-switch-mode">
                  ${viewMode === 'review' ? '📊 Lihat Live Leaderboard' : '📖 Ke Mode Pembahasan'}
                </button>`
              : ''
          }
          <button class="btn btn-sm" id="btn-theme" title="Ganti Tema Tampilan">${theme.icon} ${esc(theme.label)}</button>
          <button class="btn btn-sm" id="btn-export-csv" title="Unduh Hasil CSV">⬇ CSV</button>
          <button class="btn btn-sm" id="btn-fs" title="Layar Penuh">⛶</button>
        </div>
      </header>
    `;
  }

  function renderReviewMode(s, stBadge, theme) {
    const rev = snap.review;
    if (!rev || !Array.isArray(rev.questions) || rev.questions.length === 0) {
      return `
        <div class="display-shell">
          ${renderHeader(s, stBadge, theme)}
          <div class="panel">Data pembahasan sedang dimuat...</div>
        </div>
      `;
    }

    const curIdx = Math.max(0, Math.min(rev.questions.length - 1, rev.currentIndex || 0));
    const q = rev.questions[curIdx];

    return `
      <div class="display-shell" style="grid-template-rows: auto auto 1fr;">
        ${renderHeader(s, stBadge, theme)}

        <section class="panel" style="padding:14px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <span class="badge badge-purple" style="font-size:0.95rem;">
              PEMBAHASAN ${q.sequenceNumber} DARI ${rev.totalQuestions}
            </span>
            <span class="badge badge-cyan">${esc(q.id)} • ${esc(q.category)} — ${esc(q.subIndicator)}</span>
            <span class="badge">Dijawab oleh ${q.totalAnswered} peserta</span>
          </div>

          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-sm" id="btn-rev-prev" ${curIdx <= 0 ? 'disabled' : ''}>← Sebelumnya</button>
            <select id="sel-rev-jump" class="input tabular" style="min-height:40px; padding:6px 12px; width:auto;">
              ${rev.questions
                .map(
                  (item, idx) =>
                    `<option value="${idx}" ${idx === curIdx ? 'selected' : ''}>Soal #${item.sequenceNumber} (${esc(item.subIndicator)})</option>`,
                )
                .join('')}
            </select>
            <button class="btn btn-sm btn-primary" id="btn-rev-next" ${curIdx >= rev.questions.length - 1 ? 'disabled' : ''}>Berikutnya →</button>
          </div>
        </section>

        <div class="host-review-grid">
          <section class="question-stage" style="justify-content:flex-start;">
            <p class="question-text ${q.question.length > 150 ? 'long' : ''}">${esc(q.question)}</p>
            ${q.figural ? renderFiguralStemHtml(q.figural) : ''}

            <div class="options-grid options-grid-5">
              ${['A', 'B', 'C', 'D', 'E']
                .map((key) => {
                  const isCorrect = q.correctOption === key;
                  const count = q.optionCounts?.[key] ?? 0;
                  return `
                    <div class="option-tile ${isCorrect ? 'correct' : ''}">
                      <div class="option-key">${key}</div>
                      <div style="flex:1;">
                        ${q.figural ? renderFiguralOptionHtml(q.figural, key, esc(q.options[key])) : esc(q.options[key])}
                      </div>
                      <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                        ${isCorrect ? `<span class="badge badge-ok">✓ KUNCI BENAR</span>` : ''}
                        <span class="badge tabular" style="font-size:0.75rem;">${count} peserta</span>
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </section>

          <section style="overflow-y:auto;">
            ${renderStructuredExplanationHtml(q)}
          </section>
        </div>
      </div>
    `;
  }

  function renderLeaderboardMode(s, stBadge, theme) {
    const joinUrl = `${window.location.origin}/join/${encodeURIComponent(s.joinCode)}`;
    const qrSvg = renderQrSvg(joinUrl);
    const pSum = snap.participantSummary || { total: 0, finishedCount: 0, workingCount: 0 };
    const lb = snap.leaderboard || [];

    return `
      <div class="display-shell" style="grid-template-rows: auto 1fr;">
        ${renderHeader(s, stBadge, theme)}

        <div class="host-main-grid">
          <!-- Left Column: QR Join & Host Session Controls -->
          <aside class="panel" style="display:flex; flex-direction:column; justify-content:space-between; gap:16px;">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <span style="font-weight:800; font-size:1.02rem;">Akses Bergabung Peserta</span>
                <span class="badge ${s.joinOpen ? 'badge-ok' : 'badge-err'}">
                  ${s.joinOpen ? 'QR TERBUKA' : 'QR DITUTUP'}
                </span>
              </div>

              ${
                s.joinOpen
                  ? `
                  <div class="qr-box" style="width:210px; height:210px; margin-bottom:12px;">
                    ${qrSvg}
                  </div>
                `
                  : `
                  <div class="card" style="text-align:center; padding:26px 14px; margin-bottom:12px; color:var(--text-muted);">
                    Akses peserta baru sedang ditutup oleh Host.
                  </div>
                `
              }

              <div class="card" style="text-align:center; padding:12px; margin-bottom:12px;">
                <div style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">KODE SESI PESERTA</div>
                <div class="tabular" style="font-size:2.2rem; font-weight:900; letter-spacing:0.12em; color:var(--accent-cyan); line-height:1.15;">
                  ${esc(s.joinCode)}
                </div>
                <div style="font-size:0.78rem; color:var(--text-muted); word-break:break-all; margin-top:4px;">
                  ${esc(joinUrl)}
                </div>
              </div>

              <div class="grid-3" style="gap:8px; text-align:center; margin-bottom:14px;">
                <div class="card" style="padding:10px 6px;">
                  <div class="tabular" style="font-size:1.45rem; font-weight:900;">${pSum.total}</div>
                  <div style="font-size:0.74rem; color:var(--text-muted);">Terdaftar</div>
                </div>
                <div class="card" style="padding:10px 6px;">
                  <div class="tabular" style="font-size:1.45rem; font-weight:900; color:var(--accent-cyan);">${pSum.workingCount}</div>
                  <div style="font-size:0.74rem; color:var(--text-muted);">Mengerjakan</div>
                </div>
                <div class="card" style="padding:10px 6px;">
                  <div class="tabular" style="font-size:1.45rem; font-weight:900; color:var(--ok);">${pSum.finishedCount}</div>
                  <div style="font-size:0.74rem; color:var(--text-muted);">Selesai</div>
                </div>
              </div>
            </div>

            <!-- Host Controls -->
            <div style="display:flex; flex-direction:column; gap:10px; border-top:1px solid var(--border); padding-top:14px;">
              <div style="font-size:0.82rem; font-weight:800; color:var(--text-muted); letter-spacing:0.04em;">
                KONTROL PENGELOLA SESI
              </div>

              ${
                s.status === 'waiting'
                  ? `<button class="btn btn-ok btn-block" id="btn-start-session">▶ Mulai Sesi Drilling</button>`
                  : ''
              }

              ${
                s.status === 'waiting' || s.status === 'in_progress'
                  ? `
                  <button class="btn btn-sm btn-block" id="btn-toggle-join">
                    ${s.joinOpen ? '🔒 Tutup Akses Peserta Baru' : '🔓 Buka Akses Peserta Baru'}
                  </button>
                  <button class="btn btn-warn btn-sm btn-block" id="btn-end-session">
                    ⏹ Akhiri Sesi
                  </button>
                `
                  : ''
              }

              <!-- Gate Pembahasan (Bagian F.5) -->
              <div class="card" style="padding:12px;">
                <div style="font-weight:800; font-size:0.88rem; margin-bottom:6px;">
                  Status Pembahasan Kelas
                </div>
                ${
                  s.status === 'review_open'
                    ? `
                    <div style="font-size:0.8rem; color:var(--ok-text); margin-bottom:8px;">
                      Pembahasan telah dibuka untuk kelas dan perangkat peserta.
                    </div>
                    <button class="btn btn-primary btn-block" id="btn-open-review">
                      📖 Buka Layar Pembahasan
                    </button>
                  `
                    : s.canOpenReview
                      ? `
                      <div style="font-size:0.8rem; color:var(--ok-text); margin-bottom:8px;">
                        Seluruh peserta selesai atau sesi telah ditutup. Pembahasan siap dibuka!
                      </div>
                      <button class="btn btn-primary btn-block" id="btn-open-review">
                        📖 Buka Pembahasan
                      </button>
                    `
                      : `
                      <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:8px;">
                        Pembahasan akan tersedia setelah seluruh peserta menyelesaikan simulasi atau Host mengakhiri sesi.
                      </div>
                      <button class="btn btn-sm btn-block" disabled>
                        🔒 Buka Pembahasan (Terkunci)
                      </button>
                    `
                }
              </div>
            </div>
          </aside>

          <!-- Right Column: Live Leaderboard -->
          <main class="panel" style="display:flex; flex-direction:column; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
              <div>
                <h2 style="margin:0; font-size:1.38rem;">Live Score &amp; Leaderboard</h2>
                <div style="font-size:0.85rem; color:var(--text-muted);">
                  Diperbarui secara langsung saat peserta mengirim jawaban (Benar +${s.settings.pointsCorrect}, Salah ${s.settings.pointsWrong}, Kosong ${s.settings.pointsBlank}).
                </div>
              </div>
              <div style="display:flex; gap:8px; align-items:center;">
                <span class="badge badge-cyan">${pSum.finishedCount} / ${pSum.total} Peserta Selesai</span>
              </div>
            </div>

            ${
              lb.length === 0
                ? `
                <div class="card" style="flex:1; display:grid; place-items:center; text-align:center; padding:48px 20px;">
                  <div>
                    <div style="font-size:2.4rem; margin-bottom:8px;">📱</div>
                    <h3 style="margin:0 0 6px;">Menunggu Peserta Bergabung</h3>
                    <p style="margin:0; color:var(--text-muted); max-width:460px;">
                      Minta peserta memindai <strong>QR Code</strong> di samping atau membuka <strong>${esc(window.location.origin)}</strong> lalu memasukkan kode <strong>#${esc(s.joinCode)}</strong>.
                    </p>
                  </div>
                </div>
              `
                : `
                <div class="leaderboard-table-wrap">
                  <table class="leaderboard-table tabular">
                    <thead>
                      <tr>
                        <th style="width:92px;">Peringkat</th>
                        <th>Nama Peserta</th>
                        <th>Status / Progres</th>
                        <th style="text-align:right;">Benar</th>
                        <th style="text-align:right;">Salah</th>
                        <th style="text-align:right;">Belum Dijawab</th>
                        <th style="text-align:right;">Akurasi</th>
                        <th style="text-align:right;">Skor</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${lb
                        .map((row) => {
                          const medal =
                            row.rank === 1 && row.answeredCount > 0
                              ? '🥇'
                              : row.rank === 2 && row.answeredCount > 0
                                ? '🥈'
                                : row.rank === 3 && row.answeredCount > 0
                                  ? '🥉'
                                  : '';
                          return `
                            <tr class="${row.rank === 1 && row.answeredCount > 0 ? 'lb-row-top' : ''}">
                              <td>
                                <span class="badge ${row.rank === 1 && row.answeredCount > 0 ? 'badge-warn' : 'badge-cyan'}">
                                  ${medal} #${row.rank}${row.isTied ? ' (SERI)' : ''}
                                </span>
                              </td>
                              <td style="font-weight:800; font-size:1.05rem;">${esc(row.displayName)}</td>
                              <td>
                                <span class="badge ${row.status === 'finished' ? 'badge-ok' : ''}">
                                  ${
                                    row.status === 'finished'
                                      ? `✓ Selesai (${row.answeredCount}/${s.totalQuestions})`
                                      : `${row.answeredCount} / ${s.totalQuestions} soal`
                                  }
                                </span>
                              </td>
                              <td style="text-align:right; font-weight:700; color:var(--ok-text);">${row.correctCount}</td>
                              <td style="text-align:right; font-weight:700; color:var(--err-text);">${row.wrongCount}</td>
                              <td style="text-align:right; color:var(--text-muted);">${row.unansweredCount}</td>
                              <td style="text-align:right; font-weight:700;">${row.accuracy.toFixed(1)}%</td>
                              <td style="text-align:right; font-size:1.25rem; font-weight:900; color:var(--heading);">
                                ${row.score}
                              </td>
                            </tr>
                          `;
                        })
                        .join('')}
                    </tbody>
                  </table>
                </div>
              `
            }
          </main>
        </div>
      </div>
    `;
  }

  function render() {
    if (!snap) return;
    const s = snap.session;
    const stBadge = statusBadgeInfo(s.status);
    const theme = getActiveTheme();

    if (viewMode === 'review' && s.status === 'review_open') {
      root.innerHTML = renderReviewMode(s, stBadge, theme);
    } else {
      root.innerHTML = renderLeaderboardMode(s, stBadge, theme);
    }

    root.querySelector('#host-brand-home')?.addEventListener('click', () => navigate('/'));
    root.querySelector('#btn-theme')?.addEventListener('click', () => {
      cycleActiveTheme();
      render();
    });
    root.querySelector('#btn-fs')?.addEventListener('click', toggleFullscreen);
    root.querySelector('#btn-export-csv')?.addEventListener('click', () => exportLeaderboardCsv(snap));

    root.querySelector('#btn-switch-mode')?.addEventListener('click', () => {
      viewMode = viewMode === 'review' ? 'leaderboard' : 'review';
      render();
    });

    root.querySelector('#btn-start-session')?.addEventListener('click', () => {
      dispatchHostAction({ type: 'START_SESSION' });
    });

    root.querySelector('#btn-toggle-join')?.addEventListener('click', () => {
      dispatchHostAction({ type: 'TOGGLE_JOIN', joinOpen: !s.joinOpen });
    });

    root.querySelector('#btn-end-session')?.addEventListener('click', handleEndSessionClick);

    root.querySelector('#btn-open-review')?.addEventListener('click', () => {
      if (s.status === 'review_open') {
        viewMode = 'review';
        render();
      } else {
        dispatchHostAction({ type: 'OPEN_REVIEW' });
      }
    });

    // Review navigation controls
    const rev = snap.review;
    if (rev) {
      const curIdx = rev.currentIndex || 0;
      root.querySelector('#btn-rev-prev')?.addEventListener('click', () => {
        if (curIdx > 0) {
          dispatchHostAction({ type: 'SET_REVIEW_QUESTION', index: curIdx - 1 });
        }
      });
      root.querySelector('#btn-rev-next')?.addEventListener('click', () => {
        if (curIdx < rev.questions.length - 1) {
          dispatchHostAction({ type: 'SET_REVIEW_QUESTION', index: curIdx + 1 });
        }
      });
      root.querySelector('#sel-rev-jump')?.addEventListener('change', (e) => {
        dispatchHostAction({ type: 'SET_REVIEW_QUESTION', index: Number(e.target.value) });
      });
    }
  }

  render();

  const unsubscribe = subscribeQuery(
    'matches:getHostSnapshot',
    { joinCode: code },
    {
      onData: (incoming) => {
        const wasReview = snap?.session?.status === 'review_open';
        snap = incoming;
        if (!wasReview && incoming.session.status === 'review_open') {
          viewMode = 'review';
        }
        render();
      },
      onConnectionChange: (isOnline) => {
        online = isOnline;
        const dot = root.querySelector('[data-conn-dot]');
        const txt = root.querySelector('[data-conn-text]');
        if (dot) dot.className = `dot ${online ? 'dot-online' : 'dot-offline'}`;
        if (txt) txt.textContent = online ? 'REALTIME AKTIF' : 'MENYAMBUNG ULANG';
      },
    },
  );

  return () => {
    unsubscribe();
  };
}
