import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { SEED_DATA } from './seedData';

const SAFE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const PLAYER_COLORS = ['#3b82f6', '#a855f7', '#06b6d4'] as const;

function randomCode(len: number): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += SAFE_ALPHABET[Math.floor(Math.random() * SAFE_ALPHABET.length)];
  }
  return out;
}

function generateControllerToken(): string {
  return `${randomCode(4)}-${randomCode(4)}-${randomCode(4)}`;
}

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token.trim().toUpperCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function computeStandings<T extends { _id: string; seatNumber: number; score: number }>(players: T[]) {
  const withRank = players.map((p) => {
    const higher = players.filter((other) => other.score > p.score).length;
    const same = players.filter((other) => other.score === p.score).length;
    return { ...p, rank: 1 + higher, isTied: same > 1 };
  });
  const standings = [...withRank].sort((a, b) => b.score - a.score || a.seatNumber - b.seatNumber);
  return { bySeat: [...withRank].sort((a, b) => a.seatNumber - b.seatNumber), standings };
}

// Ensure seed questions & indicators are initialized in Convex DB
export const ensureSeed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('questions').first();
    if (existing) return { initialized: false };

    for (const ind of SEED_DATA.indicators) {
      await ctx.db.insert('indicators', {
        id: ind.id,
        category: ind.category,
        topic: ind.topic,
        indicatorText: ind.indicator_text,
        sortOrder: ind.sort_order,
      });
    }

    for (const q of SEED_DATA.questions) {
      await ctx.db.insert('questions', {
        id: q.id,
        indicatorId: q.indicator_id,
        category: q.category,
        topic: q.topic,
        level: q.level,
        difficulty: q.difficulty as 'easy' | 'medium',
        question: q.question,
        options: q.options,
        correctOption: q.correct_option as 'A' | 'B' | 'C' | 'D',
        explanation: q.explanation,
        points: q.points,
        recommendedTimeSeconds: q.recommended_time_seconds,
        isActive: q.is_active,
      });
    }

    return { initialized: true, total: SEED_DATA.questions.length };
  },
});

export const getBankSummary = query({
  args: {},
  handler: async (ctx) => {
    const indicators = await ctx.db.query('indicators').collect();
    indicators.sort((a, b) => a.sortOrder - b.sortOrder);
    const questions = await ctx.db.query('questions').collect();

    const withCount = indicators.map((ind) => {
      const qCount = questions.filter((q) => q.indicatorId === ind.id && q.isActive).length;
      return { ...ind, questionCount: qCount };
    });

    return {
      indicators: withCount,
      totalQuestions: questions.filter((q) => q.isActive).length,
    };
  },
});

