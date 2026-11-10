import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server.js';
import { v } from 'convex/values';
import { SEED_DATA } from './seedData.ts';

const SAFE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function randomCode(len: number): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += SAFE_ALPHABET[Math.floor(Math.random() * SAFE_ALPHABET.length)];
  }
  return out;
}

function generateSecretToken(prefix: string): string {
  return `${prefix}-${randomCode(4)}-${randomCode(4)}-${randomCode(4)}`;
}

export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode((token || '').trim().toUpperCase());
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

function sanitizeName(raw: string): string {
  return (raw || '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function computeLeaderboard<
  T extends {
    _id: any;
    displayName: string;
    status: string;
    answeredCount: number;
    correctCount: number;
    wrongCount: number;
    score: number;
    accuracy: number;
    joinedAt: number;
  },
>(participants: T[], totalQuestions: number) {
  // Sort by score DESC, then correctCount DESC, then displayName ASC for deterministic display
  const sorted = [...participants].sort(
    (a, b) =>
      b.score - a.score ||
      b.correctCount - a.correctCount ||
      a.displayName.localeCompare(b.displayName, 'id'),
  );

  return sorted.map((p) => {
    const higher = participants.filter(
      (other) =>
        other.score > p.score ||
        (other.score === p.score && other.correctCount > p.correctCount),
    ).length;
    const same = participants.filter(
      (other) => other.score === p.score && other.correctCount === p.correctCount,
    ).length;
    const unansweredCount = Math.max(0, totalQuestions - p.answeredCount);
    return {
      participantId: String(p._id),
      rank: 1 + higher,
      isTied: same > 1,
      displayName: p.displayName,
      status: p.status,
      answeredCount: p.answeredCount,
      correctCount: p.correctCount,
      wrongCount: p.wrongCount,
      unansweredCount,
      score: p.score,
      accuracy: p.accuracy,
      joinedAt: p.joinedAt,
    };
  });
}

// Sync 10 TIU sub-indicators and 105 TIU questions into Convex DB
async function syncSeed(ctx: MutationCtx): Promise<number> {
  const existingSubs = await ctx.db.query('subIndicators').collect();
  const subById = new Map(existingSubs.map((s) => [s.id, s]));

  for (const sub of SEED_DATA.subIndicators) {
    const found = subById.get(sub.id);
    if (!found) {
      await ctx.db.insert('subIndicators', {
        id: sub.id,
        category: sub.category,
        subIndicator: sub.subIndicator,
        description: sub.description,
        sortOrder: sub.sortOrder,
      });
    }
  }

  const existingQs = await ctx.db.query('questionBank').collect();
  const validIds = new Set(SEED_DATA.questions.map((q) => q.id));

  // Deactivate/remove any non-TIU question if any ever existed
  for (const oldQ of existingQs) {
    if (!validIds.has(oldQ.id)) {
      await ctx.db.delete(oldQ._id);
    }
  }

  const qById = new Map(existingQs.filter((q) => validIds.has(q.id)).map((q) => [q.id, q]));
  let addedOrUpdated = 0;

  for (const q of SEED_DATA.questions) {
    const existing = qById.get(q.id);
    if (!existing) {
      await ctx.db.insert('questionBank', {
        id: q.id,
        subIndicatorId: q.subIndicatorId,
        category: q.category,
        subIndicator: q.subIndicator,
        question: q.question,
        options: q.options,
        figural: q.figural,
        correctOption: q.correctOption as 'A' | 'B' | 'C' | 'D' | 'E',
        explanation: q.explanation,
        explanationParts: q.explanationParts,
        sourcePack: q.sourcePack,
        isActive: q.isActive,
      });
      addedOrUpdated++;
    } else if (
      existing.question !== q.question ||
      existing.explanation !== q.explanation ||
      Boolean(existing.figural) !== Boolean(q.figural)
    ) {
      await ctx.db.patch(existing._id, {
        question: q.question,
        options: q.options,
        figural: q.figural,
        correctOption: q.correctOption as 'A' | 'B' | 'C' | 'D' | 'E',
        explanation: q.explanation,
        explanationParts: q.explanationParts,
        sourcePack: q.sourcePack,
        isActive: q.isActive,
      });
      addedOrUpdated++;
    }
  }

  return addedOrUpdated;
}

export const ensureSeed = mutation({
  args: {},
  handler: async (ctx) => {
    const added = await syncSeed(ctx);
    return { initialized: added > 0, added, total: SEED_DATA.questions.length };
  },
});

export const getBankSummary = query({
  args: {},
  handler: async (ctx) => {
    const subIndicators = await ctx.db.query('subIndicators').collect();
    subIndicators.sort((a, b) => a.sortOrder - b.sortOrder);
    const questions = (await ctx.db.query('questionBank').collect()).filter((q) => q.isActive);

    const withCount = subIndicators.map((sub) => {
      const count = questions.filter((q) => q.subIndicatorId === sub.id).length;
      return { ...sub, questionCount: count };
    });

    const categories = ['TIU Verbal', 'TIU Numerik', 'TIU Figural'].map((cat) => ({
      category: cat,
      questionCount: questions.filter((q) => q.category === cat).length,
    }));

    return {
      subIndicators: withCount,
      categories,
      totalQuestions: questions.length,
      pool: questions.map((q) => ({
        id: q.id,
        subIndicatorId: q.subIndicatorId,
        category: q.category,
        subIndicator: q.subIndicator,
      })),
    };
  },
});

export const createSession = mutation({
  args: {
    title: v.optional(v.string()),
    subIndicatorIds: v.optional(v.array(v.string())),
    questionCount: v.optional(v.number()),
    order: v.optional(v.string()),
    pointsCorrect: v.optional(v.number()),
    pointsWrong: v.optional(v.number()),
    pointsBlank: v.optional(v.number()),
    showSubIndicator: v.optional(v.boolean()),
    allowAnswerChange: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await syncSeed(ctx);

    const cleanTitle = sanitizeName(args.title || 'Simulasi SKD — TIU CPNS') || 'Simulasi SKD — TIU CPNS';
    if (cleanTitle.length > 80) {
      throw new Error('Nama sesi maksimal 80 karakter.');
    }

    const allSubs = await ctx.db.query('subIndicators').collect();
    allSubs.sort((a, b) => a.sortOrder - b.sortOrder);
    const validSubSet = new Set(allSubs.map((s) => s.id));

    const subIndicatorIds =
      Array.isArray(args.subIndicatorIds) && args.subIndicatorIds.length > 0
        ? [...new Set(args.subIndicatorIds.filter((id) => validSubSet.has(id)))]
        : allSubs.map((s) => s.id);

    if (subIndicatorIds.length === 0) {
      throw new Error('Pilih minimal satu subindikator TIU.');
    }

    const allQs = (await ctx.db.query('questionBank').collect()).filter((q) => q.isActive);
    const subSet = new Set(subIndicatorIds);
    const pool = allQs
      .filter((q) => subSet.has(q.subIndicatorId))
      .sort((a, b) => a.id.localeCompare(b.id));

    if (pool.length === 0) {
      throw new Error('Tidak ada soal TIU yang tersedia untuk filter subindikator tersebut.');
    }

    const order: 'sequential' | 'random' = args.order === 'random' ? 'random' : 'sequential';
    const orderedPool = order === 'random' ? shuffleArray(pool) : pool;

    const requestedCount =
      args.questionCount !== undefined ? Math.floor(Number(args.questionCount)) : orderedPool.length;
    if (requestedCount < 1) {
      throw new Error('Jumlah soal minimal 1.');
    }
    if (requestedCount > orderedPool.length) {
      throw new Error(
        `Jumlah soal yang diminta (${requestedCount}) melebihi ketersediaan bank pada subindikator terpilih (${orderedPool.length} soal).`,
      );
    }

    const selectedQuestions = orderedPool.slice(0, requestedCount);
    const questionIds = selectedQuestions.map((q) => q.id);

    let joinCode = '';
    for (let attempt = 0; attempt < 25; attempt++) {
      const candidate = randomCode(6);
      const exists = await ctx.db
        .query('sessions')
        .withIndex('by_joinCode', (q) => q.eq('joinCode', candidate))
        .first();
      if (!exists) {
        joinCode = candidate;
        break;
      }
    }
    if (!joinCode) {
      throw new Error('Gagal membuat kode sesi unik. Silakan coba lagi.');
    }

    const hostToken = generateSecretToken('HOST');
    const hostTokenHash = await hashToken(hostToken);
    const now = Date.now();

    const pointsCorrect = args.pointsCorrect ?? 5;
    const pointsWrong = args.pointsWrong ?? 0;
    const pointsBlank = args.pointsBlank ?? 0;
    const showSubIndicator = args.showSubIndicator !== false;
    const allowAnswerChange = Boolean(args.allowAnswerChange);

    const sessionId = await ctx.db.insert('sessions', {
      joinCode,
      title: cleanTitle,
      hostTokenHash,
      status: 'waiting',
      joinOpen: true,
      settings: {
        pointsCorrect,
        pointsWrong,
        pointsBlank,
        order,
        showSubIndicator,
        allowAnswerChange,
        subIndicatorIds,
        questionCount: questionIds.length,
      },
      questionIds,
      reviewQuestionIndex: 0,
      createdAt: now,
    });

    for (let i = 0; i < questionIds.length; i++) {
      await ctx.db.insert('sessionQuestions', {
        sessionId,
        questionId: questionIds[i],
        sequenceNumber: i + 1,
      });
    }

    await ctx.db.insert('sessionEvents', {
      sessionId,
      eventType: 'SESSION_CREATED',
      payload: {
        title: cleanTitle,
        questionCount: questionIds.length,
        subIndicatorCount: subIndicatorIds.length,
      },
      createdAt: now,
    });

    return {
      sessionId: String(sessionId),
      joinCode,
      hostToken,
      questionCount: questionIds.length,
    };
  },
});

async function requireSessionByCode(ctx: QueryCtx | MutationCtx, rawCode: string) {
  const code = (rawCode || '').trim().toUpperCase();
  const session = await ctx.db
    .query('sessions')
    .withIndex('by_joinCode', (q) => q.eq('joinCode', code))
    .first();
  if (!session) {
    throw new Error(`Sesi dengan kode "${code}" tidak ditemukan.`);
  }
  return session;
}

async function requireHostAuth(ctx: MutationCtx, rawCode: string, hostToken: string) {
  const session = await requireSessionByCode(ctx, rawCode);
  const incomingHash = await hashToken(hostToken || '');
  if (!hostToken || incomingHash !== session.hostTokenHash) {
    throw new Error('Otorisasi Host tidak valid untuk sesi ini.');
  }
  return session;
}

export const verifyHostToken = mutation({
  args: {
    joinCode: v.string(),
    hostToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await requireHostAuth(ctx, args.joinCode, args.hostToken);
    return { valid: true, joinCode: session.joinCode, status: session.status };
  },
});

export const joinSession = mutation({
  args: {
    joinCode: v.string(),
    displayName: v.optional(v.string()),
    participantToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionByCode(ctx, args.joinCode);

    // 1. Check session recovery by participantToken first (prevents duplicate identity on refresh)
    if (args.participantToken) {
      const tokHash = await hashToken(args.participantToken);
      const existingByToken = await ctx.db
        .query('participants')
        .withIndex('by_session_token', (q) =>
          q.eq('sessionId', session._id).eq('participantTokenHash', tokHash),
        )
        .first();

      if (existingByToken) {
        return {
          participantId: String(existingByToken._id),
          displayName: existingByToken.displayName,
          participantToken: args.participantToken,
          joinCode: session.joinCode,
          recovered: true,
        };
      }
    }

    // 2. New participant registration
    const baseName = sanitizeName(args.displayName || '');
    if (!baseName) {
      throw new Error('Nama peserta wajib diisi sebelum memulai simulasi.');
    }
    if (baseName.length > 40) {
      throw new Error('Nama peserta maksimal 40 karakter.');
    }

    if (!session.joinOpen) {
      throw new Error('Akses bergabung untuk sesi ini sedang ditutup oleh Host.');
    }
    if (session.status === 'completed' || session.status === 'review_open') {
      throw new Error('Sesi simulasi ini sudah selesai dan tidak menerima peserta baru.');
    }

    const existingParticipants = await ctx.db
      .query('participants')
      .withIndex('by_session', (q) => q.eq('sessionId', session._id))
      .collect();

    // Handle duplicate display names consistently: "Andi", "Andi (2)", "Andi (3)"
    const takenNames = new Set(existingParticipants.map((p) => p.displayName.toLowerCase()));
    let finalName = baseName;
    let suffix = 2;
    while (takenNames.has(finalName.toLowerCase())) {
      finalName = `${baseName} (${suffix})`;
      suffix++;
    }

    const participantToken = generateSecretToken('PESERTA');
    const participantTokenHash = await hashToken(participantToken);
    const now = Date.now();
    const initialStatus = session.status === 'in_progress' ? 'working' : 'joined';

    const participantId = await ctx.db.insert('participants', {
      sessionId: session._id,
      displayName: finalName,
      normalizedName: baseName.toLowerCase(),
      participantTokenHash,
      status: initialStatus,
      currentQuestionIndex: 0,
      answeredCount: 0,
      correctCount: 0,
      wrongCount: 0,
      score: 0,
      accuracy: 0,
      joinedAt: now,
    });

    await ctx.db.insert('sessionEvents', {
      sessionId: session._id,
      eventType: 'PARTICIPANT_JOINED',
      payload: { participantId: String(participantId), displayName: finalName },
      createdAt: now,
    });

    return {
      participantId: String(participantId),
      displayName: finalName,
      participantToken,
      joinCode: session.joinCode,
      recovered: false,
    };
  },
});

async function recalculateParticipantStats(
  ctx: MutationCtx,
  session: any,
  participant: any,
  markFinished: boolean,
) {
  const answers = await ctx.db
    .query('participantAnswers')
    .withIndex('by_participant', (q) => q.eq('participantId', participant._id))
    .collect();

  const totalQuestions = session.questionIds.length;
  const answeredCount = answers.length;
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const wrongCount = answeredCount - correctCount;
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);
  const score =
    answers.reduce((sum, a) => sum + a.pointsAwarded, 0) +
    (markFinished ? unansweredCount * (session.settings.pointsBlank ?? 0) : 0);
  const accuracy =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 1000) / 10 : 0;

  const answeredSet = new Set(answers.map((a) => a.questionId));
  let nextIdx = participant.currentQuestionIndex;
  for (let i = 0; i < session.questionIds.length; i++) {
    if (!answeredSet.has(session.questionIds[i])) {
      nextIdx = i;
      break;
    }
  }

  const now = Date.now();
  const isNowFinished =
    markFinished ||
    (answeredCount >= totalQuestions && !session.settings.allowAnswerChange);

  const nextStatus = isNowFinished ? 'finished' : 'working';

  await ctx.db.patch(participant._id, {
    status: nextStatus,
    currentQuestionIndex: nextIdx,
    answeredCount,
    correctCount,
    wrongCount,
    score,
    accuracy,
    finishedAt: isNowFinished ? participant.finishedAt ?? now : undefined,
  });

  if (isNowFinished && participant.status !== 'finished') {
    await ctx.db.insert('sessionEvents', {
      sessionId: session._id,
      eventType: 'PARTICIPANT_FINISHED',
      payload: {
        participantId: String(participant._id),
        displayName: participant.displayName,
      },
      createdAt: now,
    });

    // Check if ALL registered participants have now finished the package
    const allParts = await ctx.db
      .query('participants')
      .withIndex('by_session', (q) => q.eq('sessionId', session._id))
      .collect();

    if (
      allParts.length > 0 &&
      allParts.every((p) => (p._id === participant._id ? true : p.status === 'finished')) &&
      session.status === 'in_progress'
    ) {
      await ctx.db.patch(session._id, {
        status: 'completed',
        completedAt: now,
      });
      await ctx.db.insert('sessionEvents', {
        sessionId: session._id,
        eventType: 'SESSION_COMPLETED',
        payload: { reason: 'ALL_PARTICIPANTS_FINISHED', participantCount: allParts.length },
        createdAt: now,
      });
    }
  }

  return {
    answeredCount,
    totalQuestions,
    status: nextStatus,
    currentQuestionIndex: nextIdx,
  };
}

