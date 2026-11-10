import {
  esc,
  navigate,
  showToast,
  apiCall,
  subscribeQuery,
  getParticipantIdentity,
  saveParticipantIdentity,
  clearParticipantIdentity,
  getActiveTheme,
  cycleActiveTheme,
  renderStructuredExplanationHtml,
} from './client.js';
import { renderFiguralStemHtml, renderFiguralOptionHtml } from './figural.js';

export async function renderParticipantView(root, rawCode) {
  const code = (rawCode || '').trim().toUpperCase();
  let identity = getParticipantIdentity(code);
  let snap = null;
  let online = true;
  let activeQIdx = 0;
  let hasInitializedQIdx = false;
  let draftOption = null;
  let submitting = false;
  let pendingRetryPayload = null;
  let followHostReview = true;
  let localReviewIdx = 0;
  let unsubSnapshot = null;

  function renderTopbar(subtitle = '') {
    const theme = getActiveTheme();
    return `
      <header class="ctrl-topbar">
        <div style="display:flex; align-items:center; gap:10px; min-width:0;">
          <div class="brand-mark" style="width:34px; height:34px; font-size:0.82rem; flex-shrink:0;">CPNS</div>
          <div style="min-width:0;">
            <div style="font-weight:900; font-size:0.96rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              Simulasi CPNS • #${esc(code)}
            </div>
            <div style="font-size:0.75rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${esc(subtitle || 'Drilling Mandiri TIU SKD')}
            </div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
          <span class="badge" style="padding:4px 8px; font-size:0.72rem;">
            <span class="dot ${online ? 'dot-online' : 'dot-offline'}" data-conn-dot></span>
            <span data-conn-text>${online ? 'ONLINE' : 'OFFLINE'}</span>
          </span>
          <button type="button" class="btn btn-sm" id="btn-part-theme" style="min-height:34px; padding:4px 9px; font-size:0.78rem;">
            ${theme.icon}
          </button>
        </div>
      </header>
    `;
  }

  function renderJoinScreen(errMsg = '') {
    root.innerHTML = `
      <div class="ctrl-shell">
        ${renderTopbar('Pendaftaran Peserta Sesi')}

        <section class="panel" style="margin-top:8px;">
          <span class="badge badge-cyan" style="margin-bottom:10px;">SESI DRILLING #${esc(code)}</span>
          <h1 style="margin:0 0 8px; font-size:1.4rem;">Masuk sebagai Peserta</h1>
          <p style="margin:0 0 18px; color:var(--text-muted); font-size:0.9rem;">
            Masukkan nama Anda untuk memulai pengerjaan soal TIU CPNS secara mandiri. Jika nama yang sama sudah digunakan, sistem akan menambahkan nomor pembeda secara otomatis.
          </p>

          ${
            errMsg
              ? `<div class="card" style="border-color:var(--err); background:var(--err-bg); color:var(--err-text); font-weight:700; margin-bottom:14px;">${esc(errMsg)}</div>`
              : ''
          }

          <form id="join-form" novalidate>
            <div class="field">
              <label for="inp-part-name">Nama Lengkap / Nama Tampilan</label>
              <input
                id="inp-part-name"
                class="input"
                maxlength="40"
                required
                placeholder="Contoh: Rina Kartika"
                autocomplete="name"
              />
            </div>
            <button type="submit" class="btn btn-primary btn-xl btn-block" id="btn-submit-join">
              Masuk &amp; Mulai Simulasi →
            </button>
          </form>

          <div style="margin-top:16px; text-align:center;">
            <button type="button" class="btn btn-sm" id="btn-back-home">← Kembali ke Beranda</button>
          </div>
        </section>
      </div>
    `;

    root.querySelector('#btn-part-theme')?.addEventListener('click', () => {
      cycleActiveTheme();
      renderJoinScreen(errMsg);
    });
    root.querySelector('#btn-back-home')?.addEventListener('click', () => navigate('/'));

    const form = root.querySelector('#join-form');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameVal = root.querySelector('#inp-part-name')?.value.trim() || '';
      if (!nameVal) {
        return showToast('Nama peserta tidak boleh kosong.', 'err');
      }
      const btn = root.querySelector('#btn-submit-join');
      btn.disabled = true;
      btn.textContent = 'Menghubungkan ke Sesi...';

      try {
        const res = await apiCall(
          'matches:joinSession',
          {
            joinCode: code,
            displayName: nameVal,
            participantToken: identity?.participantToken,
          },
          true,
        );
        identity = {
          participantId: res.participantId,
          displayName: res.displayName,
          participantToken: res.participantToken,
        };
        saveParticipantIdentity(code, identity);
        await startParticipantSubscription();
      } catch (err) {
        renderJoinScreen(err.message);
      }
    });
  }

  async function submitCurrentAnswer(questionId, selectedOption) {
    if (!identity?.participantToken || submitting) return;
    submitting = true;
    pendingRetryPayload = null;
    renderActiveScreen();

    try {
      const res = await apiCall(
        'matches:submitAnswer',
        {
          joinCode: code,
          participantToken: identity.participantToken,
          questionId,
          selectedOption,
          actionId: `${questionId}-${selectedOption}`,
        },
        true,
      );
      submitting = false;
      draftOption = null;
      snap = await apiCall(
        'matches:getParticipantSnapshot',
        {
          joinCode: code,
          participantToken: identity.participantToken,
        },
        false,
      );

      // Move automatically to next unanswered question if not finished
      if (snap && snap.participant.status !== 'finished') {
        const nextUnanswered = snap.questions.findIndex(
          (q, idx) => idx > activeQIdx && !q.selectedOption,
        );
        if (nextUnanswered !== -1) {
          activeQIdx = nextUnanswered;
        } else {
          const anyUnanswered = snap.questions.findIndex((q) => !q.selectedOption);
          if (anyUnanswered !== -1) activeQIdx = anyUnanswered;
        }
      } else if (res.participantStatus === 'finished') {
        showToast('Seluruh soal telah selesai dijawab!', 'ok');
      }
      renderActiveScreen();
    } catch (err) {
      submitting = false;
      pendingRetryPayload = { questionId, selectedOption, error: err.message };
      showToast(err.message, 'err');
      renderActiveScreen();
    }
  }

  function renderWaitingScreen() {
    const s = snap.session;
    const p = snap.participant;
    root.innerHTML = `
      <div class="ctrl-shell">
        ${renderTopbar(p.displayName)}

        <section class="panel" style="text-align:center; padding:32px 20px;">
          <span class="badge badge-warn" style="margin-bottom:10px;">MENUNGGU HOST MEMULAI SESI</span>
          <h1 style="margin:0 0 8px; font-size:1.45rem;">Halo, ${esc(p.displayName)}!</h1>
          <p style="margin:0 0 18px; color:var(--text-muted); font-size:0.94rem;">
            Anda sudah terdaftar di sesi <strong>${esc(s.title)}</strong>. Soal pertama akan otomatis terbuka di layar ini begitu Host memulai sesi.
          </p>

          <div class="card" style="text-align:left; font-size:0.9rem;">
            <div style="font-weight:800; margin-bottom:6px;">Ketentuan Pengerjaan:</div>
            <ul style="margin:0; padding-left:18px; color:var(--text-muted);">
              <li>Jumlah soal: <strong>${s.totalQuestions} butir TIU CPNS</strong> (Pilihan A–E).</li>
              <li>Bobot nilai: Benar <strong>+${s.settings.pointsCorrect}</strong>, Salah <strong>${s.settings.pointsWrong}</strong>, Tidak dijawab <strong>${s.settings.pointsBlank}</strong>.</li>
              <li>Tidak ada batas waktu hitung mundur per soal.</li>
              <li>${s.settings.allowAnswerChange ? 'Jawaban masih dapat diubah sebelum Anda mengakhiri sesi.' : 'Jawaban terkunci setelah Anda menekan tombol Kirim Jawaban.'}</li>
            </ul>
          </div>
        </section>
      </div>
    `;

    root.querySelector('#btn-part-theme')?.addEventListener('click', () => {
      cycleActiveTheme();
      renderWaitingScreen();
    });
  }

  function renderFinishedOrReviewScreen() {
    const s = snap.session;
    const p = snap.participant;
    const res = snap.personalResult;
    const isReviewOpen = s.status === 'review_open';

    if (followHostReview && isReviewOpen) {
      localReviewIdx = Math.max(
        0,
        Math.min(snap.questions.length - 1, s.reviewQuestionIndex || 0),
      );
    }

    const revQ = isReviewOpen ? snap.questions[localReviewIdx] : null;

    root.innerHTML = `
      <div class="ctrl-shell" style="max-width:740px;">
        ${renderTopbar(`${p.displayName} • ${s.title}`)}

        ${
          !res
            ? `
            <!-- Participant finished early while other participants are still working (Bagian F.5) -->
            <section class="panel" style="text-align:center; padding:30px 20px;">
              <span class="badge badge-ok" style="margin-bottom:10px;">✓ PAKET SOAL SELESAI DIKERJAKAN</span>
              <h1 style="margin:0 0 8px; font-size:1.4rem;">Terima kasih, ${esc(p.displayName)}!</h1>
              <p style="margin:0 0 16px; color:var(--text-muted); font-size:0.93rem;">
                Anda telah menjawab <strong>${p.answeredCount} dari ${p.totalQuestions} soal</strong>. Sesuai standar keamanan simulasi, rincian skor benar/salah dan pembahasan akan ditampilkan secara otomatis segera setelah seluruh peserta menyelesaikan paket atau Host menutup sesi.
              </p>
              <div class="badge badge-cyan">Menunggu peserta lain menyelesaikan simulasi...</div>
            </section>
          `
            : `
            <!-- Full Personal Result Summary (Bagian E.4.3) -->
            <section class="panel">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
                <div>
                  <span class="badge badge-ok" style="margin-bottom:4px;">RINGKASAN HASIL PESERTA</span>
                  <h1 style="margin:0; font-size:1.35rem;">${esc(res.displayName)}</h1>
                </div>
                <span class="badge badge-warn" style="font-size:0.95rem; padding:7px 14px;">
                  Peringkat #${res.rank}${res.isTied ? ' (SERI)' : ''} dari ${res.totalParticipants} Peserta
                </span>
              </div>

              <div class="grid-3" style="gap:10px; margin-bottom:14px; text-align:center;">
                <div class="card" style="padding:12px;">
                  <div style="font-size:0.76rem; color:var(--text-muted); font-weight:700;">SKOR TOTAL</div>
                  <div class="tabular" style="font-size:1.9rem; font-weight:900; color:var(--accent-cyan);">
                    ${res.score} <span style="font-size:0.88rem; color:var(--text-muted);">/ ${res.maxPossibleScore}</span>
                  </div>
                </div>
                <div class="card" style="padding:12px;">
                  <div style="font-size:0.76rem; color:var(--text-muted); font-weight:700;">BENAR / SALAH / KOSONG</div>
                  <div class="tabular" style="font-size:1.25rem; font-weight:900; margin-top:6px;">
                    <span style="color:var(--ok-text);">${res.correctCount}B</span> •
                    <span style="color:var(--err-text);">${res.wrongCount}S</span> •
                    <span style="color:var(--text-muted);">${res.unansweredCount}K</span>
                  </div>
                </div>
                <div class="card" style="padding:12px;">
                  <div style="font-size:0.76rem; color:var(--text-muted); font-weight:700;">AKURASI JAWABAN</div>
                  <div class="tabular" style="font-size:1.8rem; font-weight:900;">
                    ${res.accuracy.toFixed(1)}%
                  </div>
                </div>
              </div>

              <h2 style="font-size:1rem; margin:14px 0 8px;">Rincian per Kelompok TIU</h2>
              <div class="grid-3" style="gap:8px; margin-bottom:14px;">
                ${res.byCategory
                  .map(
                    (c) => `
                  <div class="card" style="padding:10px 12px;">
                    <div style="font-weight:800; font-size:0.9rem;">${esc(c.category)}</div>
                    <div class="tabular" style="font-size:0.84rem; color:var(--text-muted); margin-top:2px;">
                      Benar: <strong>${c.correct}/${c.total}</strong> • Skor: <strong>${c.score}</strong>
                    </div>
                  </div>
                `,
                  )
                  .join('')}
              </div>

              <h2 style="font-size:1rem; margin:14px 0 8px;">Rincian per Subindikator</h2>
              <div class="grid-2" style="gap:8px;">
                ${res.bySubIndicator
                  .map(
                    (sub) => `
                  <div class="card" style="padding:9px 12px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                      <div style="font-size:0.72rem; color:var(--accent-cyan); font-weight:700;">${esc(sub.category)}</div>
                      <div style="font-weight:700; font-size:0.88rem;">${esc(sub.subIndicator)}</div>
                    </div>
                    <div class="tabular" style="text-align:right; font-size:0.84rem;">
                      <div><strong>${sub.correct}/${sub.total}</strong> benar</div>
                      <div style="color:var(--text-muted);">Skor ${sub.score}</div>
                    </div>
                  </div>
                `,
                  )
                  .join('')}
              </div>
            </section>
          `
        }

        ${
          !isReviewOpen
            ? `
            <section class="card" style="text-align:center; padding:16px; color:var(--text-muted); font-size:0.88rem;">
              🔒 Kunci jawaban dan pembahasan lengkap per soal akan terbuka di layar ini setelah Host menekan tombol <strong>Buka Pembahasan</strong> di layar utama.
            </section>
          `
            : `
            <!-- Synced Class Review on Participant Device (Bagian F.5 & F.6) -->
            <section class="panel">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
                <div>
                  <span class="badge badge-purple">MODE PEMBAHASAN TERBUKA</span>
                  <h2 style="margin:4px 0 0; font-size:1.15rem;">
                    Pembahasan Soal ${revQ.sequenceNumber} dari ${s.totalQuestions}
                  </h2>
                </div>
                <label class="check-card" style="padding:6px 10px; align-items:center;">
                  <input type="checkbox" id="chk-follow-host" ${followHostReview ? 'checked' : ''} />
                  <span style="font-size:0.8rem; font-weight:700;">Ikuti Soal Layar Host</span>
                </label>
              </div>

              <div style="display:flex; gap:8px; align-items:center; margin-bottom:14px;">
                <button class="btn btn-sm" id="btn-part-rev-prev" ${localReviewIdx <= 0 ? 'disabled' : ''}>←</button>
                <select id="sel-part-rev-jump" class="input tabular" style="min-height:38px; padding:4px 10px; flex:1;">
                  ${snap.questions
                    .map(
                      (item, idx) =>
                        `<option value="${idx}" ${idx === localReviewIdx ? 'selected' : ''}>
                          Soal #${item.sequenceNumber} — ${item.selectedOption === item.correctOption ? '✓ Benar' : `✕ Jawab: ${item.selectedOption || 'Kosong'} (Kunci: ${item.correctOption})`}
                        </option>`,
                    )
                    .join('')}
                </select>
                <button class="btn btn-sm" id="btn-part-rev-next" ${localReviewIdx >= snap.questions.length - 1 ? 'disabled' : ''}>→</button>
              </div>

              <div class="card" style="margin-bottom:14px;">
                <div style="font-size:0.78rem; color:var(--accent-cyan); font-weight:800; margin-bottom:6px;">
                  ${esc(revQ.id)} • ${esc(revQ.category || '')} — ${esc(revQ.subIndicator || '')}
                </div>
                <p style="font-size:1.08rem; font-weight:700; margin:0 0 12px;">${esc(revQ.question)}</p>
                ${revQ.figural ? renderFiguralStemHtml(revQ.figural) : ''}

                <div style="display:flex; flex-direction:column; gap:8px; margin-top:12px;">
                  ${['A', 'B', 'C', 'D', 'E']
                    .map((key) => {
                      const isKey = revQ.correctOption === key;
                      const isMine = revQ.selectedOption === key;
                      return `
                        <div class="option-tile ${isKey ? 'correct' : ''}" style="padding:10px 14px; font-size:0.95rem;">
                          <div class="option-key" style="width:36px; height:36px;">${key}</div>
                          <div style="flex:1;">
                            ${revQ.figural ? renderFiguralOptionHtml(revQ.figural, key, esc(revQ.options[key])) : esc(revQ.options[key])}
                          </div>
                          <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            ${isMine ? `<span class="badge ${isKey ? 'badge-ok' : 'badge-err'}">Jawaban Anda</span>` : ''}
                            ${isKey ? `<span class="badge badge-ok">✓ Kunci</span>` : ''}
                          </div>
                        </div>
                      `;
                    })
                    .join('')}
                </div>
              </div>

              ${renderStructuredExplanationHtml(revQ)}
            </section>
          `
        }
      </div>
    `;

    root.querySelector('#btn-part-theme')?.addEventListener('click', () => {
      cycleActiveTheme();
      renderFinishedOrReviewScreen();
    });

    root.querySelector('#chk-follow-host')?.addEventListener('change', (e) => {
      followHostReview = e.target.checked;
      if (followHostReview) {
        localReviewIdx = s.reviewQuestionIndex || 0;
      }
      renderFinishedOrReviewScreen();
    });

    root.querySelector('#btn-part-rev-prev')?.addEventListener('click', () => {
      followHostReview = false;
      if (localReviewIdx > 0) localReviewIdx--;
      renderFinishedOrReviewScreen();
    });

    root.querySelector('#btn-part-rev-next')?.addEventListener('click', () => {
      followHostReview = false;
      if (localReviewIdx < snap.questions.length - 1) localReviewIdx++;
      renderFinishedOrReviewScreen();
    });

    root.querySelector('#sel-part-rev-jump')?.addEventListener('change', (e) => {
      followHostReview = false;
      localReviewIdx = Number(e.target.value);
      renderFinishedOrReviewScreen();
    });
  }

  function renderDrillingScreen() {
    const s = snap.session;
    const p = snap.participant;
    const questions = snap.questions || [];

    if (!hasInitializedQIdx && questions.length > 0) {
      activeQIdx = Math.max(0, Math.min(questions.length - 1, p.currentQuestionIndex || 0));
      hasInitializedQIdx = true;
    }

    const q = questions[activeQIdx];
    if (!q) return;

    const lockedAnswer = q.selectedOption;
    const canChange = s.settings.allowAnswerChange || !lockedAnswer;
    const currentChoice = draftOption || lockedAnswer || null;
    const progressPct =
      s.totalQuestions > 0 ? Math.round((p.answeredCount / s.totalQuestions) * 100) : 0;

    root.innerHTML = `
      <div class="ctrl-shell" style="max-width:680px;">
        ${renderTopbar(`${p.displayName} • ${s.title}`)}

        <!-- Progress Bar without Timer -->
        <section class="card" style="padding:12px 14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.84rem; font-weight:700; margin-bottom:6px;">
            <span>Progres Pengerjaan: <strong>${p.answeredCount} dari ${s.totalQuestions} soal</strong></span>
            <span class="tabular">${progressPct}%</span>
          </div>
          <div class="timer-bar-track" style="margin-top:0; height:8px;">
            <div class="timer-bar-fill" style="width:${progressPct}%;"></div>
          </div>

          <!-- Question Number Strip -->
          <div class="q-nav-strip" style="margin-top:10px;">
            ${questions
              .map(
                (item, idx) => `
              <button
                type="button"
                class="q-nav-pill ${idx === activeQIdx ? 'active' : ''} ${item.selectedOption ? 'answered' : ''}"
                data-jump-q="${idx}"
              >
                ${item.sequenceNumber}
              </button>
            `,
              )
              .join('')}
          </div>
        </section>

        <!-- Question Card -->
        <main class="panel" style="padding:18px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
            <span class="badge badge-cyan tabular">SOAL ${q.sequenceNumber} DARI ${s.totalQuestions}</span>
            ${
              q.category
                ? `<span class="badge badge-purple">${esc(q.category)} — ${esc(q.subIndicator)}</span>`
                : ''
            }
          </div>

          <p style="font-size:1.14rem; font-weight:700; line-height:1.45; margin:0 0 14px; color:var(--heading);">
            ${esc(q.question)}
          </p>

          ${q.figural ? renderFiguralStemHtml(q.figural) : ''}

          <!-- 5 Options A–E -->
          <div style="display:flex; flex-direction:column; gap:10px; margin-top:14px;">
            ${['A', 'B', 'C', 'D', 'E']
              .map((key) => {
                const isSelected = currentChoice === key;
                const isSaved = lockedAnswer === key;
                return `
                  <button
                    type="button"
                    class="ctrl-option-btn ${isSelected ? 'selected' : ''} ${isSaved ? 'saved' : ''}"
                    data-opt-key="${key}"
                    ${!canChange || submitting ? 'disabled' : ''}
                  >
                    <span class="option-key" style="width:40px; height:40px;">${key}</span>
                    <div style="flex:1; text-align:left;">
                      ${q.figural ? renderFiguralOptionHtml(q.figural, key, esc(q.options[key])) : esc(q.options[key])}
                    </div>
                    ${isSaved ? `<span class="badge badge-ok">Tersimpan</span>` : ''}
                  </button>
                `;
              })
              .join('')}
          </div>

          ${
            pendingRetryPayload && pendingRetryPayload.questionId === q.id
              ? `
              <div class="card" style="margin-top:12px; border-color:var(--warn); background:var(--warn-bg); display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
                <div style="font-size:0.84rem; color:var(--warn-text); font-weight:700;">
                  Jawaban belum tersinkron (${esc(pendingRetryPayload.error)}).
                </div>
                <button type="button" class="btn btn-warn btn-sm" id="btn-retry-submit">
                  ↻ Kirim Ulang Jawaban ${esc(pendingRetryPayload.selectedOption)}
                </button>
              </div>
            `
              : ''
          }

          <!-- Submit & Navigation Actions -->
          <div style="display:flex; flex-direction:column; gap:10px; margin-top:18px; padding-top:14px; border-top:1px solid var(--border);">
            ${
              canChange
                ? `
                <button
                  type="button"
                  class="btn btn-primary btn-xl btn-block"
                  id="btn-send-answer"
                  ${!currentChoice || submitting || (lockedAnswer && currentChoice === lockedAnswer) ? 'disabled' : ''}
                >
                  ${submitting ? 'Menyimpan Jawaban...' : lockedAnswer ? `Perbarui Jawaban ke (${currentChoice || '-'})` : `Kirim Jawaban ${currentChoice ? `(${currentChoice})` : ''}`}
                </button>
              `
                : `
                <div class="badge badge-ok" style="justify-content:center; padding:10px; font-size:0.88rem;">
                  ✓ Jawaban (${esc(lockedAnswer)}) telah dikunci untuk soal ini
                </div>
              `
            }

            <div style="display:flex; justify-content:space-between; gap:10px;">
              <button
                type="button"
                class="btn btn-sm"
                id="btn-prev-q"
                style="flex:1;"
                ${activeQIdx <= 0 ? 'disabled' : ''}
              >
                ← Soal Sebelumnya
              </button>
              ${
                activeQIdx < questions.length - 1
                  ? `
                  <button type="button" class="btn btn-sm btn-cyan" id="btn-next-q" style="flex:1;">
                    Soal Berikutnya →
                  </button>
                `
                  : p.answeredCount >= s.totalQuestions
                    ? `
                    <button type="button" class="btn btn-sm btn-ok" id="btn-finish-all" style="flex:1;">
                      ✓ Selesaikan Paket
                    </button>
                  `
                    : `
                    <button type="button" class="btn btn-sm" id="btn-first-unanswered" style="flex:1;">
                      Cari Soal Belum Dijawab
                    </button>
                  `
              }
            </div>
          </div>
        </main>
      </div>
    `;

    root.querySelector('#btn-part-theme')?.addEventListener('click', () => {
      cycleActiveTheme();
      renderDrillingScreen();
    });

    root.querySelectorAll('[data-jump-q]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeQIdx = Number(btn.getAttribute('data-jump-q'));
        draftOption = null;
        renderDrillingScreen();
      });
    });

    root.querySelectorAll('[data-opt-key]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!canChange || submitting) return;
        draftOption = btn.getAttribute('data-opt-key');
        renderDrillingScreen();
      });
    });

    root.querySelector('#btn-send-answer')?.addEventListener('click', () => {
      if (!currentChoice) return;
      submitCurrentAnswer(q.id, currentChoice);
    });

    root.querySelector('#btn-retry-submit')?.addEventListener('click', () => {
      if (!pendingRetryPayload) return;
      submitCurrentAnswer(
        pendingRetryPayload.questionId,
        pendingRetryPayload.selectedOption,
      );
    });

    root.querySelector('#btn-prev-q')?.addEventListener('click', () => {
      if (activeQIdx > 0) {
        activeQIdx--;
        draftOption = null;
        renderDrillingScreen();
      }
    });

    root.querySelector('#btn-next-q')?.addEventListener('click', () => {
      if (activeQIdx < questions.length - 1) {
        activeQIdx++;
        draftOption = null;
        renderDrillingScreen();
      }
    });

    root.querySelector('#btn-first-unanswered')?.addEventListener('click', () => {
      const idx = questions.findIndex((item) => !item.selectedOption);
      if (idx !== -1) {
        activeQIdx = idx;
        draftOption = null;
        renderDrillingScreen();
      }
    });

    root.querySelector('#btn-finish-all')?.addEventListener('click', async () => {
      try {
        await apiCall(
          'matches:finishParticipantSession',
          {
            joinCode: code,
            participantToken: identity.participantToken,
          },
          true,
        );
        snap = await apiCall(
          'matches:getParticipantSnapshot',
          {
            joinCode: code,
            participantToken: identity.participantToken,
          },
          false,
        );
        renderActiveScreen();
      } catch (err) {
        showToast(err.message, 'err');
      }
    });
  }

  function renderActiveScreen() {
    if (!snap) return;
    const s = snap.session;
    const p = snap.participant;

    if (s.status === 'waiting') {
      renderWaitingScreen();
      return;
    }

    if (
      s.status === 'completed' ||
      s.status === 'review_open' ||
      p.status === 'finished'
    ) {
      renderFinishedOrReviewScreen();
      return;
    }

    renderDrillingScreen();
  }

  async function startParticipantSubscription() {
    if (!identity?.participantToken) {
      renderJoinScreen();
      return;
    }

    try {
      snap = await apiCall(
        'matches:getParticipantSnapshot',
        {
          joinCode: code,
          participantToken: identity.participantToken,
        },
        false,
      );
      renderActiveScreen();
    } catch {
      clearParticipantIdentity(code);
      identity = null;
      renderJoinScreen();
      return;
    }

    if (typeof unsubSnapshot === 'function') unsubSnapshot();
    unsubSnapshot = subscribeQuery(
      'matches:getParticipantSnapshot',
      {
        joinCode: code,
        participantToken: identity.participantToken,
      },
      {
        onData: (incoming) => {
          snap = incoming;
          renderActiveScreen();
        },
        onConnectionChange: (isOnline) => {
          online = isOnline;
          const dot = root.querySelector('[data-conn-dot]');
          const txt = root.querySelector('[data-conn-text]');
          if (dot) dot.className = `dot ${online ? 'dot-online' : 'dot-offline'}`;
          if (txt) txt.textContent = online ? 'ONLINE' : 'OFFLINE';
        },
      },
    );
  }

  if (identity?.participantToken) {
    await startParticipantSubscription();
  } else {
    renderJoinScreen();
  }

  return () => {
    if (typeof unsubSnapshot === 'function') unsubSnapshot();
  };
}