export const createMatch = mutation({
  args: {
    players: v.array(v.string()),
    mode: v.union(v.literal('FULL'), v.literal('CATEGORY'), v.literal('QUICK')),
    indicatorIds: v.optional(v.array(v.string())),
    levels: v.optional(v.array(v.number())),
    questionCount: v.optional(v.number()),
    allowRepeat: v.optional(v.boolean()),
    order: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
    pointsCorrect: v.optional(v.number()),
    showOptionsOnDisplay: v.optional(v.boolean()),
    allowAnswerReveal: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Auto-seed if database is fresh
    const anyQ = await ctx.db.query('questions').first();
    if (!anyQ) {
      for (const ind of SEED_DATA.indicators) {
        await ctx.db.insert('indicators', {
          id: ind.id,
          category: ind.category,
          topic: ind.topic,
          indicatorText: ind.indicator_text,
          sortOrder: ind.sort_order,
        });
      }
      for (const q of SEED_DATA.questions) {
        await ctx.db.insert('questions', {
          id: q.id,
          indicatorId: q.indicator_id,
          category: q.category,
          topic: q.topic,
          level: q.level,
          difficulty: q.difficulty as 'easy' | 'medium',
          question: q.question,
          options: q.options,
          correctOption: q.correct_option as 'A' | 'B' | 'C' | 'D',
          explanation: q.explanation,
          points: q.points,
          recommendedTimeSeconds: q.recommended_time_seconds,
          isActive: q.is_active,
        });
      }
    }

    if (!Array.isArray(args.players) || args.players.length !== 3) {
      throw new Error('Pertandingan wajib diikuti tepat 3 peserta.');
    }
    const cleanNames = args.players.map((raw) =>
      typeof raw === 'string' ? raw.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim() : '',
    );
    for (let i = 0; i < 3; i++) {
      if (!cleanNames[i]) throw new Error(`Nama Peserta ${i + 1} tidak boleh kosong.`);
      if (cleanNames[i].length > 40) throw new Error(`Nama Peserta ${i + 1} maksimal 40 karakter.`);
    }
    if (new Set(cleanNames.map((n) => n.toLowerCase())).size !== 3) {
      throw new Error('Nama ketiga peserta harus unik.');
    }

    const durationSeconds = args.durationSeconds ?? 20;
    const pointsCorrect = args.pointsCorrect ?? 10;
    const order = args.order === 'random' ? 'random' : 'sequential';
    const showOptionsOnDisplay = args.showOptionsOnDisplay !== false;
    const allowAnswerReveal = args.allowAnswerReveal !== false;
    const allowRepeat = Boolean(args.allowRepeat);

    const allIndicators = await ctx.db.query('indicators').collect();
    allIndicators.sort((a, b) => a.sortOrder - b.sortOrder);
    const validIndSet = new Set(allIndicators.map((i) => i.id));

    let indicatorIds: string[];
    if (args.mode === 'FULL') {
      indicatorIds = allIndicators.map((i) => i.id);
    } else if (args.mode === 'CATEGORY') {
      if (!Array.isArray(args.indicatorIds) || args.indicatorIds.length === 0) {
        throw new Error('Pilih minimal satu indikator untuk Category Challenge.');
      }
      indicatorIds = [...new Set(args.indicatorIds)];
      for (const id of indicatorIds) {
        if (!validIndSet.has(id)) throw new Error(`Indikator tidak dikenal: ${id}`);
      }
    } else {
      indicatorIds =
        Array.isArray(args.indicatorIds) && args.indicatorIds.length > 0
          ? [...new Set(args.indicatorIds.filter((id) => validIndSet.has(id)))]
          : allIndicators.map((i) => i.id);
    }

    const levels =
      args.mode === 'FULL'
        ? [1, 2, 3]
        : Array.isArray(args.levels) && args.levels.length > 0
          ? [...new Set(args.levels.filter((l) => [1, 2, 3].includes(l)))].sort()
          : [1, 2, 3];

    const allQ = await ctx.db.query('questions').collect();
    const indIdSet = new Set(indicatorIds);
    const lvlSet = new Set(levels);
    const pool = allQ.filter((q) => q.isActive && indIdSet.has(q.indicatorId) && lvlSet.has(q.level));

    if (pool.length === 0) throw new Error('Tidak ada soal yang tersedia untuk filter yang dipilih.');

    let selectedIds: string[];
    if (args.mode === 'QUICK') {
      const requested = args.questionCount ?? Math.min(10, pool.length);
      if (!allowRepeat && requested > pool.length) {
        throw new Error(`Jumlah soal (${requested}) melebihi bank tersedia (${pool.length}).`);
      }
      selectedIds = [];
      let lastId = '';
      while (selectedIds.length < requested) {
        const batch = order === 'random' ? shuffleArray(pool.map((p) => p.id)) : pool.map((p) => p.id);
        if (batch.length > 1 && batch[0] === lastId) {
          [batch[0], batch[1]] = [batch[1], batch[0]];
        }
        const needed = requested - selectedIds.length;
        const slice = batch.slice(0, needed);
        selectedIds.push(...slice);
        lastId = slice[slice.length - 1];
      }
    } else {
      const ids = pool.map((p) => p.id);
      selectedIds = order === 'random' ? shuffleArray(ids) : ids;
    }

    let roomCode = '';
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = randomCode(6);
      const exists = await ctx.db
        .query('matches')
        .withIndex('by_roomCode', (q) => q.eq('roomCode', candidate))
        .first();
      if (!exists) {
        roomCode = candidate;
        break;
      }
    }
    if (!roomCode) throw new Error('Gagal membuat kode ruang unik.');

    const controllerToken = generateControllerToken();
    const controllerTokenHash = await hashToken(controllerToken);
    const now = Date.now();
    const durationMs = durationSeconds * 1000;

    const matchId = await ctx.db.insert('matches', {
      roomCode,
      controllerTokenHash,
      status: 'LOBBY',
      mode: args.mode,
      settings: {
        durationSeconds,
        pointsCorrect,
        order,
        showOptionsOnDisplay,
        allowAnswerReveal,
        indicatorIds,
        levels,
        questionCount: selectedIds.length,
        allowRepeat,
      },
      currentQuestionIndex: 0,
      currentQuestionId: selectedIds[0],
      createdAt: now,
    });

    for (let i = 0; i < 3; i++) {
      await ctx.db.insert('matchPlayers', {
        matchId,
        seatNumber: i + 1,
        displayName: cleanNames[i],
        score: 0,
        themeColor: PLAYER_COLORS[i],
      });
    }

    for (let idx = 0; idx < selectedIds.length; idx++) {
      await ctx.db.insert('matchQuestions', {
        matchId,
        questionId: selectedIds[idx],
        sequenceNumber: idx + 1,
        status: 'PENDING',
        remainingMs: durationMs,
        deadlineAt: undefined,
        attemptedPlayerIds: [],
        selectedPlayerId: undefined,
        result: undefined,
        answerRevealed: false,
      });
    }

    await ctx.db.insert('matchEvents', {
      matchId,
      eventType: 'MATCH_CREATED',
      payload: { mode: args.mode, questionCount: selectedIds.length },
      createdAt: now,
    });

    return {
      matchId,
      roomCode,
      controllerToken,
    };
  },
});