export const submitAnswer = mutation({
  args: {
    joinCode: v.string(),
    participantToken: v.string(),
    questionId: v.string(),
    selectedOption: v.union(
      v.literal('A'),
      v.literal('B'),
      v.literal('C'),
      v.literal('D'),
      v.literal('E'),
    ),
    actionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionByCode(ctx, args.joinCode);
    const tokHash = await hashToken(args.participantToken || '');
    const participant = await ctx.db
      .query('participants')
      .withIndex('by_session_token', (q) =>
        q.eq('sessionId', session._id).eq('participantTokenHash', tokHash),
      )
      .first();

    if (!participant) {
      throw new Error('Identitas peserta tidak ditemukan. Silakan bergabung ulang.');
    }

    if (session.status === 'waiting') {
      throw new Error('Sesi belum dimulai oleh Host. Tunggu hingga Host memulai sesi.');
    }
    if (session.status === 'completed' || session.status === 'review_open') {
      throw new Error('Sesi telah berakhir. Jawaban tidak dapat dikirim lagi.');
    }
    if (participant.status === 'finished') {
      throw new Error('Anda telah menyelesaikan seluruh paket soal pada sesi ini.');
    }

    if (!session.questionIds.includes(args.questionId)) {
      throw new Error('Soal tidak terdaftar dalam sesi ini.');
    }

    const qDef = await ctx.db
      .query('questionBank')
      .withIndex('by_question_id', (q) => q.eq('id', args.questionId))
      .first();
    if (!qDef) {
      throw new Error('Data soal tidak ditemukan di bank soal.');
    }

    const existingAns = await ctx.db
      .query('participantAnswers')
      .withIndex('by_participant_question', (q) =>
        q.eq('participantId', participant._id).eq('questionId', args.questionId),
      )
      .first();

    const isCorrect = qDef.correctOption === args.selectedOption;
    const pointsAwarded = isCorrect
      ? session.settings.pointsCorrect
      : session.settings.pointsWrong;
    const now = Date.now();

    if (existingAns) {
      if (!session.settings.allowAnswerChange) {
        // Idempotent retry if the exact same option was re-sent after network hiccup
        if (existingAns.selectedOption === args.selectedOption) {
          return {
            saved: true,
            duplicateRetry: true,
            answeredCount: participant.answeredCount,
            totalQuestions: session.questionIds.length,
            participantStatus: participant.status,
          };
        }
        throw new Error('Jawaban untuk soal ini sudah dikunci dan tidak dapat diubah.');
      }

      await ctx.db.patch(existingAns._id, {
        selectedOption: args.selectedOption,
        isCorrect,
        pointsAwarded,
        submittedAt: now,
      });
    } else {
      await ctx.db.insert('participantAnswers', {
        sessionId: session._id,
        participantId: participant._id,
        questionId: args.questionId,
        selectedOption: args.selectedOption,
        isCorrect,
        pointsAwarded,
        submittedAt: now,
      });
    }

    const updated = await recalculateParticipantStats(ctx, session, participant, false);

    // Note: Do NOT return isCorrect, pointsAwarded, or correctOption to participant!
    return {
      saved: true,
      duplicateRetry: false,
      answeredCount: updated.answeredCount,
      totalQuestions: updated.totalQuestions,
      participantStatus: updated.status,
      currentQuestionIndex: updated.currentQuestionIndex,
    };
  },
});

