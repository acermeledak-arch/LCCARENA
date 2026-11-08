import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import type http from 'node:http';
import { LccEngine, AppError, computeStandings } from './src/engine.ts';
import { encodeQrMatrix, renderQrSvg } from './src/qr.ts';
import { createAppServer } from './server.ts';

console.log('=== LCC ARENA — Automated Verification Suite ===');

// 1. Bank Soal & QR Verification
{
  const engine = new LccEngine(':memory:');
  const summary = engine.getBankSummary();
  assert.equal(summary.totalQuestions, 39, 'Harus tepat 39 soal aktif');
  assert.equal(summary.indicators.length, 13, 'Harus tepat 13 indikator');
  for (const ind of summary.indicators as { id: string; questionCount: number }[]) {
    assert.equal(ind.questionCount, 3, `Indikator ${ind.id} harus memiliki 3 soal`);
  }

  const q003 = engine.db.prepare(`SELECT correct_option FROM questions WHERE id = 'Q003'`).get() as { correct_option: string };
  assert.equal(q003.correct_option, 'B', 'Kunci Q003 wajib B (24 poin)');
  const q037 = engine.db.prepare(`SELECT question_text, options_json FROM questions WHERE id = 'Q037'`).get() as {
    question_text: string;
    options_json: string;
  };
  assert.ok(q037.question_text.includes('x + 3 < 8'), 'Simbol < pada Q037 harus terjaga');
  assert.ok(q037.options_json.includes('x < 5'), 'Opsi Q037 harus menjaga simbol <');

  const url = 'http://192.168.1.10:3000/controller/ABC234#t=2345-6789-ABCD';
  const matrix = encodeQrMatrix(url);
  assert.ok(matrix && matrix.length >= 29, 'Matrix QR harus terbentuk untuk URL LAN');
  assert.equal(matrix[0][0], true, 'Top-left finder corner harus gelap');
  assert.equal(matrix[1][1], false, 'Top-left finder ring dalam harus terang');
  assert.equal(matrix[3][3], true, 'Top-left finder core harus gelap');
  const svg = renderQrSvg(url);
  assert.ok(svg.startsWith('<svg ') && svg.includes('<path '), 'SVG QR harus valid');

  engine.close();
  console.log('[PASS] Phase 1: Bank Soal (39 soal, 13 indikator, Q003=B, simbol) & Offline QR SVG');
}

