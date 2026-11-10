import assert from 'node:assert/strict';
import { SEED_DATA } from './convex/seedData.ts';
import * as matchesModule from './convex/matches.ts';
import { renderFiguralStemHtml, renderFiguralOptionHtml } from './public/figural.js';

function getHandler(fnObj: any): (ctx: any, args: any) => Promise<any> {
  if (typeof fnObj?._handler === 'function') return fnObj._handler;
  if (typeof fnObj === 'function') return fnObj;
  throw new Error('Cannot extract handler from Convex function object');
}

class MockQueryChain {
  private rows: any[];
  constructor(rows: any[]) {
    this.rows = [...rows];
  }
  withIndex(_indexName: string, cb?: (q: any) => any) {
    if (cb) {
      const filters: Array<{ field: string; val: any }> = [];
      const qBuilder = {
        eq(field: string, val: any) {
          filters.push({ field, val });
          return qBuilder;
        },
      };
      cb(qBuilder);
      this.rows = this.rows.filter((r) => filters.every((f) => r[f.field] === f.val));
    }
    return this;
  }
  order(dir: 'asc' | 'desc') {
    this.rows.sort((a, b) => (dir === 'desc' ? b._creationTime - a._creationTime : a._creationTime - b._creationTime));
    return this;
  }
  async collect() {
    return [...this.rows];
  }
  async first() {
    return this.rows[0] ?? null;
  }
  async take(n: number) {
    return this.rows.slice(0, n);
  }
}

class MockConvexDb {
  private tables = new Map<string, Map<string, any>>();
  private seq = 1;

  private table(name: string): Map<string, any> {
    if (!this.tables.has(name)) this.tables.set(name, new Map());
    return this.tables.get(name)!;
  }

  async insert(tableName: string, doc: any) {
    const id = `${tableName}:${this.seq++}`;
    const record = { ...doc, _id: id, _creationTime: Date.now() + this.seq };
    this.table(tableName).set(id, record);
    return id;
  }

  async get(id: string) {
    for (const tbl of this.tables.values()) {
      if (tbl.has(id)) return { ...tbl.get(id) };
    }
    return null;
  }

  async patch(id: string, fields: any) {
    for (const tbl of this.tables.values()) {
      if (tbl.has(id)) {
        const cur = tbl.get(id);
        tbl.set(id, { ...cur, ...fields });
        return;
      }
    }
    throw new Error(`Document not found: ${id}`);
  }

  async delete(id: string) {
    for (const tbl of this.tables.values()) {
      if (tbl.has(id)) {
        tbl.delete(id);
        return;
      }
    }
  }

  query(tableName: string) {
    const rows = Array.from(this.table(tableName).values());
    return new MockQueryChain(rows);
  }
}