export const finishParticipantSession = mutation({
  args: {
    joinCode: v.string(),
    participantToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionByCode(ctx, args.joinCode);
    const tokHash = await hashToken(args.participantToken || '');
    const participant = await ctx.db
      .query('participants')
      .withIndex('by_session_token', (q) =>
        q.eq('sessionId', session._id).eq('participantTokenHash', tokHash),
      )
      .first();

    if (!participant) {
      throw new Error('Identitas peserta tidak ditemukan.');
    }
    if (participant.status === 'finished') {
      return { finished: true };
    }

    await recalculateParticipantStats(ctx, session, participant, true);
    return { finished: true };
  },
});

export const hostDispatch = mutation({
  args: {
    joinCode: v.string(),
    hostToken: v.string(),
    action: v.any(),
  },
  handler: async (ctx, args) => {
    const session = await requireHostAuth(ctx, args.joinCode, args.hostToken);
    const action = args.action || {};
    const type = String(action.type || '');
    const now = Date.now();

    if (type === 'START_SESSION') {
      if (session.status !== 'waiting') {
        return { ok: true, status: session.status };
      }
      await ctx.db.patch(session._id, {
        status: 'in_progress',
        startedAt: now,
      });
      const parts = await ctx.db
        .query('participants')
        .withIndex('by_session', (q) => q.eq('sessionId', session._id))
        .collect();
      for (const p of parts) {
        if (p.status === 'joined') {
          await ctx.db.patch(p._id, { status: 'working' });
        }
      }
      await ctx.db.insert('sessionEvents', {
        sessionId: session._id,
        eventType: 'SESSION_STARTED',
        payload: { participantCount: parts.length },
        createdAt: now,
      });
      return { ok: true, status: 'in_progress' };
    }

    if (type === 'TOGGLE_JOIN') {
      const nextJoinOpen =
        typeof action.joinOpen === 'boolean' ? action.joinOpen : !session.joinOpen;
      if (
        nextJoinOpen &&
        (session.status === 'completed' || session.status === 'review_open')
      ) {
        throw new Error('Sesi yang sudah selesai tidak dapat dibuka kembali untuk peserta baru.');
      }
      await ctx.db.patch(session._id, { joinOpen: nextJoinOpen });
      await ctx.db.insert('sessionEvents', {
        sessionId: session._id,
        eventType: 'JOIN_ACCESS_CHANGED',
        payload: { joinOpen: nextJoinOpen },
        createdAt: now,
      });
      return { ok: true, joinOpen: nextJoinOpen };
    }

    if (type === 'END_SESSION') {
      if (session.status === 'completed' || session.status === 'review_open') {
        return { ok: true, status: session.status };
      }
      const parts = await ctx.db
        .query('participants')
        .withIndex('by_session', (q) => q.eq('sessionId', session._id))
        .collect();
      const unfinished = parts.filter((p) => p.status !== 'finished');

      if (unfinished.length > 0 && !action.confirmUnfinished) {
        const names = unfinished.map((p) => p.displayName).join(', ');
        throw new Error(
          `UNFINISHED_PARTICIPANTS: Masih ada ${unfinished.length} peserta yang belum selesai (${names}). Konfirmasi pengakhiran paksa jika ingin mengakhiri sesi sekarang.`,
        );
      }

      for (const p of unfinished) {
        await recalculateParticipantStats(ctx, session, p, true);
      }

      await ctx.db.patch(session._id, {
        status: 'completed',
        joinOpen: false,
        completedAt: now,
      });

      await ctx.db.insert('sessionEvents', {
        sessionId: session._id,
        eventType: 'SESSION_COMPLETED',
        payload: {
          reason: unfinished.length > 0 ? 'HOST_FORCED_END' : 'HOST_ENDED',
          unfinishedCount: unfinished.length,
          unfinishedNames: unfinished.map((p) => p.displayName),
        },
        createdAt: now,
      });

      return { ok: true, status: 'completed' };
    }

    if (type === 'OPEN_REVIEW') {
      if (session.status === 'review_open') {
        return { ok: true, status: 'review_open' };
      }

      const parts = await ctx.db
        .query('participants')
        .withIndex('by_session', (q) => q.eq('sessionId', session._id))
        .collect();
      const unfinished = parts.filter((p) => p.status !== 'finished');
      const allFinished = parts.length > 0 && unfinished.length === 0;

      if (session.status !== 'completed' && !allFinished) {
        throw new Error(
          'Pembahasan belum dapat dibuka. Seluruh peserta harus menyelesaikan simulasi atau Host harus mengakhiri sesi terlebih dahulu.',
        );
      }

      await ctx.db.patch(session._id, {
        status: 'review_open',
        joinOpen: false,
        completedAt: session.completedAt ?? now,
        reviewOpenedAt: now,
        reviewQuestionIndex: 0,
      });

      await ctx.db.insert('sessionEvents', {
        sessionId: session._id,
        eventType: 'REVIEW_OPENED',
        payload: {
          openedBy: 'HOST',
          participantCount: parts.length,
          openedAt: now,
        },
        createdAt: now,
      });

      return { ok: true, status: 'review_open' };
    }

    if (type === 'SET_REVIEW_QUESTION') {
      if (session.status !== 'review_open') {
        throw new Error('Mode pembahasan belum dibuka.');
      }
      const idx = Math.max(
        0,
        Math.min(session.questionIds.length - 1, Math.floor(Number(action.index ?? 0))),
      );
      await ctx.db.patch(session._id, { reviewQuestionIndex: idx });
      await ctx.db.insert('sessionEvents', {
        sessionId: session._id,
        eventType: 'REVIEW_QUESTION_CHANGED',
        payload: { reviewQuestionIndex: idx },
        createdAt: now,
      });
      return { ok: true, reviewQuestionIndex: idx };
    }

    throw new Error(`Aksi Host tidak dikenal: ${type}`);
  },
});