// 2. Game Engine State Machine, Timer Freeze/Resume, Security & Idempotency
{
  const engine = new LccEngine(':memory:');

  assert.throws(
    () => engine.createMatch({ players: ['Andi', 'andi', 'Budi'], mode: 'QUICK', questionCount: 3 }),
    (e: unknown) => e instanceof AppError && e.code === 'DUPLICATE_PLAYER_NAME',
  );
  assert.throws(
    () => engine.createMatch({ players: ['Andi', '  ', 'Budi'], mode: 'QUICK', questionCount: 3 }),
    (e: unknown) => e instanceof AppError && e.code === 'EMPTY_PLAYER_NAME',
  );
  assert.throws(
    () => engine.createMatch({ players: ['Andi', 'Budi', 'Citra'], mode: 'QUICK', questionCount: 50 }),
    (e: unknown) => e instanceof AppError && e.code === 'INSUFFICIENT_QUESTIONS',
  );

  const t0 = 1_000_000;
  const { roomCode, controllerToken, snapshot } = engine.createMatch(
    {
      players: ['Andi', 'Budi', 'Citra'],
      mode: 'QUICK',
      questionCount: 3,
      order: 'sequential',
      durationSeconds: 20,
      pointsCorrect: 10,
    },
    t0,
  );
  assert.equal(snapshot.match.status, 'LOBBY');
  const [p1, p2, p3] = snapshot.players;

  assert.throws(
    () => engine.dispatchAction(roomCode, 'XXXX-YYYY-ZZZZ', { type: 'START_MATCH' }, t0 + 100),
    (e: unknown) => e instanceof AppError && e.statusCode === 401,
  );

  engine.dispatchAction(roomCode, controllerToken, { type: 'START_MATCH' }, t0 + 100);
  const dispReady = engine.getSnapshot(roomCode, 'display', t0 + 100);
  const ctrlReady = engine.getSnapshot(roomCode, 'controller', t0 + 100);
  assert.equal(dispReady.match.status, 'READY');
  assert.equal(dispReady.currentQuestion?.questionText, null);
  assert.equal(dispReady.currentQuestion?.correctOption, null);
  assert.ok(ctrlReady.currentQuestion?.questionText);
  assert.ok(ctrlReady.currentQuestion?.correctOption);

  // Q1 starts at t=10_000 (deadline=30_000)
  engine.dispatchAction(roomCode, controllerToken, { type: 'START_QUESTION' }, 10_000);
  assert.equal(engine.getSnapshot(roomCode, 'display', 10_000).currentQuestion?.deadlineAt, 30_000);

  // Select P1 at 15_400 (rem=14_600) -> cancel at 18_000 (deadline=32_600)
  engine.dispatchAction(roomCode, controllerToken, { type: 'SELECT_PLAYER', playerId: p1.id }, 15_400);
  let snap = engine.getSnapshot(roomCode, 'display', 17_000);
  assert.equal(snap.match.status, 'ANSWERING');
  assert.equal(snap.currentQuestion?.remainingMs, 14_600);
  engine.dispatchAction(roomCode, controllerToken, { type: 'CANCEL_SELECTION' }, 18_000);
  snap = engine.getSnapshot(roomCode, 'display', 18_000);
  assert.equal(snap.match.status, 'RUNNING');
  assert.equal(snap.currentQuestion?.deadlineAt, 32_600);

  // P1 wrong at 22_600 (rem=10_000), judged at 25_000 -> deadline=35_000
  engine.dispatchAction(roomCode, controllerToken, { type: 'SELECT_PLAYER', playerId: p1.id }, 22_600);
  engine.dispatchAction(roomCode, controllerToken, { type: 'JUDGE_WRONG' }, 25_000);
  snap = engine.getSnapshot(roomCode, 'display', 25_000);
  assert.equal(snap.match.status, 'RUNNING');
  assert.equal(snap.currentQuestion?.deadlineAt, 35_000);
  assert.equal(snap.players[0].score, 0);

  assert.throws(
    () => engine.dispatchAction(roomCode, controllerToken, { type: 'SELECT_PLAYER', playerId: p1.id }, 26_000),
    (e: unknown) => e instanceof AppError && e.code === 'PLAYER_ALREADY_ATTEMPTED',
  );

  // Pause at 27_000 (rem=8_000), resume at 40_000 (deadline=48_000)
  engine.dispatchAction(roomCode, controllerToken, { type: 'PAUSE_MATCH' }, 27_000);
  assert.equal(engine.getSnapshot(roomCode, 'display', 35_000).currentQuestion?.remainingMs, 8_000);
  engine.dispatchAction(roomCode, controllerToken, { type: 'RESUME_MATCH' }, 40_000);
  assert.equal(engine.getSnapshot(roomCode, 'display', 40_000).currentQuestion?.deadlineAt, 48_000);

  // P2 correct + idempotency + double-click protection
  engine.dispatchAction(roomCode, controllerToken, { type: 'SELECT_PLAYER', playerId: p2.id }, 42_000);
  engine.dispatchAction(roomCode, controllerToken, { type: 'JUDGE_CORRECT', actionId: 'act-1' }, 43_000);
  engine.dispatchAction(roomCode, controllerToken, { type: 'JUDGE_CORRECT', actionId: 'act-1' }, 43_050);
  assert.throws(
    () => engine.dispatchAction(roomCode, controllerToken, { type: 'JUDGE_CORRECT', actionId: 'act-2' }, 43_100),
    (e: unknown) => e instanceof AppError && e.statusCode === 409,
  );
  snap = engine.getSnapshot(roomCode, 'display', 43_200);
  assert.equal(snap.players[1].score, 10);
  assert.equal(snap.currentQuestion?.correctOption, null);

  engine.dispatchAction(roomCode, controllerToken, { type: 'REVEAL_ANSWER', reveal: true }, 43_500);
  assert.ok(engine.getSnapshot(roomCode, 'display', 43_500).currentQuestion?.correctOption);

  // Q2: All 3 wrong -> immediate finish
  engine.dispatchAction(roomCode, controllerToken, { type: 'NEXT_QUESTION' }, 50_000);
  engine.dispatchAction(roomCode, controllerToken, { type: 'START_QUESTION' }, 51_000);
  for (const [idx, pl] of [p1, p2, p3].entries()) {
    engine.dispatchAction(roomCode, controllerToken, { type: 'SELECT_PLAYER', playerId: pl.id }, 52_000 + idx * 2000);
    engine.dispatchAction(roomCode, controllerToken, { type: 'JUDGE_WRONG' }, 53_000 + idx * 2000);
  }
  snap = engine.getSnapshot(roomCode, 'display', 58_000);
  assert.equal(snap.match.status, 'QUESTION_FINISHED');
  assert.equal(snap.currentQuestion?.result, 'ALL_WRONG');

  // Q3: Timeout + score adjustment + tie ranking
  engine.dispatchAction(roomCode, controllerToken, { type: 'NEXT_QUESTION' }, 60_000);
  engine.dispatchAction(roomCode, controllerToken, { type: 'START_QUESTION' }, 61_000);
  assert.throws(
    () => engine.dispatchAction(roomCode, controllerToken, { type: 'SELECT_PLAYER', playerId: p1.id }, 81_005),
    (e: unknown) => e instanceof AppError && e.code === 'INVALID_STATE',
  );
  snap = engine.getSnapshot(roomCode, 'display', 81_010);
  assert.equal(snap.currentQuestion?.result, 'TIMEOUT');

  engine.dispatchAction(
    roomCode,
    controllerToken,
    { type: 'ADJUST_SCORE', playerId: p1.id, delta: 10, reason: 'Koreksi salah tekan tombol' },
    82_500,
  );
  assert.equal(engine.getHistoryDetail(roomCode).questions[0].correctOption, null);

  engine.dispatchAction(roomCode, controllerToken, { type: 'NEXT_QUESTION' }, 85_000);
  const finalSnap = engine.getSnapshot(roomCode, 'display', 85_000);
  assert.equal(finalSnap.match.status, 'MATCH_FINISHED');
  assert.equal(finalSnap.standings[0].rank, 1);
  assert.equal(finalSnap.standings[0].isTied, true);
  assert.equal(finalSnap.standings[1].rank, 1);
  assert.equal(finalSnap.standings[2].rank, 3);

  const fullHistory = engine.getHistoryDetail(roomCode);
  assert.ok(fullHistory.questions[0].correctOption);
  assert.equal(fullHistory.scoreAdjustments.length, 1);
  engine.deleteHistory(fullHistory.id);
  assert.equal(engine.listHistory().length, 0);

  const threeWay = computeStandings([
    { id: '1', seatNumber: 1, score: 20 },
    { id: '2', seatNumber: 2, score: 20 },
    { id: '3', seatNumber: 3, score: 20 },
  ]);
  assert.deepEqual(threeWay.standings.map((s) => [s.rank, s.isTied]), [
    [1, true],
    [1, true],
    [1, true],
  ]);

  engine.close();
  console.log('[PASS] Phase 2: State Machine, Timer Freeze/Resume, Security, Audit Log & Tie Ranking');
}

