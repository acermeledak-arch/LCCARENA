import {
  esc,
  formatDateTime,
  modeLabel,
  apiFetch,
  saveRoomToken,
  loadRoomToken,
  connectRoomStream,
  showToast,
  openModal,
  closeModal,
  navigate,
} from './client.js';
import { renderQrSvg } from './qr.js';

function brandHeader(rightHtml = '') {
  return `
    <header class="topbar">
      <div class="brand" id="nav-home" role="button" tabindex="0">
        <div class="brand-mark">LCC</div>
        <div>
          <div>LCC ARENA</div>
          <div style="font-size:0.74rem; font-weight:600; color:var(--text-muted); letter-spacing:0.02em;">
            Literacy &amp; Numeracy Competition Arena • Kelas VII
          </div>
        </div>
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">${rightHtml}</div>
    </header>
  `;
}

// ============================================================================
// 1. BERANDA (/)
// ============================================================================
export async function renderHomeView(root) {
  root.innerHTML = `
    <div class="container">
      ${brandHeader(`
        <button class="btn btn-sm" id="btn-go-history">📋 Riwayat Pertandingan</button>
        <button class="btn btn-sm btn-primary" id="btn-go-setup-top">+ Buat Pertandingan</button>
      `)}

      <section class="panel" style="padding:32px 28px; margin-bottom:22px; background:linear-gradient(135deg, #111c38 0%, #0b1224 65%, #131b3a 100%);">
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px;">
          <span class="badge badge-cyan">SMP KELAS VII</span>
          <span class="badge badge-purple">39 SOAL • 13 INDIKATOR</span>
          <span class="badge badge-ok">REALTIME IFP + HP</span>
        </div>
        <h1 style="font-size:clamp(1.85rem, 3.6vw, 2.8rem); margin:0 0 12px; line-height:1.18;">
          Arena Simulasi Lomba Cerdas Cermat Numerasi
        </h1>
        <p style="color:var(--text-muted); font-size:1.06rem; max-width:720px; margin:0 0 26px;">
          Tampilkan papan skor dan soal layar penuh di <strong>IFP / Proyektor</strong>, lalu kendalikan jalannya lomba, timer, dan penilaian secara langsung dari <strong>Smartphone Guru/Operator</strong> tanpa alat buzzer tambahan.
        </p>
        <div style="display:flex; gap:14px; flex-wrap:wrap;">
          <button class="btn btn-primary btn-xl" id="btn-go-setup">🚀 Buat Pertandingan Baru</button>
          <button class="btn btn-xl" id="btn-go-history-hero">🏆 Riwayat Pertandingan</button>
        </div>
      </section>

      <div class="grid-2" style="margin-bottom:22px;">
        <section class="panel">
          <h2 style="margin:0 0 12px; font-size:1.18rem;">Gabung Cepat ke Ruang Aktif</h2>
          <p style="color:var(--text-muted); font-size:0.92rem; margin:0 0 14px;">
            Masukkan Kode Ruang 6 karakter untuk membuka Layar Display (IFP) atau Mobile Controller (HP).
          </p>
          <div class="field">
            <label for="quick-room-code">Kode Ruang</label>
            <input id="quick-room-code" class="input tabular" maxlength="8" placeholder="Contoh: K7M9P2" style="text-transform:uppercase; font-weight:800; letter-spacing:0.1em;" />
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button class="btn btn-cyan" id="btn-join-display" style="flex:1;">📺 Buka Display</button>
            <button class="btn" id="btn-join-ctrl" style="flex:1;">📱 Buka Controller</button>
          </div>
        </section>

        <section class="panel">
          <h2 style="margin:0 0 12px; font-size:1.18rem;">Aturan Resmi Permainan</h2>
          <ul style="margin:0; padding-left:20px; color:#cbd5e1; display:grid; gap:7px; font-size:0.95rem;">
            <li><strong>3 Peserta</strong> menjawab secara lisan setelah mengangkat tangan dan dipilih operator.</li>
            <li>Waktu awal <strong>20 detik/soal</strong>; timer otomatis <strong>membeku</strong> saat peserta menjawab.</li>
            <li>Jawaban <strong>BENAR: +10 poin</strong> (soal selesai). Jawaban <strong>SALAH: 0 poin</strong> (tanpa minus).</li>
            <li>Jika salah dan masih ada peserta lain, timer <strong>melanjutkan sisa waktu</strong> (tidak kembali ke 20 detik).</li>
          </ul>
        </section>
      </div>

      <section class="panel" id="bank-overview">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
          <h2 style="margin:0; font-size:1.15rem;">Cakupan Kisi-Kisi Bank Soal Numerasi</h2>
          <span class="badge badge-cyan" id="bank-badge">Memuat bank soal...</span>
        </div>
        <div id="bank-list" class="grid-3" style="margin-top:14px;"></div>
      </section>
    </div>
  `;

  root.querySelector('#nav-home')?.addEventListener('click', () => navigate('/'));
  root.querySelector('#btn-go-setup')?.addEventListener('click', () => navigate('/setup'));
  root.querySelector('#btn-go-setup-top')?.addEventListener('click', () => navigate('/setup'));
  root.querySelector('#btn-go-history')?.addEventListener('click', () => navigate('/history'));
  root.querySelector('#btn-go-history-hero')?.addEventListener('click', () => navigate('/history'));

  const getJoinCode = () => root.querySelector('#quick-room-code')?.value.trim().toUpperCase() || '';
  root.querySelector('#btn-join-display')?.addEventListener('click', () => {
    const code = getJoinCode();
    if (!code) return showToast('Masukkan kode ruang terlebih dahulu.', 'err');
    navigate(`/display/${encodeURIComponent(code)}`);
  });
  root.querySelector('#btn-join-ctrl')?.addEventListener('click', () => {
    const code = getJoinCode();
    if (!code) return showToast('Masukkan kode ruang terlebih dahulu.', 'err');
    navigate(`/controller/${encodeURIComponent(code)}`);
  });

  try {
    const bank = await apiFetch('/api/bank');
    const badge = root.querySelector('#bank-badge');
    const list = root.querySelector('#bank-list');
    if (badge) badge.textContent = `${bank.indicators.length} Indikator • ${bank.totalQuestions} Soal Siap Pakai`;
    if (list) {
      list.innerHTML = bank.indicators
        .map(
          (ind) => `
          <div class="card" style="padding:12px 14px;">
            <div style="font-size:0.78rem; color:var(--accent-cyan); font-weight:700;">${esc(ind.id)} • ${esc(ind.category)}</div>
            <div style="font-weight:700; margin:3px 0 4px;">${esc(ind.topic)}</div>
            <div style="font-size:0.82rem; color:var(--text-muted);">${esc(ind.questionCount)} soal (1 Mudah, 2 Menengah)</div>
          </div>
        `,
        )
        .join('');
    }
  } catch (err) {
    showToast(err.message, 'err');
  }
}