export const getHostSnapshot = query({
  args: {
    joinCode: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionByCode(ctx, args.joinCode);
    const participants = await ctx.db
      .query('participants')
      .withIndex('by_session', (q) => q.eq('sessionId', session._id))
      .collect();

    const totalQuestions = session.questionIds.length;
    const leaderboard = computeLeaderboard(participants, totalQuestions);
    const unfinished = participants.filter((p) => p.status !== 'finished');
    const finishedCount = participants.length - unfinished.length;
    const allParticipantsFinished = participants.length > 0 && unfinished.length === 0;
    const canOpenReview =
      session.status === 'completed' ||
      session.status === 'review_open' ||
      (session.status === 'in_progress' && allParticipantsFinished);

    // Strictly gate review questions & explanations until status === 'review_open'
    let review: any = null;
    if (session.status === 'review_open') {
      const allQs = await ctx.db.query('questionBank').collect();
      const qMap = new Map(allQs.map((q) => [q.id, q]));
      const allAnswers = await ctx.db
        .query('participantAnswers')
        .withIndex('by_session', (q) => q.eq('sessionId', session._id))
        .collect();

      const questions = session.questionIds.map((qId, idx) => {
        const qDef = qMap.get(qId);
        const qAns = allAnswers.filter((a) => a.questionId === qId);
        const optionCounts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
        for (const a of qAns) {
          optionCounts[a.selectedOption] = (optionCounts[a.selectedOption] || 0) + 1;
        }
        return {
          sequenceNumber: idx + 1,
          id: qId,
          category: qDef?.category ?? '',
          subIndicator: qDef?.subIndicator ?? '',
          question: qDef?.question ?? '',
          options: qDef?.options ?? { A: '', B: '', C: '', D: '', E: '' },
          figural: qDef?.figural ?? null,
          correctOption: qDef?.correctOption,
          explanation: qDef?.explanation ?? '',
          explanationParts: qDef?.explanationParts ?? null,
          optionCounts,
          totalAnswered: qAns.length,
        };
      });

      review = {
        currentIndex: session.reviewQuestionIndex,
        totalQuestions,
        questions,
      };
    }

    return {
      session: {
        id: String(session._id),
        joinCode: session.joinCode,
        title: session.title,
        status: session.status,
        joinOpen: session.joinOpen,
        settings: session.settings,
        totalQuestions,
        maxPossibleScore: totalQuestions * session.settings.pointsCorrect,
        reviewQuestionIndex: session.reviewQuestionIndex,
        canOpenReview,
        createdAt: session.createdAt,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        reviewOpenedAt: session.reviewOpenedAt,
      },
      participantSummary: {
        total: participants.length,
        finishedCount,
        workingCount: unfinished.length,
        unfinishedNames: unfinished.map((p) => p.displayName),
      },
      leaderboard,
      review,
    };
  },
});