async function runTests() {
  console.log('=== 1. Verifikasi Bank Soal 105 TIU CPNS & Figural SVG ===');
  assert.equal(SEED_DATA.subIndicators.length, 10, 'Harus ada tepat 10 sub-indikator TIU');
  assert.equal(SEED_DATA.questions.length, 105, 'Harus ada tepat 105 soal TIU CPNS');

  const byCat: Record<string, number> = {};
  const seenIds = new Set<string>();
  let figuralCount = 0;

  for (const q of SEED_DATA.questions) {
    assert.ok(!seenIds.has(q.id), `Duplikat id soal: ${q.id}`);
    seenIds.add(q.id);
    byCat[q.category] = (byCat[q.category] || 0) + 1;

    // Tidak boleh ada properti tingkat kesulitan
    assert.equal('level' in q, false, `Soal ${q.id} tidak boleh memiliki properti level`);
    assert.equal('difficulty' in q, false, `Soal ${q.id} tidak boleh memiliki properti difficulty`);

    // 5 opsi A-E
    for (const key of ['A', 'B', 'C', 'D', 'E'] as const) {
      assert.ok(typeof q.options[key] === 'string' && q.options[key].length > 0, `Opsi ${key} kosong pada ${q.id}`);
    }
    assert.ok(['A', 'B', 'C', 'D', 'E'].includes(q.correctOption), `correctOption tidak valid pada ${q.id}`);

    // 8 bagian penjelasan edukatif
    const ep = q.explanationParts;
    assert.ok(ep, `explanationParts wajib ada pada ${q.id}`);
    assert.ok(ep.coreQuestion.length > 5, `coreQuestion kosong pada ${q.id}`);
    assert.ok(ep.knownInformation.length > 5, `knownInformation kosong pada ${q.id}`);
    assert.ok(ep.strategy.length > 5, `strategy kosong pada ${q.id}`);
    assert.ok(typeof ep.solutionSteps === 'string' && ep.solutionSteps.length > 10, `solutionSteps kosong pada ${q.id}`);
    assert.ok(ep.correctAnswerReason.length > 5, `correctAnswerReason kosong pada ${q.id}`);
    assert.ok(typeof ep.distractorAnalysis === 'string' && ep.distractorAnalysis.length > 10, `distractorAnalysis kosong pada ${q.id}`);
    assert.ok(ep.patternTip.length > 5, `patternTip kosong pada ${q.id}`);
    assert.ok(ep.finalCheck.length > 5, `finalCheck kosong pada ${q.id}`);

    // Figural SVG check
    if (q.category === 'TIU Figural') {
      figuralCount++;
      assert.ok(q.figural, `Soal figural ${q.id} wajib punya deskriptor figural`);
      const stemSvg = renderFiguralStemHtml(q);
      if (q.figural.kind !== 'odd') {
        assert.ok(stemSvg.includes('<svg'), `Stem figural ${q.id} harus merender <svg>`);
      }
      for (const k of ['A', 'B', 'C', 'D', 'E'] as const) {
        const optHtml = renderFiguralOptionHtml(q, k, q.options[k]);
        assert.ok(optHtml.includes('<svg'), `Opsi ${k} pada soal figural ${q.id} harus merender <svg>`);
      }
    }
  }

  assert.equal(byCat['TIU Verbal'], 35, 'TIU Verbal harus 35 soal');
  assert.equal(byCat['TIU Numerik'], 45, 'TIU Numerik harus 45 soal');
  assert.equal(byCat['TIU Figural'], 25, 'TIU Figural harus 25 soal');
  assert.equal(figuralCount, 25, 'Jumlah soal figural ber-SVG harus 25 soal');
  console.log('✓ 105 soal TIU CPNS (35 Verbal, 45 Numerik, 25 Figural SVG) + 8-step pembahasan valid.');

  console.log('=== 2. Simulasi End-to-End Convex Session, Multi-Participant, Lock & Review ===');
  const db = new MockConvexDb();
  const ctx = { db };

  const ensureSeed = getHandler(matchesModule.ensureSeed);
  const createSession = getHandler(matchesModule.createSession);
  const joinSession = getHandler(matchesModule.joinSession);
  const submitAnswer = getHandler(matchesModule.submitAnswer);
  const finishParticipantSession = getHandler(matchesModule.finishParticipantSession);
  const hostDispatch = getHandler(matchesModule.hostDispatch);
  const getHostSnapshot = getHandler(matchesModule.getHostSnapshot);
  const getParticipantSnapshot = getHandler(matchesModule.getParticipantSnapshot);
  const getReviewQuestion = getHandler(matchesModule.getReviewQuestion);

  const seedRes = await ensureSeed(ctx, {});
  assert.equal(seedRes.total, 105);

  // Buat sesi drilling 5 soal
  const sessionRes = await createSession(ctx, {
    title: 'Simulasi TIU Batch 1',
    subIndicatorIds: ['SUB-01', 'SUB-04', 'SUB-08'],
    questionCount: 5,
    order: 'random',
    allowAnswerChange: false,
  });
  assert.equal(sessionRes.joinCode.length, 6);
  assert.ok(sessionRes.hostToken.startsWith('HOST-'));
  assert.equal(sessionRes.questionCount, 5);

  // 4 peserta bergabung (membuktikan tidak ada batas 3 pemain + penanganan nama duplikat)
  const p1 = await joinSession(ctx, { joinCode: sessionRes.joinCode, displayName: 'Andi' });
  const p2 = await joinSession(ctx, { joinCode: sessionRes.joinCode, displayName: 'Andi' }); // harus menjadi Andi (2)
  const p3 = await joinSession(ctx, { joinCode: sessionRes.joinCode, displayName: 'Budi' });
  const p4 = await joinSession(ctx, { joinCode: sessionRes.joinCode, displayName: 'Citra' });

  assert.equal(p1.displayName, 'Andi');
  assert.equal(p2.displayName, 'Andi (2)');
  assert.equal(p1.recovered, false);

  // Tes recovery token saat refresh browser
  const p1Recovered = await joinSession(ctx, {
    joinCode: sessionRes.joinCode,
    displayName: 'Andi',
    participantToken: p1.participantToken,
  });
  assert.equal(p1Recovered.recovered, true);
  assert.equal(p1Recovered.participantId, p1.participantId);

  // Mulai sesi oleh Host
  await hostDispatch(ctx, {
    joinCode: sessionRes.joinCode,
    hostToken: sessionRes.hostToken,
    action: { type: 'START_SESSION' },
  });

  // Ambil snapshot peserta 1 saat in_progress: pastikan kunci & pembahasan TIDAK bocor
  const snapInProgress = await getParticipantSnapshot(ctx, {
    joinCode: sessionRes.joinCode,
    participantToken: p1.participantToken,
  });
  assert.equal(snapInProgress.session.status, 'in_progress');
  assert.equal(snapInProgress.questions.length, 5);
  for (const q of snapInProgress.questions) {
    assert.equal('correctOption' in q, false, 'correctOption TIDAK BOLEH bocor saat in_progress');
    assert.equal('explanation' in q, false, 'explanation TIDAK BOLEH bocor saat in_progress');
    assert.equal('explanationParts' in q, false, 'explanationParts TIDAK BOLEH bocor saat in_progress');
  }

  // Pastikan endpoint getReviewQuestion terkunci rapat saat in_progress
  await assert.rejects(
    async () => {
      await getReviewQuestion(ctx, { joinCode: sessionRes.joinCode, questionIndex: 0 });
    },
    /FORBIDDEN_REVIEW_LOCKED/,
    'getReviewQuestion harus menolak akses saat sesi masih in_progress'
  );

  // Pastikan Host tidak bisa langsung OPEN_REVIEW jika peserta belum selesai semua
  await assert.rejects(
    async () => {
      await hostDispatch(ctx, {
        joinCode: sessionRes.joinCode,
        hostToken: sessionRes.hostToken,
        action: { type: 'OPEN_REVIEW' },
      });
    },
    /Pembahasan belum dapat dibuka/,
    'OPEN_REVIEW harus ditolak selama masih ada peserta yang belum selesai'
  );

  // Pastikan END_SESSION meminta konfirmasi jika ada peserta yang belum selesai
  await assert.rejects(
    async () => {
      await hostDispatch(ctx, {
        joinCode: sessionRes.joinCode,
        hostToken: sessionRes.hostToken,
        action: { type: 'END_SESSION' },
      });
    },
    /UNFINISHED_PARTICIPANTS:/,
    'END_SESSION tanpa confirmUnfinished harus memberi peringatan peserta belum selesai'
  );

  // Simulasikan pengerjaan soal oleh p1 (semua 5 soal dijawab)
  const qMap = new Map(SEED_DATA.questions.map((q) => [q.id, q]));
  for (const sq of snapInProgress.questions) {
    const fullQ = qMap.get(sq.id)!;
    const res = await submitAnswer(ctx, {
      joinCode: sessionRes.joinCode,
      participantToken: p1.participantToken,
      questionId: sq.id,
      selectedOption: fullQ.correctOption as 'A' | 'B' | 'C' | 'D' | 'E', // p1 menjawab benar semua (skor 25)
    });
    assert.equal(res.saved, true);
    assert.equal('isCorrect' in res, false, 'Respons submitAnswer tidak boleh membocorkan isCorrect');
  }

  // Cek bahwa setelah p1 menjawab semua 5 soal, status p1 otomatis 'finished'
  const snapP1Done = await getParticipantSnapshot(ctx, {
    joinCode: sessionRes.joinCode,
    participantToken: p1.participantToken,
  });
  assert.equal(snapP1Done.participant.status, 'finished');
  // Tetapi karena p2, p3, p4 belum selesai, personalResult dan kunci jawaban masih terkunci!
  assert.equal(snapP1Done.personalResult, null, 'Ringkasan personal belum boleh terbuka sebelum seluruh peserta selesai');

  // Sekarang p2 menjawab 3 benar, 2 salah lalu selesai
  for (let i = 0; i < snapInProgress.questions.length; i++) {
    const sq = snapInProgress.questions[i];
    const fullQ = qMap.get(sq.id)!;
    const wrongOpt = (['A', 'B', 'C', 'D', 'E'] as const).find((o) => o !== fullQ.correctOption)!;
    await submitAnswer(ctx, {
      joinCode: sessionRes.joinCode,
      participantToken: p2.participantToken,
      questionId: sq.id,
      selectedOption: (i < 3 ? fullQ.correctOption : wrongOpt) as 'A' | 'B' | 'C' | 'D' | 'E',
    });
  }

  // p3 dan p4 klik selesai sekarang (finishParticipantSession)
  await finishParticipantSession(ctx, { joinCode: sessionRes.joinCode, participantToken: p3.participantToken });
  await finishParticipantSession(ctx, { joinCode: sessionRes.joinCode, participantToken: p4.participantToken });

  // Cek status sesi otomatis menjadi 'completed' setelah seluruh peserta selesai
  const hostSnapCompleted = await getHostSnapshot(ctx, { joinCode: sessionRes.joinCode });
  assert.equal(hostSnapCompleted.session.status, 'completed');
  assert.equal(hostSnapCompleted.session.canOpenReview, true);
  assert.equal(hostSnapCompleted.leaderboard[0].displayName, 'Andi');
  assert.equal(hostSnapCompleted.leaderboard[0].score, 25);
  assert.equal(hostSnapCompleted.leaderboard[1].displayName, 'Andi (2)');
  assert.equal(hostSnapCompleted.leaderboard[1].score, 15);

  // Sekarang Host membuka Mode Pembahasan Kelas (OPEN_REVIEW)
  await hostDispatch(ctx, {
    joinCode: sessionRes.joinCode,
    hostToken: sessionRes.hostToken,
    action: { type: 'OPEN_REVIEW' },
  });

  // Verifikasi di mode review_open: peserta dan layar kelas dapat mengakses kunci, pembahasan 8 bagian, dan ringkasan personal
  const snapReview = await getParticipantSnapshot(ctx, {
    joinCode: sessionRes.joinCode,
    participantToken: p2.participantToken,
  });
  assert.equal(snapReview.session.status, 'review_open');
  assert.ok(snapReview.personalResult, 'personalResult harus tersedia saat review_open');
  assert.equal(snapReview.personalResult.score, 15);
  assert.equal(snapReview.personalResult.correctCount, 3);
  assert.equal(snapReview.personalResult.wrongCount, 2);
  assert.ok(snapReview.questions[0].correctOption, 'correctOption harus terbuka saat review_open');
  assert.ok(snapReview.questions[0].explanationParts, 'explanationParts harus terbuka saat review_open');

  const reviewQ1 = await getReviewQuestion(ctx, { joinCode: sessionRes.joinCode, questionIndex: 0 });
  assert.equal(reviewQ1.sequenceNumber, 1);
  assert.ok(reviewQ1.correctOption);
  assert.ok(reviewQ1.explanationParts.coreQuestion.length > 0);

  console.log('✓ Simulasi siklus sesi, multi-peserta, proteksi kunci jawaban, leaderboard, dan review_open lulus 100%.');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