// 3. Full Two-Device HTTP + SSE Realtime Simulation (IFP Display + Mobile Controller)
function createInProcessClient(server: http.Server) {
  async function request(method: string, urlPath: string, opts: { headers?: Record<string, string>; body?: unknown } = {}) {
    const reqStream = new PassThrough();
    const req = Object.assign(reqStream, {
      method,
      url: urlPath,
      headers: {
        host: 'localhost:3000',
        ...Object.fromEntries(Object.entries(opts.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v])),
      },
      socket: { remoteAddress: '127.0.0.1' },
    }) as unknown as http.IncomingMessage;

    const resStream = new PassThrough();
    let statusCode = 200;
    const res = Object.assign(resStream, {
      writeHead(code: number) {
        statusCode = code;
        return res;
      },
    }) as unknown as http.ServerResponse;

    server.emit('request', req, res);
    if (opts.body !== undefined) reqStream.end(JSON.stringify(opts.body));
    else reqStream.end();

    const chunks: Buffer[] = [];
    for await (const c of resStream) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
    const text = Buffer.concat(chunks).toString('utf8');
    return {
      status: statusCode,
      text: () => text,
      json: () => JSON.parse(text),
    };
  }

  async function openSse(urlPath: string) {
    const reqStream = new PassThrough();
    const req = Object.assign(reqStream, {
      method: 'GET',
      url: urlPath,
      headers: { host: 'localhost:3000' },
      socket: { remoteAddress: '127.0.0.1' },
    }) as unknown as http.IncomingMessage;

    const resStream = new PassThrough();
    let statusCode = 200;
    let headResolved = false;
    let resolveHead!: (code: number) => void;
    const headPromise = new Promise<number>((r) => { resolveHead = r; });

    const res = Object.assign(resStream, {
      writeHead(code: number) {
        statusCode = code;
        if (!headResolved) {
          headResolved = true;
          resolveHead(code);
        }
        return res;
      },
    }) as unknown as http.ServerResponse;

    const events: Record<string, unknown>[] = [];
    let waiters: (() => void)[] = [];
    let buf = '';
    resStream.setEncoding('utf8');
    resStream.on('data', (chunk: string) => {
      buf += chunk;
      const frames = buf.split('\n\n');
      buf = frames.pop() ?? '';
      for (const f of frames) {
        const dataLine = f.split('\n').find((l) => l.startsWith('data: '));
        if (dataLine) {
          try {
            const parsed = JSON.parse(dataLine.slice(6));
            if (parsed.match) {
              events.push(parsed);
              const pending = waiters;
              waiters = [];
              pending.forEach((w) => w());
            }
          } catch { /* ignore */ }
        }
      }
    });

    server.emit('request', req, res);
    reqStream.end();
    const code = await headPromise;

    const waitFor = async (pred: (ev: Record<string, unknown>) => boolean, timeoutMs = 2000) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const hit = [...events].reverse().find(pred);
        if (hit) return hit;
        await new Promise<void>((r) => {
          const t = setTimeout(r, 25);
          waiters.push(() => { clearTimeout(t); r(); });
        });
      }
      throw new Error(`SSE waitFor timeout on ${urlPath}`);
    };

    return {
      statusCode: code,
      events,
      waitFor,
      close: () => {
        req.emit('close');
        resStream.destroy();
      },
    };
  }

  return { request, openSse };
}