export const getParticipantSnapshot = query({
  args: {
    joinCode: v.string(),
    participantToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionByCode(ctx, args.joinCode);
    const tokHash = await hashToken(args.participantToken || '');
    const participant = await ctx.db
      .query('participants')
      .withIndex('by_session_token', (q) =>
        q.eq('sessionId', session._id).eq('participantTokenHash', tokHash),
      )
      .first();

    if (!participant) {
      throw new Error('Sesi peserta tidak ditemukan. Silakan bergabung kembali.');
    }

    const allQs = await ctx.db.query('questionBank').collect();
    const qMap = new Map(allQs.map((q) => [q.id, q]));

    const myAnswers = await ctx.db
      .query('participantAnswers')
      .withIndex('by_participant', (q) => q.eq('participantId', participant._id))
      .collect();
    const ansByQId = new Map(myAnswers.map((a) => [a.questionId, a]));

    const isReviewOpen = session.status === 'review_open';
    const isSessionEnded =
      session.status === 'completed' || session.status === 'review_open';
    const totalQuestions = session.questionIds.length;

    const questions = session.questionIds.map((qId, idx) => {
      const qDef = qMap.get(qId);
      const ans = ansByQId.get(qId);
      const base: any = {
        sequenceNumber: idx + 1,
        id: qId,
        category: session.settings.showSubIndicator ? qDef?.category : undefined,
        subIndicator: session.settings.showSubIndicator ? qDef?.subIndicator : undefined,
        question: qDef?.question ?? '',
        options: qDef?.options ?? { A: '', B: '', C: '', D: '', E: '' },
        figural: qDef?.figural ?? null,
        selectedOption: ans?.selectedOption ?? null,
      };

      // Strictly lock correctOption, isCorrect, and explanations until review_open!
      if (isReviewOpen && qDef) {
        base.correctOption = qDef.correctOption;
        base.isCorrect = ans ? ans.isCorrect : false;
        base.explanation = qDef.explanation;
        base.explanationParts = qDef.explanationParts;
      }

      return base;
    });

    // Personal result summary is only revealed when the participant has finished AND (session ended or all finished)
    let personalResult: any = null;
    if (isSessionEnded || participant.status === 'finished') {
      const allParticipants = await ctx.db
        .query('participants')
        .withIndex('by_session', (q) => q.eq('sessionId', session._id))
        .collect();
      const allDone =
        isSessionEnded ||
        (allParticipants.length > 0 &&
          allParticipants.every((p) => p.status === 'finished'));

      if (allDone) {
        const lb = computeLeaderboard(allParticipants, totalQuestions);
        const myRankEntry = lb.find((r) => r.participantId === String(participant._id));

        const byCategoryMap = new Map<
          string,
          { category: string; total: number; answered: number; correct: number; wrong: number; score: number }
        >();
        const bySubMap = new Map<
          string,
          { subIndicator: string; category: string; total: number; answered: number; correct: number; wrong: number; score: number }
        >();

        for (const qId of session.questionIds) {
          const qDef = qMap.get(qId);
          if (!qDef) continue;
          const ans = ansByQId.get(qId);

          if (!byCategoryMap.has(qDef.category)) {
            byCategoryMap.set(qDef.category, {
              category: qDef.category,
              total: 0,
              answered: 0,
              correct: 0,
              wrong: 0,
              score: 0,
            });
          }
          const catStat = byCategoryMap.get(qDef.category)!;
          catStat.total++;
          if (ans) {
            catStat.answered++;
            if (ans.isCorrect) catStat.correct++;
            else catStat.wrong++;
            catStat.score += ans.pointsAwarded;
          }

          if (!bySubMap.has(qDef.subIndicator)) {
            bySubMap.set(qDef.subIndicator, {
              subIndicator: qDef.subIndicator,
              category: qDef.category,
              total: 0,
              answered: 0,
              correct: 0,
              wrong: 0,
              score: 0,
            });
          }
          const subStat = bySubMap.get(qDef.subIndicator)!;
          subStat.total++;
          if (ans) {
            subStat.answered++;
            if (ans.isCorrect) subStat.correct++;
            else subStat.wrong++;
            subStat.score += ans.pointsAwarded;
          }
        }

        personalResult = {
          displayName: participant.displayName,
          answeredCount: participant.answeredCount,
          correctCount: participant.correctCount,
          wrongCount: participant.wrongCount,
          unansweredCount: Math.max(0, totalQuestions - participant.answeredCount),
          score: participant.score,
          maxPossibleScore: totalQuestions * session.settings.pointsCorrect,
          accuracy: participant.accuracy,
          rank: myRankEntry?.rank ?? 1,
          isTied: myRankEntry?.isTied ?? false,
          totalParticipants: allParticipants.length,
          byCategory: Array.from(byCategoryMap.values()),
          bySubIndicator: Array.from(bySubMap.values()),
        };
      }
    }

    return {
      session: {
        joinCode: session.joinCode,
        title: session.title,
        status: session.status,
        joinOpen: session.joinOpen,
        totalQuestions,
        reviewQuestionIndex: session.reviewQuestionIndex,
        settings: {
          pointsCorrect: session.settings.pointsCorrect,
          pointsWrong: session.settings.pointsWrong,
          pointsBlank: session.settings.pointsBlank,
          showSubIndicator: session.settings.showSubIndicator,
          allowAnswerChange: session.settings.allowAnswerChange,
        },
      },
      participant: {
        id: String(participant._id),
        displayName: participant.displayName,
        status: participant.status,
        currentQuestionIndex: participant.currentQuestionIndex,
        answeredCount: participant.answeredCount,
        totalQuestions,
      },
      questions,
      personalResult,
    };
  },
});