export const getSnapshot = query({
  args: {
    roomCode: v.string(),
    role: v.union(v.literal('display'), v.literal('controller')),
  },
  handler: async (ctx, args) => {
    const code = args.roomCode.trim().toUpperCase();
    const match = await ctx.db
      .query('matches')
      .withIndex('by_roomCode', (q) => q.eq('roomCode', code))
      .first();

    if (!match) return null;

    const rawPlayers = await ctx.db
      .query('matchPlayers')
      .withIndex('by_match', (q) => q.eq('matchId', match._id))
      .collect();

    const { bySeat, standings } = computeStandings(rawPlayers);
    const allMatchQuestions = await ctx.db
      .query('matchQuestions')
      .withIndex('by_match', (q) => q.eq('matchId', match._id))
      .collect();
    allMatchQuestions.sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    let currentQuestion: Record<string, unknown> | null = null;
    const now = Date.now();

    if (match.status !== 'LOBBY') {
      const currentSeq = match.currentQuestionIndex + 1;
      const mq = allMatchQuestions.find((q) => q.sequenceNumber === currentSeq);

      if (mq) {
        const questionDef = await ctx.db
          .query('questions')
          .withIndex('by_question_id', (q) => q.eq('id', mq.questionId))
          .first();

        const rawAttempts = await ctx.db
          .query('answerAttempts')
          .withIndex('by_match_question', (q) => q.eq('matchQuestionId', mq._id))
          .collect();
        rawAttempts.sort((a, b) => a.createdAt - b.createdAt);

        const attempts = rawAttempts.map((a) => {
          const p = rawPlayers.find((pl) => pl._id === a.playerId);
          return {
            id: a._id,
            playerId: a.playerId,
            playerName: p ? p.displayName : 'Peserta',
            seatNumber: p ? p.seatNumber : 1,
            result: a.result,
            pointsAwarded: a.pointsAwarded,
            createdAt: a.createdAt,
          };
        });

        const isController = args.role === 'controller';
        const isPending = mq.status === 'PENDING';
        const isFinished = match.status === 'QUESTION_FINISHED' || match.status === 'MATCH_FINISHED';
        const revealed = mq.answerRevealed && match.settings.allowAnswerReveal && isFinished;

        const showQuestionText = isController || !isPending;
        const showOptions = isController || (!isPending && (match.settings.showOptionsOnDisplay || revealed));
        const showAnswerKey = isController || revealed;

        const liveRemainingMs =
          match.status === 'RUNNING' && typeof mq.deadlineAt === 'number'
            ? Math.max(0, mq.deadlineAt - now)
            : mq.remainingMs;

        currentQuestion = {
          matchQuestionId: mq._id,
          questionId: mq.questionId,
          sequenceNumber: mq.sequenceNumber,
          totalQuestions: allMatchQuestions.length,
          indicatorId: questionDef?.indicatorId,
          category: questionDef?.category,
          topic: questionDef?.topic,
          level: questionDef?.level,
          difficulty: questionDef?.difficulty,
          status: mq.status,
          result: mq.result,
          remainingMs: liveRemainingMs,
          deadlineAt: mq.deadlineAt,
          selectedPlayerId: mq.selectedPlayerId,
          attemptedPlayerIds: mq.attemptedPlayerIds,
          answerRevealed: mq.answerRevealed,
          questionText: showQuestionText ? questionDef?.question : null,
          options: showOptions ? questionDef?.options : null,
          correctOption: showAnswerKey ? questionDef?.correctOption : null,
          explanation: showAnswerKey ? questionDef?.explanation : null,
          attempts,
        };
      }
    }

    const adjustEvents = await ctx.db
      .query('matchEvents')
      .withIndex('by_match', (q) => q.eq('matchId', match._id))
      .filter((q) => q.eq(q.field('eventType'), 'SCORE_ADJUSTED'))
      .collect();
    adjustEvents.sort((a, b) => b.createdAt - a.createdAt);

    return {
      role: args.role,
      serverNow: now,
      match: {
        id: match._id,
        roomCode: match.roomCode,
        status: match.status,
        mode: match.mode,
        settings: match.settings,
        currentQuestionIndex: match.currentQuestionIndex,
        totalQuestions: allMatchQuestions.length,
        createdAt: match.createdAt,
        startedAt: match.startedAt,
        finishedAt: match.finishedAt,
      },
      players: bySeat.map((p) => ({
        id: p._id,
        seatNumber: p.seatNumber,
        displayName: p.displayName,
        score: p.score,
        themeColor: p.themeColor,
      })),
      standings: standings.map((p) => ({
        id: p._id,
        seatNumber: p.seatNumber,
        displayName: p.displayName,
        score: p.score,
        themeColor: p.themeColor,
        rank: p.rank,
        isTied: p.isTied,
      })),
      currentQuestion,
      scoreAdjustments: adjustEvents.map((ev) => ({
        id: ev._id,
        createdAt: ev.createdAt,
        ...ev.payload,
      })),
    };
  },
});

