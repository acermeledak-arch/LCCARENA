import {
  esc,
  navigate,
  showToast,
  apiCall,
  fetchBankSummary,
  saveHostToken,
  getActiveTheme,
  cycleActiveTheme,
  statusBadgeInfo,
} from './client.js';

function brandHeader(rightActionsHtml = '') {
  const theme = getActiveTheme();
  return `
    <header class="topbar">
      <div class="brand" id="nav-home" role="button" tabindex="0">
        <div class="brand-mark">CPNS</div>
        <div>
          <div style="font-size:1.18rem; font-weight:900;">Simulasi CPNS</div>
          <div style="font-size:0.78rem; color:var(--text-muted); font-weight:600;">
            Drilling CAT TIU SKD • Live Scoring &amp; Pembahasan Terstruktur
          </div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
        <button type="button" class="btn btn-sm" id="btn-theme-toggle" title="Ganti Tema Tampilan">
          ${theme.icon} ${esc(theme.label)}
        </button>
        ${rightActionsHtml}
      </div>
    </header>
  `;
}

function wireHeaderEvents(root, rerender) {
  root.querySelector('#nav-home')?.addEventListener('click', () => navigate('/'));
  root.querySelector('#btn-theme-toggle')?.addEventListener('click', () => {
    cycleActiveTheme();
    if (typeof rerender === 'function') rerender();
  });
}

// ============================================================================
// 1. BERANDA (/)
// ============================================================================
export async function renderHomeView(root) {
  let bank = null;

  const paint = () => {
    root.innerHTML = `
      <div class="container">
        ${brandHeader(`<button class="btn btn-sm" id="btn-go-sessions">📋 Daftar Sesi</button>`)}

        <div class="grid-2" style="margin-bottom:22px; align-items:stretch;">
          <section class="panel" style="display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <span class="badge badge-cyan" style="margin-bottom:12px;">SKD CPNS • TES INTELEGENSIA UMUM (TIU)</span>
              <h1 style="font-size:clamp(1.65rem, 2.8vw, 2.25rem); margin:0 0 10px; line-height:1.22;">
                Simulasi CPNS Serentak dengan Live Score Realtime
              </h1>
              <p style="color:var(--text-muted); margin:0 0 20px; font-size:0.98rem;">
                Buka sesi drilling TIU CPNS untuk seluruh peserta di kelas tanpa batas kuota. Peserta bergabung melalui <strong>QR Code</strong> di layar masing-masing (5 opsi A–E, benar +5, tanpa timer hitung mundur), sementara layar utama menampilkan <strong>Live Leaderboard</strong> dan <strong>Mode Pembahasan 8 Langkah</strong>.
              </p>
            </div>
            <div style="display:flex; gap:12px; flex-wrap:wrap;">
              <button class="btn btn-primary btn-xl" id="btn-new-session">+ Buat Sesi Drilling Baru</button>
              <button class="btn" id="btn-open-sessions">Riwayat Sesi</button>
            </div>
          </section>

          <section class="panel" style="display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <h2 style="margin:0 0 8px; font-size:1.25rem;">Masuk ke Sesi Aktif</h2>
              <p style="margin:0 0 16px; color:var(--text-muted); font-size:0.92rem;">
                Masukkan 6 karakter kode sesi untuk mengerjakan soal dari ponsel atau membuka layar Live Score Host.
              </p>
              <div class="field">
                <label for="inp-join-code">Kode Sesi</label>
                <input
                  id="inp-join-code"
                  class="input tabular"
                  maxlength="10"
                  placeholder="Contoh: 7K9P2M"
                  style="font-size:1.35rem; font-weight:800; letter-spacing:0.12em; text-transform:uppercase; text-align:center;"
                />
              </div>
            </div>
            <div class="grid-2" style="gap:10px;">
              <button class="btn btn-cyan" id="btn-join-participant">📱 Masuk sebagai Peserta</button>
              <button class="btn" id="btn-join-host">🖥️ Buka Layar Host</button>
            </div>
          </section>
        </div>

        <section class="panel">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
            <div>
              <h2 style="margin:0 0 4px; font-size:1.2rem;">Komposisi Bank Soal Aktif — Simulasi CPNS</h2>
              <div style="font-size:0.88rem; color:var(--text-muted);">
                Berbasis kisi-kisi kompetensi TIU SKD CPNS (Verbal, Numerik, dan Figural SVG) • Pilihan ganda 5 opsi A–E.
              </div>
            </div>
            <span class="badge badge-purple" id="bank-badge">
              ${bank ? `${bank.subIndicators.length} Subindikator • ${bank.totalQuestions} Soal TIU` : 'Memuat bank soal...'}
            </span>
          </div>

          <div class="grid-3" id="bank-list">
            ${
              bank
                ? bank.subIndicators
                    .map(
                      (sub) => `
                  <div class="card" style="padding:13px 15px;">
                    <div style="font-size:0.76rem; color:var(--accent-cyan); font-weight:800;">
                      ${esc(sub.id)} • ${esc(sub.category)}
                    </div>
                    <div style="font-weight:800; font-size:1.02rem; margin:4px 0;">
                      ${esc(sub.subIndicator)}
                    </div>
                    <div style="font-size:0.84rem; color:var(--text-muted);">
                      ${esc(sub.questionCount)} soal latihan • Opsi A–E
                    </div>
                  </div>
                `,
                    )
                    .join('')
                : `<div class="card">Menyiapkan 105 soal TIU CPNS...</div>`
            }
          </div>
        </section>
      </div>
    `;

    wireHeaderEvents(root, paint);
    root.querySelector('#btn-go-sessions')?.addEventListener('click', () => navigate('/sessions'));
    root.querySelector('#btn-open-sessions')?.addEventListener('click', () => navigate('/sessions'));
    root.querySelector('#btn-new-session')?.addEventListener('click', () => navigate('/setup'));

    const getCode = () =>
      root.querySelector('#inp-join-code')?.value.trim().toUpperCase() || '';

    root.querySelector('#btn-join-participant')?.addEventListener('click', () => {
      const code = getCode();
      if (!code) return showToast('Masukkan kode sesi terlebih dahulu.', 'err');
      navigate(`/join/${encodeURIComponent(code)}`);
    });

    root.querySelector('#btn-join-host')?.addEventListener('click', () => {
      const code = getCode();
      if (!code) return showToast('Masukkan kode sesi terlebih dahulu.', 'err');
      navigate(`/host/${encodeURIComponent(code)}`);
    });
  };

  paint();

  try {
    bank = await fetchBankSummary();
    paint();
  } catch (err) {
    showToast(err.message, 'err');
  }
}