// Dedicated endpoint for fetching review/explanation, strictly locked unless session.status === 'review_open'
export const getReviewQuestion = query({
  args: {
    joinCode: v.string(),
    questionIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionByCode(ctx, args.joinCode);
    if (session.status !== 'review_open') {
      throw new Error(
        'FORBIDDEN_REVIEW_LOCKED: Pembahasan belum dibuka. Seluruh peserta harus menyelesaikan simulasi atau Host harus mengakhiri sesi terlebih dahulu.',
      );
    }

    const idx = Math.max(
      0,
      Math.min(
        session.questionIds.length - 1,
        Math.floor(Number(args.questionIndex ?? session.reviewQuestionIndex)),
      ),
    );
    const qId = session.questionIds[idx];
    const qDef = await ctx.db
      .query('questionBank')
      .withIndex('by_question_id', (q) => q.eq('id', qId))
      .first();

    if (!qDef) {
      throw new Error('Soal tidak ditemukan.');
    }

    return {
      sequenceNumber: idx + 1,
      totalQuestions: session.questionIds.length,
      id: qDef.id,
      category: qDef.category,
      subIndicator: qDef.subIndicator,
      question: qDef.question,
      options: qDef.options,
      figural: qDef.figural ?? null,
      correctOption: qDef.correctOption,
      explanation: qDef.explanation,
      explanationParts: qDef.explanationParts,
    };
  },
});