{
  const memEngine = new LccEngine(':memory:');
  const { server, shutdown } = createAppServer(memEngine);
  const client = createInProcessClient(server);

  try {
    // Static SPA & assets check
    const spaRes = await client.request('GET', '/display/DEMO01');
    assert.equal(spaRes.status, 200);
    assert.ok(spaRes.text().includes('<div id="app"'));

    const cssRes = await client.request('GET', '/styles.css');
    assert.equal(cssRes.status, 200);

    const qrRes = await client.request('GET', `/api/qr?text=${encodeURIComponent('http://192.168.1.5:3000/display/DEMO01')}`);
    assert.equal(qrRes.status, 200);
    assert.ok(qrRes.text().includes('<svg'));

    // Audio assets check
    const correctMp3Res = await client.request('GET', '/correct.mp3');
    assert.equal(correctMp3Res.status, 200);
    const falseMp3Res = await client.request('GET', '/false.mp3');
    assert.equal(falseMp3Res.status, 200);

    // Create 2-question match
    const createRes = await client.request('POST', '/api/matches', {
      body: {
        players: ['Regu Alpha', 'Regu Beta', 'Regu Gamma'],
        mode: 'CATEGORY',
        indicatorIds: ['IND-01'],
        levels: [1, 2],
        durationSeconds: 20,
        pointsCorrect: 10,
      },
    });
    assert.equal(createRes.status, 201);
    const created = createRes.json() as {
      roomCode: string;
      controllerToken: string;
      snapshot: { players: { id: string }[] };
    };
    const { roomCode, controllerToken } = created;
    const [pA, pB] = created.snapshot.players;

    // Unauthorized controller SSE must be rejected 401
    const badCtrl = await client.openSse(`/api/matches/${roomCode}/stream?role=controller&token=WRONG`);
    assert.equal(badCtrl.statusCode, 401);

    // Connect Device 1 (IFP Display) & Device 2 (Mobile Controller) simultaneously
    const displayStream = await client.openSse(`/api/matches/${roomCode}/stream?role=display`);
    const ctrlStream = await client.openSse(
      `/api/matches/${roomCode}/stream?role=controller&token=${encodeURIComponent(controllerToken)}`,
    );
    assert.equal(displayStream.statusCode, 200);
    assert.equal(ctrlStream.statusCode, 200);

    // Both devices detect presence { display: 1, controller: 1 }
    await ctrlStream.waitFor((ev) => (ev.connections as { display: number }).display === 1);
    await displayStream.waitFor((ev) => (ev.connections as { controller: number }).controller === 1);

    const postAction = async (body: Record<string, unknown>) => {
      const r = await client.request('POST', `/api/matches/${roomCode}/action`, {
        headers: { 'X-Controller-Token': controllerToken },
        body,
      });
      assert.equal(r.status, 200);
      return r.json();
    };

    // Play Question 1: Start Match -> Start Question -> Regu Alpha WRONG -> Regu Beta CORRECT -> Reveal Answer
    await postAction({ type: 'START_MATCH' });
    await displayStream.waitFor((ev) => (ev.match as { status: string }).status === 'READY');

    await postAction({ type: 'START_QUESTION' });
    const dispQ1Running = await displayStream.waitFor(
      (ev) => (ev.match as { status: string }).status === 'RUNNING',
    );
    assert.equal((dispQ1Running.currentQuestion as { correctOption: unknown }).correctOption, null);

    await postAction({ type: 'SELECT_PLAYER', playerId: pA.id });
    await displayStream.waitFor((ev) => (ev.match as { status: string }).status === 'ANSWERING');

    await postAction({ type: 'JUDGE_WRONG' });
    await displayStream.waitFor(
      (ev) =>
        (ev.match as { status: string }).status === 'RUNNING' &&
        ((ev.currentQuestion as { attemptedPlayerIds: string[] }).attemptedPlayerIds || []).includes(pA.id),
    );

    await postAction({ type: 'SELECT_PLAYER', playerId: pB.id });
    await postAction({ type: 'JUDGE_CORRECT' });
    const dispFinished = await displayStream.waitFor(
      (ev) => (ev.match as { status: string }).status === 'QUESTION_FINISHED',
    );
    assert.equal((dispFinished.currentQuestion as { correctOption: unknown }).correctOption, null);

    await postAction({ type: 'REVEAL_ANSWER', reveal: true });
    const dispRevealed = await displayStream.waitFor((ev) =>
      Boolean((ev.currentQuestion as { correctOption?: string | null } | null)?.correctOption),
    );
    assert.equal((dispRevealed.currentQuestion as { correctOption: string }).correctOption, 'B'); // Q001 = B

    // Simulate Browser Refresh on IFP Display mid-match -> state stays intact
    displayStream.close();
    const refreshRes = await client.request('GET', `/api/matches/${roomCode}`);
    assert.equal(refreshRes.status, 200);
    const refreshed = refreshRes.json() as { players: { score: number }[]; match: { status: string } };
    assert.equal(refreshed.players[1].score, 10);
    assert.equal(refreshed.match.status, 'QUESTION_FINISHED');

    const displayReconnected = await client.openSse(`/api/matches/${roomCode}/stream?role=display`);

    // Play Question 2 & finish match -> Podium on IFP Display
    await postAction({ type: 'NEXT_QUESTION' });
    await postAction({ type: 'START_QUESTION' });
    await postAction({ type: 'SELECT_PLAYER', playerId: pB.id });
    await postAction({ type: 'JUDGE_CORRECT' });
    await postAction({ type: 'NEXT_QUESTION' }); // Advances past Q2/2 -> MATCH_FINISHED

    const dispPodium = await displayReconnected.waitFor(
      (ev) => (ev.match as { status: string }).status === 'MATCH_FINISHED',
    );
    assert.equal((dispPodium.standings as { score: number }[])[0].score, 20);

    // Verify History API
    const histListRes = await client.request('GET', '/api/history');
    const histList = histListRes.json() as { items: { id: string; roomCode: string }[] };
    assert.equal(histList.items.length, 1);
    assert.equal(histList.items[0].roomCode, roomCode);

    displayReconnected.close();
    ctrlStream.close();
    console.log('[PASS] Phase 3–5: Two-Device HTTP + SSE Realtime Sync, Refresh Recovery & History E2E');
  } finally {
    await shutdown();
    memEngine.close();
  }
}

console.log('\nALL CHECKS PASSED SUCCESSFULLY.');