// ============================================================================
// 2. SETUP PERTANDINGAN (/setup)
// ============================================================================
export async function renderSetupView(root) {
  root.innerHTML = `<div class="container">${brandHeader()}<div class="panel">Memuat konfigurasi bank soal...</div></div>`;
  root.querySelector('#nav-home')?.addEventListener('click', () => navigate('/'));

  let bank = { indicators: [], totalQuestions: 39 };
  try {
    bank = await apiFetch('/api/bank');
  } catch (err) {
    showToast(err.message, 'err');
  }

  root.innerHTML = `
    <div class="container">
      ${brandHeader(`<button class="btn btn-sm" id="btn-back-home">← Kembali</button>`)}

      <form class="panel" id="setup-form" novalidate>
        <h1 style="margin:0 0 6px; font-size:1.55rem;">Setup Pertandingan Baru</h1>
        <p style="margin:0 0 22px; color:var(--text-muted); font-size:0.95rem;">
          Isi nama tiga peserta dan atur mode lomba sebelum menghubungkan IFP dan Smartphone.
        </p>

        <h2 style="font-size:1.08rem; margin:0 0 12px;">1. Nama Tiga Peserta (Wajib &amp; Unik)</h2>
        <div class="grid-3" style="margin-bottom:18px;">
          <div class="field">
            <label for="p1" style="color:#60a5fa;">● Peserta 1 (Kursi Biru)</label>
            <input id="p1" class="input" required maxlength="40" placeholder="Mis. Regu A / Andi" value="Peserta 1" />
          </div>
          <div class="field">
            <label for="p2" style="color:#c084fc;">● Peserta 2 (Kursi Ungu)</label>
            <input id="p2" class="input" required maxlength="40" placeholder="Mis. Regu B / Budi" value="Peserta 2" />
          </div>
          <div class="field">
            <label for="p3" style="color:#22d3ee;">● Peserta 3 (Kursi Cyan)</label>
            <input id="p3" class="input" required maxlength="40" placeholder="Mis. Regu C / Citra" value="Peserta 3" />
          </div>
        </div>

        <h2 style="font-size:1.08rem; margin:0 0 12px;">2. Mode Permainan</h2>
        <div class="grid-3" style="margin-bottom:18px;" id="mode-cards">
          <label class="check-card">
            <input type="radio" name="mode" value="FULL" checked />
            <div>
              <div style="font-weight:800;">Full Competition</div>
              <div style="font-size:0.84rem; color:var(--text-muted);">Semua 39 soal lengkap dari 13 indikator kisi-kisi.</div>
            </div>
          </label>
          <label class="check-card">
            <input type="radio" name="mode" value="CATEGORY" />
            <div>
              <div style="font-weight:800;">Category Challenge</div>
              <div style="font-size:0.84rem; color:var(--text-muted);">Fokus latihan pada indikator dan level tertentu.</div>
            </div>
          </label>
          <label class="check-card">
            <input type="radio" name="mode" value="QUICK" />
            <div>
              <div style="font-weight:800;">Quick Match</div>
              <div style="font-size:0.84rem; color:var(--text-muted);">Pertandingan singkat (misal 5, 10, atau 15 soal).</div>
            </div>
          </label>
        </div>

        <div id="filter-section" class="card" style="display:none; margin-bottom:18px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
            <div style="font-weight:700;">Pilih Indikator Kisi-Kisi</div>
            <div style="display:flex; gap:8px;">
              <button type="button" class="btn btn-sm" id="btn-ind-all">Pilih Semua</button>
              <button type="button" class="btn btn-sm" id="btn-ind-none">Kosongkan</button>
            </div>
          </div>
          <div class="ind-grid" id="ind-checkboxes">
            ${bank.indicators
              .map(
                (ind) => `
                <label class="check-card">
                  <input type="checkbox" name="ind" value="${esc(ind.id)}" checked />
                  <div>
                    <div style="font-size:0.78rem; color:var(--accent-cyan); font-weight:700;">${esc(ind.id)} • ${esc(ind.category)}</div>
                    <div style="font-weight:600; font-size:0.9rem;">${esc(ind.topic)}</div>
                  </div>
                </label>
              `,
              )
              .join('')}
          </div>

          <div style="margin-top:14px;">
            <div style="font-weight:700; margin-bottom:8px;">Filter Level Kesulitan</div>
            <div style="display:flex; gap:12px; flex-wrap:wrap;">
              <label class="check-card" style="padding:8px 12px;">
                <input type="checkbox" name="lvl" value="1" checked />
                <span>Level 1 (Mudah)</span>
              </label>
              <label class="check-card" style="padding:8px 12px;">
                <input type="checkbox" name="lvl" value="2" checked />
                <span>Level 2 (Menengah)</span>
              </label>
              <label class="check-card" style="padding:8px 12px;">
                <input type="checkbox" name="lvl" value="3" checked />
                <span>Level 3 (Menengah)</span>
              </label>
            </div>
          </div>
        </div>

        <div id="quick-section" class="card" style="display:none; margin-bottom:18px;">
          <div class="grid-2">
            <div class="field" style="margin-bottom:0;">
              <label for="q-count">Jumlah Soal Quick Match</label>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <input id="q-count" type="number" class="input tabular" min="1" max="200" value="10" style="width:110px;" />
                <button type="button" class="btn btn-sm q-preset" data-n="5">5 Soal</button>
                <button type="button" class="btn btn-sm q-preset" data-n="10">10 Soal</button>
                <button type="button" class="btn btn-sm q-preset" data-n="15">15 Soal</button>
              </div>
            </div>
            <div style="display:flex; align-items:center;">
              <label class="check-card" style="width:100%;">
                <input type="checkbox" id="allow-repeat" />
                <div>
                  <div style="font-weight:700;">Izinkan Pengulangan Soal</div>
                  <div style="font-size:0.82rem; color:var(--text-muted);">Aktifkan hanya jika jumlah soal melebihi bank tersedia.</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <h2 style="font-size:1.08rem; margin:0 0 12px;">3. Pengaturan Timer, Skor &amp; Tampilan</h2>
        <div class="grid-3" style="margin-bottom:16px;">
          <div class="field">
            <label for="order-sel">Urutan Soal</label>
            <select id="order-sel" class="input">
              <option value="sequential">Berurutan (Sesuai Kisi-kisi)</option>
              <option value="random">Acak (Shuffle)</option>
            </select>
          </div>
          <div class="field">
            <label for="dur-inp">Durasi per Soal (detik)</label>
            <input id="dur-inp" type="number" class="input tabular" min="5" max="300" value="20" required />
          </div>
          <div class="field">
            <label for="pts-inp">Poin Jawaban Benar</label>
            <input id="pts-inp" type="number" class="input tabular" min="0" max="1000" value="10" required />
          </div>
        </div>

        <div class="grid-2" style="margin-bottom:22px;">
          <label class="check-card">
            <input type="checkbox" id="show-opts" checked />
            <div>
              <div style="font-weight:700;">Tampilkan Pilihan A–D di Layar Display</div>
              <div style="font-size:0.83rem; color:var(--text-muted);">Peserta melihat keempat opsi jawaban di IFP.</div>
            </div>
          </label>
          <label class="check-card">
            <input type="checkbox" id="allow-reveal" checked />
            <div>
              <div style="font-weight:700;">Izinkan Kunci &amp; Pembahasan Setelah Soal Selesai</div>
              <div style="font-size:0.83rem; color:var(--text-muted);">Operator dapat menekan Lihat Kunci Jawaban ke IFP usai soal berakhir.</div>
            </div>
          </label>
        </div>

        <div id="setup-err" class="card" style="display:none; border-color:var(--err); background:var(--err-bg); margin-bottom:16px; color:#fecaca; font-weight:600;"></div>

        <div style="display:flex; justify-content:space-between; align-items:center; gap:14px; flex-wrap:wrap; padding-top:12px; border-top:1px solid var(--border);">
          <div id="pool-summary" class="badge badge-cyan" style="font-size:0.92rem; padding:8px 14px;">39 soal akan dimainkan</div>
          <button type="submit" class="btn btn-primary btn-xl" id="btn-create-match">Buat Ruang Pertandingan →</button>
        </div>
      </form>
    </div>
  `;

  root.querySelector('#nav-home')?.addEventListener('click', () => navigate('/'));
  root.querySelector('#btn-back-home')?.addEventListener('click', () => navigate('/'));

  const form = root.querySelector('#setup-form');
  const filterSec = root.querySelector('#filter-section');
  const quickSec = root.querySelector('#quick-section');
  const orderSel = root.querySelector('#order-sel');
  const qCountInp = root.querySelector('#q-count');
  const poolSummary = root.querySelector('#pool-summary');
  const errBox = root.querySelector('#setup-err');

  const getSelectedMode = () => form.querySelector('input[name="mode"]:checked')?.value || 'FULL';
  const getSelectedInds = () => [...form.querySelectorAll('input[name="ind"]:checked')].map((el) => el.value);
  const getSelectedLvls = () => [...form.querySelectorAll('input[name="lvl"]:checked')].map((el) => Number(el.value));

  const syncUi = () => {
    const mode = getSelectedMode();
    filterSec.style.display = mode === 'FULL' ? 'none' : 'block';
    quickSec.style.display = mode === 'QUICK' ? 'block' : 'none';

    const indCount = mode === 'FULL' ? 13 : getSelectedInds().length;
    const lvlCount = mode === 'FULL' ? 3 : getSelectedLvls().length;
    const available = indCount * lvlCount;

    if (mode === 'QUICK') {
      const req = Number(qCountInp.value || 0);
      poolSummary.textContent = `${req} soal dimainkan (tersedia ${available} soal di bank)`;
    } else {
      poolSummary.textContent = `${available} soal akan dimainkan`;
    }
  };

  form.querySelectorAll('input[name="mode"]').forEach((r) =>
    r.addEventListener('change', () => {
      if (getSelectedMode() === 'QUICK') orderSel.value = 'random';
      else if (getSelectedMode() === 'FULL') orderSel.value = 'sequential';
      syncUi();
    }),
  );
  form.querySelectorAll('input[name="ind"], input[name="lvl"]').forEach((c) => c.addEventListener('change', syncUi));
  qCountInp?.addEventListener('input', syncUi);

  root.querySelector('#btn-ind-all')?.addEventListener('click', () => {
    form.querySelectorAll('input[name="ind"]').forEach((c) => { c.checked = true; });
    syncUi();
  });
  root.querySelector('#btn-ind-none')?.addEventListener('click', () => {
    form.querySelectorAll('input[name="ind"]').forEach((c) => { c.checked = false; });
    syncUi();
  });
  root.querySelectorAll('.q-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      qCountInp.value = btn.dataset.n;
      syncUi();
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.style.display = 'none';
    const submitBtn = root.querySelector('#btn-create-match');
    submitBtn.disabled = true;

    try {
      const mode = getSelectedMode();
      const payload = {
        players: [
          root.querySelector('#p1').value,
          root.querySelector('#p2').value,
          root.querySelector('#p3').value,
        ],
        mode,
        indicatorIds: mode === 'FULL' ? undefined : getSelectedInds(),
        levels: mode === 'FULL' ? undefined : getSelectedLvls(),
        questionCount: mode === 'QUICK' ? Number(qCountInp.value) : undefined,
        allowRepeat: mode === 'QUICK' ? root.querySelector('#allow-repeat').checked : false,
        order: orderSel.value,
        durationSeconds: Number(root.querySelector('#dur-inp').value),
        pointsCorrect: Number(root.querySelector('#pts-inp').value),
        showOptionsOnDisplay: root.querySelector('#show-opts').checked,
        allowAnswerReveal: root.querySelector('#allow-reveal').checked,
      };

      const created = await apiFetch('/api/matches', { method: 'POST', body: payload });
      saveRoomToken(created.roomCode, created.controllerToken);
      navigate(`/lobby/${encodeURIComponent(created.roomCode)}`);
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
      submitBtn.disabled = false;
    }
  });
}