export const verifyToken = mutation({
  args: {
    roomCode: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const code = args.roomCode.trim().toUpperCase();
    const match = await ctx.db
      .query('matches')
      .withIndex('by_roomCode', (q) => q.eq('roomCode', code))
      .first();
    if (!match) throw new Error('Ruang tidak ditemukan.');

    const expected = match.controllerTokenHash;
    const actual = await hashToken(args.token);
    if (expected !== actual) throw new Error('Token controller tidak valid.');

    return { valid: true };
  },
});

export const dispatchAction = mutation({
  args: {
    roomCode: v.string(),
    token: v.string(),
    action: v.object({
      type: v.string(),
      actionId: v.optional(v.string()),
      playerId: v.optional(v.string()),
      delta: v.optional(v.number()),
      reason: v.optional(v.string()),
      reveal: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const code = args.roomCode.trim().toUpperCase();
    const match = await ctx.db
      .query('matches')
      .withIndex('by_roomCode', (q) => q.eq('roomCode', code))
      .first();
    if (!match) throw new Error('Ruang tidak ditemukan.');

    const actual = await hashToken(args.token);
    if (match.controllerTokenHash !== actual) throw new Error('Token controller tidak valid.');

    const action = args.action;
    const now = Date.now();

    // Idempotency: duplicate actionId returns without double mutation
    if (action.actionId) {
      const dup = await ctx.db
        .query('matchEvents')
        .withIndex('by_match_action', (q) => q.eq('matchId', match._id).eq('actionId', action.actionId))
        .first();
      if (dup) return { eventType: dup.eventType };
    }

    if (match.status === 'MATCH_FINISHED') {
      throw new Error('Pertandingan sudah selesai.');
    }

    const currentSeq = match.currentQuestionIndex + 1;
    const mq = await ctx.db
      .query('matchQuestions')
      .withIndex('by_match_seq', (q) => q.eq('matchId', match._id).eq('sequenceNumber', currentSeq))
      .first();

    let emittedEvent = action.type;

    switch (action.type) {
      case 'START_MATCH': {
        if (match.status !== 'LOBBY') throw new Error('Pertandingan hanya dapat dimulai dari LOBBY.');
        await ctx.db.patch(match._id, {
          status: 'READY',
          startedAt: now,
          currentQuestionIndex: 0,
        });
        emittedEvent = 'MATCH_STARTED';
        break;
      }

      case 'START_QUESTION': {
        if (match.status !== 'READY' || !mq) throw new Error('Soal hanya dapat dimulai saat status READY.');
        const deadlineAt = now + mq.remainingMs;
        await ctx.db.patch(mq._id, { status: 'RUNNING', deadlineAt });
        await ctx.db.patch(match._id, { status: 'RUNNING' });
        emittedEvent = 'QUESTION_STARTED';
        break;
      }

      case 'SELECT_PLAYER': {
        if (match.status !== 'RUNNING' || !mq) throw new Error('Pilih peserta saat timer berjalan.');
        if (!action.playerId) throw new Error('PlayerId wajib ada.');
        if (mq.attemptedPlayerIds.includes(action.playerId)) {
          throw new Error('Peserta ini sudah menjawab salah.');
        }
        const remainingMs = Math.max(0, (mq.deadlineAt ?? now) - now);
        await ctx.db.patch(mq._id, {
          status: 'ANSWERING',
          remainingMs,
          deadlineAt: undefined,
          selectedPlayerId: action.playerId,
        });
        await ctx.db.patch(match._id, { status: 'ANSWERING' });
        emittedEvent = 'PLAYER_SELECTED';
        break;
      }

      case 'CANCEL_SELECTION': {
        if (match.status !== 'ANSWERING' || !mq) throw new Error('Tidak ada pemilihan aktif.');
        const nextQStatus = mq.attemptedPlayerIds.length > 0 ? 'WRONG_RETRY' : 'RUNNING';
        const deadlineAt = now + mq.remainingMs;
        await ctx.db.patch(mq._id, {
          status: nextQStatus,
          deadlineAt,
          selectedPlayerId: undefined,
        });
        await ctx.db.patch(match._id, { status: 'RUNNING' });
        emittedEvent = 'PLAYER_SELECTION_CANCELLED';
        break;
      }

      case 'JUDGE_CORRECT': {
        if (match.status !== 'ANSWERING' || !mq || !mq.selectedPlayerId) {
          throw new Error('Penilaian BENAR hanya saat peserta menjawab.');
        }
        const pts = match.settings.pointsCorrect;
        const attempted = [...new Set([...mq.attemptedPlayerIds, mq.selectedPlayerId])];

        const player = await ctx.db.get(mq.selectedPlayerId as any);
        if (player) {
          await ctx.db.patch(player._id, { score: (player as any).score + pts });
        }

        await ctx.db.insert('answerAttempts', {
          matchQuestionId: mq._id,
          playerId: mq.selectedPlayerId,
          result: 'CORRECT',
          pointsAwarded: pts,
          createdAt: now,
        });

        await ctx.db.patch(mq._id, {
          status: 'FINISHED',
          result: 'CORRECT',
          deadlineAt: undefined,
          attemptedPlayerIds: attempted,
        });
        await ctx.db.patch(match._id, { status: 'QUESTION_FINISHED' });
        emittedEvent = 'ANSWER_CORRECT';
        break;
      }

      case 'JUDGE_WRONG': {
        if (match.status !== 'ANSWERING' || !mq || !mq.selectedPlayerId) {
          throw new Error('Penilaian SALAH hanya saat peserta menjawab.');
        }
        const attempted = [...new Set([...mq.attemptedPlayerIds, mq.selectedPlayerId])];

        await ctx.db.insert('answerAttempts', {
          matchQuestionId: mq._id,
          playerId: mq.selectedPlayerId,
          result: 'WRONG',
          pointsAwarded: 0,
          createdAt: now,
        });

        if (attempted.length < 3 && mq.remainingMs > 0) {
          const deadlineAt = now + mq.remainingMs;
          await ctx.db.patch(mq._id, {
            status: 'WRONG_RETRY',
            deadlineAt,
            selectedPlayerId: undefined,
            attemptedPlayerIds: attempted,
          });
          await ctx.db.patch(match._id, { status: 'RUNNING' });
        } else {
          const finalResult = attempted.length >= 3 ? 'ALL_WRONG' : 'TIMEOUT';
          await ctx.db.patch(mq._id, {
            status: 'FINISHED',
            result: finalResult,
            deadlineAt: undefined,
            selectedPlayerId: undefined,
            attemptedPlayerIds: attempted,
          });
          await ctx.db.patch(match._id, { status: 'QUESTION_FINISHED' });
        }
        emittedEvent = 'ANSWER_WRONG';
        break;
      }

      case 'PAUSE_MATCH': {
        if (match.status !== 'RUNNING' || !mq) throw new Error('Hanya bisa dijeda saat timer berjalan.');
        const remainingMs = Math.max(0, (mq.deadlineAt ?? now) - now);
        await ctx.db.patch(mq._id, { remainingMs, deadlineAt: undefined });
        await ctx.db.patch(match._id, { status: 'PAUSED' });
        emittedEvent = 'MATCH_PAUSED';
        break;
      }

      case 'RESUME_MATCH': {
        if (match.status !== 'PAUSED' || !mq) throw new Error('Pertandingan tidak sedang dijeda.');
        const nextQStatus = mq.attemptedPlayerIds.length > 0 ? 'WRONG_RETRY' : 'RUNNING';
        const deadlineAt = now + mq.remainingMs;
        await ctx.db.patch(mq._id, { status: nextQStatus, deadlineAt });
        await ctx.db.patch(match._id, { status: 'RUNNING' });
        emittedEvent = 'MATCH_RESUMED';
        break;
      }

      case 'REVEAL_ANSWER': {
        if (match.status !== 'QUESTION_FINISHED' || !mq) throw new Error('Hanya setelah soal selesai.');
        const nextVal = typeof action.reveal === 'boolean' ? action.reveal : !mq.answerRevealed;
        await ctx.db.patch(mq._id, { answerRevealed: nextVal });
        emittedEvent = 'ANSWER_REVEALED';
        break;
      }

      case 'NEXT_QUESTION': {
        if (match.status !== 'QUESTION_FINISHED') throw new Error('Selesaikan soal saat ini dulu.');
        const nextIdx = match.currentQuestionIndex + 1;
        const allMqs = await ctx.db
          .query('matchQuestions')
          .withIndex('by_match', (q) => q.eq('matchId', match._id))
          .collect();

        if (nextIdx < allMqs.length) {
          const nextMq = allMqs.find((q) => q.sequenceNumber === nextIdx + 1);
          await ctx.db.patch(match._id, {
            status: 'READY',
            currentQuestionIndex: nextIdx,
            currentQuestionId: nextMq?.questionId,
          });
          emittedEvent = 'NEXT_QUESTION';
        } else {
          await ctx.db.patch(match._id, {
            status: 'MATCH_FINISHED',
            finishedAt: now,
          });
          emittedEvent = 'MATCH_FINISHED';
        }
        break;
      }

      case 'ADJUST_SCORE': {
        if (!action.playerId || typeof action.delta !== 'number' || action.delta === 0) {
          throw new Error('Perubahan skor tidak valid.');
        }
        const reason = (action.reason || '').trim();
        if (reason.length < 3) throw new Error('Alasan koreksi skor wajib diisi.');

        const player = await ctx.db.get(action.playerId as any);
        if (!player) throw new Error('Peserta tidak ditemukan.');
        const newScore = (player as any).score + action.delta;
        if (newScore < 0) throw new Error('Skor tidak boleh negatif.');

        await ctx.db.patch(player._id, { score: newScore });
        await ctx.db.insert('matchEvents', {
          matchId: match._id,
          actionId: action.actionId,
          eventType: 'SCORE_ADJUSTED',
          payload: {
            playerId: player._id,
            playerName: (player as any).displayName,
            oldScore: (player as any).score,
            newScore,
            delta: action.delta,
            reason,
          },
          createdAt: now,
        });
        return { eventType: 'SCORE_ADJUSTED' };
      }

      case 'END_MATCH': {
        if (mq && !['FINISHED', 'TIMEOUT', 'PENDING'].includes(mq.status)) {
          const rem = match.status === 'RUNNING' ? Math.max(0, (mq.deadlineAt ?? now) - now) : mq.remainingMs;
          await ctx.db.patch(mq._id, {
            status: 'FINISHED',
            result: mq.result || 'ABORTED',
            remainingMs: rem,
            deadlineAt: undefined,
            selectedPlayerId: undefined,
          });
        }
        await ctx.db.patch(match._id, {
          status: 'MATCH_FINISHED',
          finishedAt: now,
        });
        emittedEvent = 'MATCH_FINISHED';
        break;
      }

      default:
        throw new Error('Aksi tidak dikenal.');
    }

    await ctx.db.insert('matchEvents', {
      matchId: match._id,
      actionId: action.actionId,
      eventType: emittedEvent,
      payload: {},
      createdAt: now,
    });

    return { eventType: emittedEvent };
  },
});

export const listHistory = query({
  args: { dateFilter: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const matches = await ctx.db.query('matches').collect();
    matches.sort((a, b) => b.createdAt - a.createdAt);

    const result = [];
    for (const m of matches) {
      if (args.dateFilter && /^\d{4}-\d{2}-\d{2}$/.test(args.dateFilter)) {
        const d = new Date(m.createdAt);
        const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (local !== args.dateFilter) continue;
      }

      const players = await ctx.db
        .query('matchPlayers')
        .withIndex('by_match', (q) => q.eq('matchId', m._id))
        .collect();
      const { standings } = computeStandings(players);

      result.push({
        id: m._id,
        roomCode: m.roomCode,
        status: m.status,
        mode: m.mode,
        questionCount: m.settings.questionCount,
        durationSeconds: m.settings.durationSeconds,
        pointsCorrect: m.settings.pointsCorrect,
        createdAt: m.createdAt,
        startedAt: m.startedAt,
        finishedAt: m.finishedAt,
        standings: standings.map((p) => ({
          displayName: p.displayName,
          score: p.score,
          themeColor: p.themeColor,
          rank: p.rank,
          isTied: p.isTied,
        })),
      });
    }

    return result;
  },
});

export const getHistoryDetail = query({
  args: { matchId: v.string() },
  handler: async (ctx, args) => {
    let match = await ctx.db
      .query('matches')
      .withIndex('by_roomCode', (q) => q.eq('roomCode', args.matchId.toUpperCase()))
      .first();
    if (!match) {
      try {
        match = await ctx.db.get(args.matchId as any);
      } catch { /* ignore */ }
    }
    if (!match) throw new Error('Data riwayat tidak ditemukan.');

    const players = await ctx.db
      .query('matchPlayers')
      .withIndex('by_match', (q) => q.eq('matchId', match._id))
      .collect();
    const { bySeat, standings } = computeStandings(players);

    const mqs = await ctx.db
      .query('matchQuestions')
      .withIndex('by_match', (q) => q.eq('matchId', match._id))
      .collect();
    mqs.sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    const isMatchFinished = match.status === 'MATCH_FINISHED';

    const questions = [];
    for (const mq of mqs) {
      const qDef = await ctx.db
        .query('questions')
        .withIndex('by_question_id', (q) => q.eq('id', mq.questionId))
        .first();

      const rawAttempts = await ctx.db
        .query('answerAttempts')
        .withIndex('by_match_question', (q) => q.eq('matchQuestionId', mq._id))
        .collect();

      const attempts = rawAttempts.map((a) => {
        const p = players.find((pl) => pl._id === a.playerId);
        return {
          playerName: p ? p.displayName : 'Peserta',
          result: a.result,
          pointsAwarded: a.pointsAwarded,
          createdAt: a.createdAt,
        };
      });

      questions.push({
        sequenceNumber: mq.sequenceNumber,
        questionId: mq.questionId,
        category: qDef?.category,
        topic: qDef?.topic,
        level: qDef?.level,
        difficulty: qDef?.difficulty,
        status: mq.status,
        result: mq.result,
        questionText: isMatchFinished ? qDef?.question : null,
        correctOption: isMatchFinished ? qDef?.correctOption : null,
        explanation: isMatchFinished ? qDef?.explanation : null,
        attempts,
      });
    }

    const adjustEvents = await ctx.db
      .query('matchEvents')
      .withIndex('by_match', (q) => q.eq('matchId', match._id))
      .filter((q) => q.eq(q.field('eventType'), 'SCORE_ADJUSTED'))
      .collect();

    return {
      id: match._id,
      roomCode: match.roomCode,
      status: match.status,
      mode: match.mode,
      settings: match.settings,
      createdAt: match.createdAt,
      startedAt: match.startedAt,
      finishedAt: match.finishedAt,
      players: bySeat,
      standings,
      questions,
      scoreAdjustments: adjustEvents.map((ev) => ({
        id: ev._id,
        createdAt: ev.createdAt,
        ...ev.payload,
      })),
    };
  },
});

export const deleteHistory = mutation({
  args: { matchId: v.string() },
  handler: async (ctx, args) => {
    let match = await ctx.db.get(args.matchId as any);
    if (!match) {
      match = await ctx.db
        .query('matches')
        .withIndex('by_roomCode', (q) => q.eq('roomCode', args.matchId.toUpperCase()))
        .first();
    }
    if (!match) throw new Error('Riwayat tidak ditemukan.');
    if (!['MATCH_FINISHED', 'LOBBY'].includes(match.status)) {
      throw new Error('Pertandingan masih berlangsung.');
    }

    // Cascade delete
    const players = await ctx.db
      .query('matchPlayers')
      .withIndex('by_match', (q) => q.eq('matchId', match._id))
      .collect();
    for (const p of players) await ctx.db.delete(p._id);

    const mqs = await ctx.db
      .query('matchQuestions')
      .withIndex('by_match', (q) => q.eq('matchId', match._id))
      .collect();
    for (const mq of mqs) {
      const attempts = await ctx.db
        .query('answerAttempts')
        .withIndex('by_match_question', (q) => q.eq('matchQuestionId', mq._id))
        .collect();
      for (const a of attempts) await ctx.db.delete(a._id);
      await ctx.db.delete(mq._id);
    }

    const events = await ctx.db
      .query('matchEvents')
      .withIndex('by_match', (q) => q.eq('matchId', match._id))
      .collect();
    for (const ev of events) await ctx.db.delete(ev._id);

    await ctx.db.delete(match._id);
    return { success: true };
  },
});