export const listSessions = query({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_createdAt')
      .order('desc')
      .take(30);

    const items = [];
    for (const s of sessions) {
      const parts = await ctx.db
        .query('participants')
        .withIndex('by_session', (q) => q.eq('sessionId', s._id))
        .collect();
      items.push({
        id: String(s._id),
        joinCode: s.joinCode,
        title: s.title,
        status: s.status,
        questionCount: s.questionIds.length,
        participantCount: parts.length,
        finishedCount: parts.filter((p) => p.status === 'finished').length,
        createdAt: s.createdAt,
        completedAt: s.completedAt,
      });
    }
    return items;
  },
});

export const deleteSession = mutation({
  args: {
    joinCode: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionByCode(ctx, args.joinCode);
    const sqs = await ctx.db
      .query('sessionQuestions')
      .withIndex('by_session', (q) => q.eq('sessionId', session._id))
      .collect();
    for (const sq of sqs) await ctx.db.delete(sq._id);

    const ans = await ctx.db
      .query('participantAnswers')
      .withIndex('by_session', (q) => q.eq('sessionId', session._id))
      .collect();
    for (const a of ans) await ctx.db.delete(a._id);

    const parts = await ctx.db
      .query('participants')
      .withIndex('by_session', (q) => q.eq('sessionId', session._id))
      .collect();
    for (const p of parts) await ctx.db.delete(p._id);

    const evs = await ctx.db
      .query('sessionEvents')
      .withIndex('by_session', (q) => q.eq('sessionId', session._id))
      .collect();
    for (const ev of evs) await ctx.db.delete(ev._id);

    await ctx.db.delete(session._id);
    return { deleted: true };
  },
});