// ============================================================================
// 3. OPERATOR LAUNCHPAD LOBBY (/lobby/:roomCode)
// ============================================================================
export async function renderLobbyLaunchpad(root, roomCode) {
  const code = roomCode.toUpperCase();
  const token = loadRoomToken(code);
  if (!token) {
    // Without controller token, redirect safely to read-only Display
    navigate(`/display/${encodeURIComponent(code)}`, true);
    return null;
  }

  let serverInfo = { lanOrigins: [] };
  let snap = null;
  try {
    [serverInfo, snap] = await Promise.all([
      apiFetch('/api/server-info'),
      apiFetch(`/api/matches/${encodeURIComponent(code)}`, { token }),
    ]);
  } catch (err) {
    root.innerHTML = `<div class="container">${brandHeader()}<div class="panel"><h2>Gagal membuka ruang</h2><p>${esc(err.message)}</p><button class="btn" id="b-home">Kembali ke Beranda</button></div></div>`;
    root.querySelector('#b-home')?.addEventListener('click', () => navigate('/'));
    return null;
  }

  const origins = [...new Set([...(serverInfo.lanOrigins || []), window.location.origin])];
  let selectedOrigin = origins[0] || window.location.origin;

  const renderContent = () => {
    const dispUrl = `${selectedOrigin}/display/${code}`;
    const ctrlUrl = `${selectedOrigin}/controller/${code}#t=${encodeURIComponent(token)}`;
    const dispConn = snap?.connections?.display ?? 0;
    const ctrlConn = snap?.connections?.controller ?? 0;

    root.innerHTML = `
      <div class="container">
        ${brandHeader(`<button class="btn btn-sm" id="btn-home">Beranda</button>`)}

        <div class="panel" style="margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
            <div>
              <div style="font-size:0.85rem; color:var(--text-muted); font-weight:700;">RUANG PERTANDINGAN SIAP</div>
              <div style="font-size:2rem; font-weight:900; letter-spacing:0.08em;" class="tabular">${esc(code)}</div>
            </div>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <span class="badge ${dispConn > 0 ? 'badge-ok' : 'badge-warn'}" id="lobby-disp-conn">
                📺 Display IFP: ${dispConn > 0 ? `Terhubung (${dispConn})` : 'Belum dibuka'}
              </span>
              <span class="badge ${ctrlConn > 1 ? 'badge-ok' : 'badge-cyan'}" id="lobby-ctrl-conn">
                📱 Controller Aktif: ${ctrlConn}
              </span>
            </div>
          </div>

          ${
            origins.length > 1
              ? `
            <div class="field" style="max-width:440px; margin-bottom:18px;">
              <label for="origin-sel">Alamat Jaringan Wi-Fi / Hotspot untuk Scan HP</label>
              <select id="origin-sel" class="input">
                ${origins.map((o) => `<option value="${esc(o)}" ${o === selectedOrigin ? 'selected' : ''}>${esc(o)}</option>`).join('')}
              </select>
            </div>
          `
              : ''
          }

          <div class="grid-2">
            <div class="card" style="text-align:center; display:flex; flex-direction:column; gap:12px; justify-content:space-between;">
              <div>
                <span class="badge badge-cyan" style="margin-bottom:8px;">LAYAR PUBLIK (IFP / PROYEKTOR)</span>
                <h2 style="margin:4px 0 6px; font-size:1.2rem;">1. Buka Display di IFP</h2>
                <p style="margin:0 0 12px; font-size:0.88rem; color:var(--text-muted);">
                  Hanya akses baca. Aman ditampilkan di proyektor kelas (tanpa token kontrol).
                </p>
                <div class="qr-box">${renderQrSvg(dispUrl)}</div>
                <div style="margin-top:10px; font-size:0.82rem; word-break:break-all; color:var(--text-muted);">${esc(dispUrl)}</div>
              </div>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <a class="btn btn-cyan" href="/display/${encodeURIComponent(code)}" target="_blank" rel="noopener" style="flex:1;">Buka Tab Display ↗</a>
                <button class="btn" id="btn-switch-to-display" style="flex:1;" title="Gunakan layar ini sebagai IFP Display setelah HP terhubung">Jadikan Layar Ini IFP</button>
              </div>
            </div>

            <div class="card" style="text-align:center; display:flex; flex-direction:column; gap:12px; justify-content:space-between; border-color:var(--accent-purple);">
              <div>
                <span class="badge badge-purple" style="margin-bottom:8px;">RAHASIA OPERATOR (SMARTPHONE)</span>
                <h2 style="margin:4px 0 6px; font-size:1.2rem;">2. Scan Controller di HP Guru</h2>
                <p style="margin:0 0 12px; font-size:0.88rem; color:var(--text-muted);">
                  Scan QR di bawah menggunakan kamera HP yang terhubung ke Wi-Fi/Hotspot yang sama.
                </p>
                <div class="qr-box">${renderQrSvg(ctrlUrl)}</div>
                <div style="margin-top:10px; font-size:0.84rem;">
                  Token Manual: <strong class="tabular" style="color:#fcd34d; letter-spacing:0.06em;">${esc(token)}</strong>
                </div>
              </div>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="btn btn-primary" id="btn-open-ctrl-here" style="flex:1;">📱 Buka Controller di Sini</button>
                <button class="btn" id="btn-copy-ctrl">Salin Link HP</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    root.querySelector('#nav-home')?.addEventListener('click', () => navigate('/'));
    root.querySelector('#btn-home')?.addEventListener('click', () => navigate('/'));
    root.querySelector('#origin-sel')?.addEventListener('change', (ev) => {
      selectedOrigin = ev.target.value;
      renderContent();
    });
    root.querySelector('#btn-switch-to-display')?.addEventListener('click', () => {
      navigate(`/display/${encodeURIComponent(code)}`);
    });
    root.querySelector('#btn-open-ctrl-here')?.addEventListener('click', () => {
      navigate(`/controller/${encodeURIComponent(code)}`);
    });
    root.querySelector('#btn-copy-ctrl')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(ctrlUrl);
        showToast('Tautan Controller berhasil disalin!', 'ok');
      } catch {
        showToast(ctrlUrl, 'info');
      }
    });
  };

  renderContent();

  const disconnect = connectRoomStream({
    roomCode: code,
    role: 'controller',
    token,
    onSnapshot: (incoming) => {
      snap = incoming;
      const dEl = root.querySelector('#lobby-disp-conn');
      const cEl = root.querySelector('#lobby-ctrl-conn');
      const dCount = incoming.connections?.display ?? 0;
      const cCount = incoming.connections?.controller ?? 0;
      if (dEl) {
        dEl.className = `badge ${dCount > 0 ? 'badge-ok' : 'badge-warn'}`;
        dEl.textContent = `📺 Display IFP: ${dCount > 0 ? `Terhubung (${dCount})` : 'Belum dibuka'}`;
      }
      if (cEl) {
        cEl.textContent = `📱 Controller Aktif: ${cCount}`;
      }
    },
  });

  return () => disconnect();
}

// ============================================================================
// 4. RIWAYAT PERTANDINGAN (/history & /history/:id)
// ============================================================================
export async function renderHistoryView(root, detailId = null) {
  if (detailId) {
    return renderHistoryDetail(root, detailId);
  }

  let selectedDate = '';

  const loadAndRender = async () => {
    const query = selectedDate ? `?date=${encodeURIComponent(selectedDate)}` : '';
    const { items } = await apiFetch(`/api/history${query}`);

    root.innerHTML = `
      <div class="container">
        ${brandHeader(`
          <button class="btn btn-sm" id="btn-home">← Beranda</button>
          <button class="btn btn-sm btn-primary" id="btn-new-match">+ Buat Pertandingan</button>
        `)}

        <div class="panel">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:18px;">
            <div>
              <h1 style="margin:0; font-size:1.45rem;">Riwayat Pertandingan</h1>
              <div style="color:var(--text-muted); font-size:0.9rem;">Rekap skor akhir, percobaan soal, dan log koreksi nilai.</div>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
              <input type="date" id="hist-date" class="input" value="${esc(selectedDate)}" style="min-height:40px; padding:6px 12px;" />
              ${selectedDate ? `<button class="btn btn-sm" id="btn-clear-date">Reset</button>` : ''}
            </div>
          </div>

          ${
            items.length === 0
              ? `<div class="card" style="text-align:center; padding:34px; color:var(--text-muted);">Belum ada riwayat pertandingan${selectedDate ? ' pada tanggal ini' : ''}.</div>`
              : `<div style="display:grid; gap:12px;">
                ${items
                  .map(
                    (m) => `
                  <div class="card" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
                    <div>
                      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:6px;">
                        <strong class="tabular" style="font-size:1.08rem; letter-spacing:0.06em;">#${esc(m.roomCode)}</strong>
                        <span class="badge ${m.status === 'MATCH_FINISHED' ? 'badge-ok' : 'badge-warn'}">${esc(m.status)}</span>
                        <span class="badge">${esc(modeLabel(m.mode))} • ${esc(m.questionCount)} Soal</span>
                        <span style="font-size:0.84rem; color:var(--text-muted);">${esc(formatDateTime(m.createdAt))}</span>
                      </div>
                      <div style="display:flex; gap:14px; flex-wrap:wrap; font-size:0.95rem;">
                        ${m.standings
                          .map(
                            (p) =>
                              `<span><strong style="color:${esc(p.themeColor)};">#${p.rank}${p.isTied ? ' (Seri)' : ''} ${esc(p.displayName)}:</strong> <span class="tabular">${p.score}</span></span>`,
                          )
                          .join(' • ')}
                      </div>
                    </div>
                    <div style="display:flex; gap:8px;">
                      ${
                        m.status !== 'MATCH_FINISHED'
                          ? `<button class="btn btn-sm btn-cyan btn-open-live" data-code="${esc(m.roomCode)}">Buka Display</button>`
                          : ''
                      }
                      <button class="btn btn-sm btn-detail" data-id="${esc(m.id)}">Detail Laporan</button>
                      ${
                        ['MATCH_FINISHED', 'LOBBY'].includes(m.status)
                          ? `<button class="btn btn-sm btn-err btn-del" data-id="${esc(m.id)}" data-code="${esc(m.roomCode)}">Hapus</button>`
                          : ''
                      }
                    </div>
                  </div>
                `,
                  )
                  .join('')}
              </div>`
          }
        </div>
      </div>
    `;

    root.querySelector('#nav-home')?.addEventListener('click', () => navigate('/'));
    root.querySelector('#btn-home')?.addEventListener('click', () => navigate('/'));
    root.querySelector('#btn-new-match')?.addEventListener('click', () => navigate('/setup'));
    root.querySelector('#hist-date')?.addEventListener('change', (e) => {
      selectedDate = e.target.value;
      loadAndRender();
    });
    root.querySelector('#btn-clear-date')?.addEventListener('click', () => {
      selectedDate = '';
      loadAndRender();
    });
    root.querySelectorAll('.btn-open-live').forEach((b) =>
      b.addEventListener('click', () => navigate(`/display/${encodeURIComponent(b.dataset.code)}`)),
    );
    root.querySelectorAll('.btn-detail').forEach((b) =>
      b.addEventListener('click', () => navigate(`/history/${encodeURIComponent(b.dataset.id)}`)),
    );
    root.querySelectorAll('.btn-del').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.dataset.id;
        const code = b.dataset.code;
        openModal(
          `
          <h3 style="margin:0 0 8px;">Hapus Riwayat #${esc(code)}?</h3>
          <p style="color:var(--text-muted); margin:0 0 18px;">Data pertandingan dan log percobaan soal akan dihapus permanen.</p>
          <div style="display:flex; gap:10px; justify-content:flex-end;">
            <button class="btn btn-sm" id="m-cancel">Batal</button>
            <button class="btn btn-sm btn-err" id="m-confirm">Ya, Hapus</button>
          </div>
        `,
          (mRoot) => {
            mRoot.querySelector('#m-cancel')?.addEventListener('click', closeModal);
            mRoot.querySelector('#m-confirm')?.addEventListener('click', async () => {
              try {
                await apiFetch(`/api/history/${encodeURIComponent(id)}`, { method: 'DELETE' });
                closeModal();
                showToast('Riwayat berhasil dihapus.', 'ok');
                loadAndRender();
              } catch (err) {
                closeModal();
                showToast(err.message, 'err');
              }
            });
          },
        );
      }),
    );
  };

  try {
    await loadAndRender();
  } catch (err) {
    showToast(err.message, 'err');
  }
}

async function renderHistoryDetail(root, id) {
  try {
    const d = await apiFetch(`/api/history/${encodeURIComponent(id)}`);
    root.innerHTML = `
      <div class="container">
        ${brandHeader(`<button class="btn btn-sm" id="btn-back-hist">← Daftar Riwayat</button>`)}

        <div class="panel" style="margin-bottom:18px;">
          <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px; margin-bottom:16px;">
            <div>
              <span class="badge badge-cyan">${esc(modeLabel(d.mode))}</span>
              <h1 style="margin:6px 0 4px;">Laporan Pertandingan #${esc(d.roomCode)}</h1>
              <div style="font-size:0.88rem; color:var(--text-muted);">
                Mulai: ${esc(formatDateTime(d.startedAt || d.createdAt))} • Selesai: ${esc(formatDateTime(d.finishedAt))}
              </div>
            </div>
            <span class="badge ${d.status === 'MATCH_FINISHED' ? 'badge-ok' : 'badge-warn'}">${esc(d.status)}</span>
          </div>

          <div class="grid-3" style="margin-bottom:20px;">
            ${d.standings
              .map(
                (p) => `
              <div class="card" style="border-top:4px solid ${esc(p.themeColor)};">
                <div style="font-size:0.84rem; color:var(--text-muted); font-weight:700;">
                  PERINGKAT #${p.rank}${p.isTied ? ' (SERI)' : ''}
                </div>
                <div style="font-size:1.25rem; font-weight:800; margin:4px 0;">${esc(p.displayName)}</div>
                <div style="font-size:1.9rem; font-weight:900;" class="tabular">${p.score} <span style="font-size:0.9rem; font-weight:600; color:var(--text-muted);">poin</span></div>
              </div>
            `,
              )
              .join('')}
          </div>

          ${
            d.scoreAdjustments.length > 0
              ? `
            <h2 style="font-size:1.08rem; margin:0 0 10px;">Log Koreksi Skor Manual</h2>
            <div style="display:grid; gap:8px; margin-bottom:20px;">
              ${d.scoreAdjustments
                .map(
                  (adj) => `
                <div class="card" style="padding:10px 14px; font-size:0.9rem;">
                  <strong>${esc(adj.playerName)}</strong>:
                  <span class="tabular">${adj.oldScore} → ${adj.newScore} (${adj.delta > 0 ? `+${adj.delta}` : adj.delta})</span>
                  — Alasan: <em>"${esc(adj.reason)}"</em>
                  <span style="color:var(--text-muted); font-size:0.8rem;"> (${esc(formatDateTime(adj.createdAt))})</span>
                </div>
              `,
                )
                .join('')}
            </div>
          `
              : ''
          }

          <h2 style="font-size:1.08rem; margin:0 0 10px;">Rincian Soal &amp; Percobaan Peserta (${d.questions.length} Soal)</h2>
          <div style="display:grid; gap:10px;">
            ${d.questions
              .map(
                (q) => `
              <div class="card" style="padding:12px 16px;">
                <div style="display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap; margin-bottom:6px;">
                  <span style="font-weight:700; color:var(--accent-cyan);">
                    Soal #${q.sequenceNumber} (${esc(q.questionId)}) — ${esc(q.category)}: ${esc(q.topic)}
                  </span>
                  <span class="badge ${q.result === 'CORRECT' ? 'badge-ok' : 'badge-err'}">${esc(q.result || q.status)}</span>
                </div>
                ${
                  q.questionText
                    ? `<div style="margin-bottom:6px;">${esc(q.questionText)} <strong style="color:#6ee7b7;">[Kunci: ${esc(q.correctOption)}]</strong></div>`
                    : `<div style="color:var(--text-muted); font-style:italic; margin-bottom:6px;">(Teks &amp; kunci disembunyikan selama pertandingan masih berlangsung)</div>`
                }
                <div style="font-size:0.86rem; color:var(--text-muted);">
                  Percobaan:
                  ${
                    q.attempts.length === 0
                      ? 'Tidak ada peserta yang mencoba'
                      : q.attempts
                          .map(
                            (a) =>
                              `<span class="badge ${a.result === 'CORRECT' ? 'badge-ok' : 'badge-err'}" style="margin-right:4px;">${esc(a.playerName)}: ${a.result === 'CORRECT' ? `BENAR (+${a.pointsAwarded})` : 'SALAH (0)'}</span>`,
                          )
                          .join(' ')
                  }
                </div>
              </div>
            `,
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
    root.querySelector('#nav-home')?.addEventListener('click', () => navigate('/'));
    root.querySelector('#btn-back-hist')?.addEventListener('click', () => navigate('/history'));
  } catch (err) {
    root.innerHTML = `<div class="container">${brandHeader()}<div class="panel"><p>${esc(err.message)}</p><button class="btn" id="b-hist">Kembali</button></div></div>`;
    root.querySelector('#b-hist')?.addEventListener('click', () => navigate('/history'));
  }
}