// ============================================================================
// 2. BUAT SESI DRILLING BARU (/setup)
// ============================================================================
export async function renderSetupView(root) {
  root.innerHTML = `<div class="container">${brandHeader()}<div class="panel">Memuat bank soal TIU CPNS...</div></div>`;
  wireHeaderEvents(root);

  let bank = { subIndicators: [], totalQuestions: 105, pool: [] };
  try {
    bank = await fetchBankSummary();
  } catch (err) {
    showToast(err.message, 'err');
  }

  const paint = () => {
    root.innerHTML = `
      <div class="container">
        ${brandHeader(`<button class="btn btn-sm" id="btn-back-home">← Beranda</button>`)}

        <form class="panel" id="setup-form" novalidate>
          <h1 style="margin:0 0 6px; font-size:1.55rem;">Buat Sesi Simulasi CPNS</h1>
          <p style="margin:0 0 22px; color:var(--text-muted); font-size:0.95rem;">
            Atur nama sesi, cakupan subindikator TIU, dan jumlah soal. Setelah sesi dibuat, tampilkan QR Code di layar utama agar seluruh peserta dapat bergabung dari ponsel masing-masing.
          </p>

          <h2 style="font-size:1.06rem; margin:0 0 10px;">1. Identitas Sesi / Kelas</h2>
          <div class="field" style="margin-bottom:20px;">
            <label for="inp-session-title">Nama Sesi atau Nama Kelas</label>
            <input
              id="inp-session-title"
              class="input"
              maxlength="80"
              required
              value="Simulasi SKD — TIU CPNS"
              placeholder="Contoh: Drilling TIU CPNS — Kelas A"
            />
          </div>

          <h2 style="font-size:1.06rem; margin:0 0 10px;">2. Pilih Kelompok &amp; Subindikator TIU</h2>
          <div class="card" style="margin-bottom:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
              <div style="font-weight:700; font-size:0.94rem;">
                Pilih subindikator yang akan diujikan dalam sesi ini:
              </div>
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button type="button" class="btn btn-sm" data-filter-cat="ALL">Pilih Semua (105)</button>
                <button type="button" class="btn btn-sm" data-filter-cat="TIU Verbal">Hanya Verbal (35)</button>
                <button type="button" class="btn btn-sm" data-filter-cat="TIU Numerik">Hanya Numerik (45)</button>
                <button type="button" class="btn btn-sm" data-filter-cat="TIU Figural">Hanya Figural (25)</button>
                <button type="button" class="btn btn-sm" data-filter-cat="NONE">Kosongkan</button>
              </div>
            </div>

            <div class="ind-grid" id="sub-checkboxes">
              ${bank.subIndicators
                .map(
                  (sub) => `
                  <label class="check-card" data-cat="${esc(sub.category)}">
                    <input type="checkbox" name="sub" value="${esc(sub.id)}" checked />
                    <div>
                      <div style="font-size:0.75rem; color:var(--accent-cyan); font-weight:800;">
                        ${esc(sub.category)}
                      </div>
                      <div style="font-weight:700; font-size:0.93rem;">
                        ${esc(sub.subIndicator)}
                      </div>
                      <div style="font-size:0.8rem; color:var(--text-muted);">
                        ${esc(sub.questionCount)} soal tersedia
                      </div>
                    </div>
                  </label>
                `,
                )
                .join('')}
            </div>
          </div>

          <h2 style="font-size:1.06rem; margin:0 0 10px;">3. Jumlah Soal, Urutan &amp; Penskoran</h2>
          <div class="grid-3" style="margin-bottom:16px;">
            <div class="field">
              <label for="inp-q-count">Jumlah Soal Sesi</label>
              <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                <input
                  id="inp-q-count"
                  type="number"
                  class="input tabular"
                  min="1"
                  max="105"
                  value="35"
                  style="width:96px; font-weight:800;"
                  required
                />
                <button type="button" class="btn btn-sm q-preset" data-n="35" title="Format standar SKD TIU 35 soal">35 (SKD)</button>
                <button type="button" class="btn btn-sm q-preset" data-n="50">50</button>
                <button type="button" class="btn btn-sm q-preset" data-n="MAX">Semua</button>
              </div>
            </div>

            <div class="field">
              <label for="sel-order">Penyajian Urutan Soal</label>
              <select id="sel-order" class="input">
                <option value="sequential">Berurutan sesuai Subindikator</option>
                <option value="random" selected>Diacak Konsisten untuk Seluruh Peserta</option>
              </select>
            </div>

            <div class="field">
              <label for="inp-pts-correct">Bobot Jawaban Benar (Salah/Kosong = 0)</label>
              <input
                id="inp-pts-correct"
                type="number"
                class="input tabular"
                min="1"
                max="100"
                value="5"
                required
              />
            </div>
          </div>

          <div class="grid-2" style="margin-bottom:20px;">
            <label class="check-card">
              <input type="checkbox" id="chk-show-sub" checked />
              <div>
                <div style="font-weight:700;">Tampilkan Kategori &amp; Subindikator di Layar Peserta</div>
                <div style="font-size:0.82rem; color:var(--text-muted);">
                  Membantu peserta mengenali kelompok soal (Verbal, Numerik, atau Figural).
                </div>
              </div>
            </label>
            <label class="check-card">
              <input type="checkbox" id="chk-allow-change" />
              <div>
                <div style="font-weight:700;">Izinkan Peserta Mengubah Jawaban Sebelum Selesai</div>
                <div style="font-size:0.82rem; color:var(--text-muted);">
                  Rekomendasi default tidak dicentang (jawaban langsung terkunci setelah dikirim).
                </div>
              </div>
            </label>
          </div>

          <div
            id="setup-err"
            class="card"
            style="display:none; border-color:var(--err); background:var(--err-bg); color:var(--err-text); font-weight:700; margin-bottom:14px;"
          ></div>

          <div
            style="display:flex; justify-content:space-between; align-items:center; gap:14px; flex-wrap:wrap; padding-top:14px; border-top:1px solid var(--border);"
          >
            <div id="pool-summary" class="badge badge-cyan" style="font-size:0.94rem; padding:8px 16px;">
              35 dari 105 soal TIU akan digunakan • Skor Maksimum: 175
            </div>
            <button type="submit" class="btn btn-primary btn-xl" id="btn-create-session">
              Buat Sesi &amp; Tampilkan QR →
            </button>
          </div>
        </form>
      </div>
    `;

    wireHeaderEvents(root, paint);
    root.querySelector('#btn-back-home')?.addEventListener('click', () => navigate('/'));

    const form = root.querySelector('#setup-form');
    const qCountInp = root.querySelector('#inp-q-count');
    const ptsInp = root.querySelector('#inp-pts-correct');
    const poolSummary = root.querySelector('#pool-summary');
    const errBox = root.querySelector('#setup-err');

    const getSelectedSubs = () =>
      [...form.querySelectorAll('input[name="sub"]:checked')].map((el) => el.value);

    const getAvailableCount = () => {
      const subSet = new Set(getSelectedSubs());
      return (bank.pool || []).filter((q) => subSet.has(q.subIndicatorId)).length;
    };

    const syncSummary = () => {
      const available = getAvailableCount();
      let req = Math.floor(Number(qCountInp.value || 0));
      if (req > available && available > 0) {
        req = available;
        qCountInp.value = String(available);
      }
      const pts = Number(ptsInp.value || 5);
      const maxScore = Math.max(0, req * pts);
      poolSummary.textContent = `${req} dari ${available} soal tersedia akan digunakan • Skor Maksimum: ${maxScore}`;
    };

    form.querySelectorAll('input[name="sub"]').forEach((chk) => {
      chk.addEventListener('change', syncSummary);
    });
    qCountInp?.addEventListener('input', syncSummary);
    ptsInp?.addEventListener('input', syncSummary);

    form.querySelectorAll('[data-filter-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-filter-cat');
        form.querySelectorAll('.check-card[data-cat]').forEach((label) => {
          const cat = label.getAttribute('data-cat');
          const input = label.querySelector('input[name="sub"]');
          if (!input) return;
          if (mode === 'ALL') input.checked = true;
          else if (mode === 'NONE') input.checked = false;
          else input.checked = cat === mode;
        });
        const avail = getAvailableCount();
        if (avail > 0) {
          qCountInp.value = String(Math.min(35, avail));
        }
        syncSummary();
      });
    });

    form.querySelectorAll('.q-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        const avail = getAvailableCount();
        const raw = btn.getAttribute('data-n');
        if (raw === 'MAX') {
          qCountInp.value = String(avail);
        } else {
          qCountInp.value = String(Math.min(Number(raw), avail));
        }
        syncSummary();
      });
    });

    syncSummary();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errBox.style.display = 'none';
      const btn = root.querySelector('#btn-create-session');
      btn.disabled = true;

      try {
        const subIndicatorIds = getSelectedSubs();
        if (subIndicatorIds.length === 0) {
          throw new Error('Pilih minimal satu subindikator TIU.');
        }

        const created = await apiCall(
          'matches:createSession',
          {
            title: root.querySelector('#inp-session-title').value,
            subIndicatorIds,
            questionCount: Number(qCountInp.value),
            order: root.querySelector('#sel-order').value,
            pointsCorrect: Number(ptsInp.value),
            pointsWrong: 0,
            pointsBlank: 0,
            showSubIndicator: root.querySelector('#chk-show-sub').checked,
            allowAnswerChange: root.querySelector('#chk-allow-change').checked,
          },
          true,
        );

        saveHostToken(created.joinCode, created.hostToken);
        navigate(`/host/${encodeURIComponent(created.joinCode)}`);
      } catch (err) {
        errBox.textContent = err.message;
        errBox.style.display = 'block';
        btn.disabled = false;
      }
    });
  };

  paint();
}

// ============================================================================
// 3. DAFTAR & RIWAYAT SESI (/sessions)
// ============================================================================
export async function renderSessionsListView(root) {
  let items = [];
  let loading = true;

  const paint = () => {
    root.innerHTML = `
      <div class="container">
        ${brandHeader(`
          <button class="btn btn-sm" id="btn-back-home">← Beranda</button>
          <button class="btn btn-primary btn-sm" id="btn-new-session">+ Sesi Baru</button>
        `)}

        <section class="panel">
          <h1 style="margin:0 0 6px; font-size:1.45rem;">Daftar Sesi Simulasi CPNS</h1>
          <p style="margin:0 0 18px; color:var(--text-muted); font-size:0.92rem;">
            Buka kembali layar Host Live Score, masuk sebagai peserta, atau kelola sesi yang telah dibuat.
          </p>

          ${
            loading
              ? `<div class="card">Memuat daftar sesi...</div>`
              : items.length === 0
                ? `<div class="card" style="text-align:center; padding:28px;">Belum ada sesi simulasi. Klik <strong>+ Sesi Baru</strong> untuk memulai.</div>`
                : `<div style="display:flex; flex-direction:column; gap:12px;">
                    ${items
                      .map((item) => {
                        const st = statusBadgeInfo(item.status);
                        const dt = new Date(item.createdAt).toLocaleString('id-ID');
                        return `
                          <div class="card" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                            <div>
                              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px;">
                                <span class="badge badge-cyan tabular">#${esc(item.joinCode)}</span>
                                <span class="badge ${st.cls}">${esc(st.label)}</span>
                                <span class="badge">${esc(item.questionCount)} Soal TIU</span>
                              </div>
                              <div style="font-weight:800; font-size:1.08rem;">${esc(item.title)}</div>
                              <div style="font-size:0.82rem; color:var(--text-muted);">
                                Dibuat: ${esc(dt)} • Peserta selesai: <strong>${item.finishedCount} / ${item.participantCount}</strong>
                              </div>
                            </div>
                            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                              <button class="btn btn-sm btn-primary" data-open-host="${esc(item.joinCode)}">🖥️ Layar Host</button>
                              <button class="btn btn-sm btn-cyan" data-open-play="${esc(item.joinCode)}">📱 Halaman Peserta</button>
                              <button class="btn btn-sm btn-err" data-del-session="${esc(item.joinCode)}">Hapus</button>
                            </div>
                          </div>
                        `;
                      })
                      .join('')}
                  </div>`
          }
        </section>
      </div>
    `;

    wireHeaderEvents(root, paint);
    root.querySelector('#btn-back-home')?.addEventListener('click', () => navigate('/'));
    root.querySelector('#btn-new-session')?.addEventListener('click', () => navigate('/setup'));

    root.querySelectorAll('[data-open-host]').forEach((btn) => {
      btn.addEventListener('click', () =>
        navigate(`/host/${encodeURIComponent(btn.getAttribute('data-open-host'))}`),
      );
    });
    root.querySelectorAll('[data-open-play]').forEach((btn) => {
      btn.addEventListener('click', () =>
        navigate(`/join/${encodeURIComponent(btn.getAttribute('data-open-play'))}`),
      );
    });
    root.querySelectorAll('[data-del-session]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const code = btn.getAttribute('data-del-session');
        try {
          await apiCall('matches:deleteSession', { joinCode: code }, true);
          items = items.filter((x) => x.joinCode !== code);
          showToast(`Sesi #${code} berhasil dihapus.`, 'ok');
          paint();
        } catch (err) {
          showToast(err.message, 'err');
        }
      });
    });
  };

  paint();

  try {
    items = await apiCall('matches:listSessions', {}, false);
    loading = false;
    paint();
  } catch (err) {
    loading = false;
    showToast(err.message, 'err');
    paint();
  }
}
