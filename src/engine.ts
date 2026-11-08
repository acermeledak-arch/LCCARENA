import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export class AppError extends Error {
  statusCode: number;
  code: string;
  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export interface IndicatorSeed {
  id: string;
  category: string;
  topic: string;
  indicator_text: string;
  sort_order: number;
}

export interface QuestionSeed {
  id: string;
  indicator_id: string;
  category: string;
  topic: string;
  level: number;
  difficulty: 'easy' | 'medium';
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct_option: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  points: number;
  recommended_time_seconds: number;
  is_active: boolean;
}

export interface MatchSettings {
  durationSeconds: number;
  pointsCorrect: number;
  order: 'sequential' | 'random';
  showOptionsOnDisplay: boolean;
  allowAnswerReveal: boolean;
  indicatorIds: string[];
  levels: number[];
  questionCount: number;
  allowRepeat: boolean;
}

export interface CreateMatchInput {
  players: [string, string, string] | string[];
  mode: 'FULL' | 'CATEGORY' | 'QUICK';
  indicatorIds?: string[];
  levels?: number[];
  questionCount?: number;
  order?: 'sequential' | 'random';
  durationSeconds?: number;
  pointsCorrect?: number;
  showOptionsOnDisplay?: boolean;
  allowAnswerReveal?: boolean;
  allowRepeat?: boolean;
}

export type GameAction =
  | { type: 'START_MATCH'; actionId?: string }
  | { type: 'START_QUESTION'; actionId?: string }
  | { type: 'SELECT_PLAYER'; playerId: string; actionId?: string }
  | { type: 'CANCEL_SELECTION'; actionId?: string }
  | { type: 'JUDGE_CORRECT'; actionId?: string }
  | { type: 'JUDGE_WRONG'; actionId?: string }
  | { type: 'PAUSE_MATCH'; actionId?: string }
  | { type: 'RESUME_MATCH'; actionId?: string }
  | { type: 'REVEAL_ANSWER'; reveal?: boolean; actionId?: string }
  | { type: 'NEXT_QUESTION'; actionId?: string }
  | { type: 'ADJUST_SCORE'; playerId: string; delta: number; reason: string; actionId?: string }
  | { type: 'END_MATCH'; actionId?: string };

const SAFE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const PLAYER_COLORS = ['#3b82f6', '#a855f7', '#06b6d4'] as const; // Blue, Purple, Cyan (PRD Sec 9)

function randomCode(len: number): string {
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += SAFE_ALPHABET[bytes[i] % SAFE_ALPHABET.length];
  return out;
}

function generateControllerToken(): string {
  return `${randomCode(4)}-${randomCode(4)}-${randomCode(4)}`;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim().toUpperCase()).digest('hex');
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function validateSeedData(seed: { indicators: IndicatorSeed[]; questions: QuestionSeed[] }): void {
  if (!Array.isArray(seed.indicators) || seed.indicators.length !== 13) {
    throw new Error(`Bank soal harus memiliki tepat 13 indikator (ditemukan: ${seed.indicators?.length})`);
  }
  if (!Array.isArray(seed.questions) || seed.questions.length !== 39) {
    throw new Error(`Bank soal harus memiliki tepat 39 soal (ditemukan: ${seed.questions?.length})`);
  }
  const indIds = new Set(seed.indicators.map((i) => i.id));
  if (indIds.size !== 13) throw new Error('ID indikator duplikat ditemukan');

  const qIds = new Set<string>();
  const perInd = new Map<string, QuestionSeed[]>();

  for (const q of seed.questions) {
    if (qIds.has(q.id)) throw new Error(`ID soal duplikat: ${q.id}`);
    qIds.add(q.id);
    if (!indIds.has(q.indicator_id)) throw new Error(`Indikator tidak valid pada ${q.id}: ${q.indicator_id}`);
    if (!['easy', 'medium'].includes(q.difficulty)) throw new Error(`Difficulty tidak valid pada ${q.id}: ${q.difficulty}`);
    if (!['A', 'B', 'C', 'D'].includes(q.correct_option)) throw new Error(`Kunci tidak valid pada ${q.id}: ${q.correct_option}`);
    if (!Number.isInteger(q.points) || q.points < 0) throw new Error(`Points harus integer pada ${q.id}`);
    const opts = q.options;
    if (!opts || typeof opts !== 'object' || Object.keys(opts).length !== 4) {
      throw new Error(`Soal ${q.id} harus memiliki 4 opsi`);
    }
    for (const k of ['A', 'B', 'C', 'D'] as const) {
      if (typeof opts[k] !== 'string' || !opts[k].trim()) throw new Error(`Opsi ${k} kosong pada ${q.id}`);
    }
    const list = perInd.get(q.indicator_id) ?? [];
    list.push(q);
    perInd.set(q.indicator_id, list);
  }

  for (const ind of seed.indicators) {
    const list = perInd.get(ind.id) ?? [];
    if (list.length !== 3) throw new Error(`Indikator ${ind.id} harus memiliki 3 soal (ditemukan: ${list.length})`);
    const easyCount = list.filter((q) => q.difficulty === 'easy').length;
    const medCount = list.filter((q) => q.difficulty === 'medium').length;
    if (easyCount !== 1 || medCount !== 2) {
      throw new Error(`Indikator ${ind.id} harus terdiri dari 1 mudah & 2 menengah`);
    }
  }
}

export function computeStandings<T extends { id: string; seatNumber: number; score: number }>(players: T[]) {
  const withRank = players.map((p) => {
    const higher = players.filter((other) => other.score > p.score).length;
    const same = players.filter((other) => other.score === p.score).length;
    return { ...p, rank: 1 + higher, isTied: same > 1 };
  });
  const standings = [...withRank].sort((a, b) => b.score - a.score || a.seatNumber - b.seatNumber);
  return { bySeat: [...withRank].sort((a, b) => a.seatNumber - b.seatNumber), standings };
}

export class LccEngine {
  db: DatabaseSync;

  constructor(dbPath = 'data/lcc_arena.sqlite', seedPath = 'data/questions.json') {
    if (dbPath !== ':memory:') {
      fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
    }
    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS indicators (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        topic TEXT NOT NULL,
        indicator_text TEXT NOT NULL,
        sort_order INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        indicator_id TEXT NOT NULL REFERENCES indicators(id),
        level INTEGER NOT NULL,
        difficulty TEXT NOT NULL,
        question_text TEXT NOT NULL,
        options_json TEXT NOT NULL,
        correct_option TEXT NOT NULL,
        explanation TEXT NOT NULL,
        default_points INTEGER NOT NULL,
        recommended_time_seconds INTEGER NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        room_code TEXT NOT NULL UNIQUE,
        controller_token_hash TEXT NOT NULL,
        status TEXT NOT NULL,
        mode TEXT NOT NULL,
        settings_json TEXT NOT NULL,
        current_question_index INTEGER NOT NULL DEFAULT 0,
        current_question_id TEXT,
        created_at INTEGER NOT NULL,
        started_at INTEGER,
        finished_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS match_players (
        id TEXT PRIMARY KEY,
        match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
        seat_number INTEGER NOT NULL,
        display_name TEXT NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        theme_color TEXT NOT NULL,
        UNIQUE(match_id, seat_number)
      );

      CREATE TABLE IF NOT EXISTS match_questions (
        id TEXT PRIMARY KEY,
        match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
        question_id TEXT NOT NULL REFERENCES questions(id),
        sequence_number INTEGER NOT NULL,
        status TEXT NOT NULL,
        remaining_ms INTEGER NOT NULL,
        deadline_at INTEGER,
        attempted_player_ids_json TEXT NOT NULL DEFAULT '[]',
        selected_player_id TEXT,
        result TEXT,
        answer_revealed INTEGER NOT NULL DEFAULT 0,
        UNIQUE(match_id, sequence_number)
      );

      CREATE TABLE IF NOT EXISTS answer_attempts (
        id TEXT PRIMARY KEY,
        match_question_id TEXT NOT NULL REFERENCES match_questions(id) ON DELETE CASCADE,
        player_id TEXT NOT NULL REFERENCES match_players(id) ON DELETE CASCADE,
        result TEXT NOT NULL,
        points_awarded INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS match_events (
        id TEXT PRIMARY KEY,
        match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
        action_id TEXT,
        event_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_match_events_action
        ON match_events(match_id, action_id)
        WHERE action_id IS NOT NULL;
    `);

    const rawSeed = JSON.parse(fs.readFileSync(path.resolve(seedPath), 'utf8'));
    validateSeedData(rawSeed);
    this.seedBank(rawSeed);
  }

  private inTx<T>(fn: () => T): T {
    // ponytail: Single-process synchronous SQLite transaction serializes all writes; upgrade to Postgres row locks if multi-node.
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const res = fn();
      this.db.exec('COMMIT');
      return res;
    } catch (err) {
      try { this.db.exec('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }
  }

  private seedBank(seed: { indicators: IndicatorSeed[]; questions: QuestionSeed[] }): void {
    this.inTx(() => {
      const upsertInd = this.db.prepare(`
        INSERT INTO indicators (id, category, topic, indicator_text, sort_order)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          category = excluded.category,
          topic = excluded.topic,
          indicator_text = excluded.indicator_text,
          sort_order = excluded.sort_order
      `);
      for (const ind of seed.indicators) {
        upsertInd.run(ind.id, ind.category, ind.topic, ind.indicator_text, ind.sort_order);
      }

      const upsertQ = this.db.prepare(`
        INSERT INTO questions (
          id, indicator_id, level, difficulty, question_text, options_json,
          correct_option, explanation, default_points, recommended_time_seconds, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          indicator_id = excluded.indicator_id,
          level = excluded.level,
          difficulty = excluded.difficulty,
          question_text = excluded.question_text,
          options_json = excluded.options_json,
          correct_option = excluded.correct_option,
          explanation = excluded.explanation,
          default_points = excluded.default_points,
          recommended_time_seconds = excluded.recommended_time_seconds,
          is_active = excluded.is_active
      `);
      for (const q of seed.questions) {
        upsertQ.run(
          q.id,
          q.indicator_id,
          q.level,
          q.difficulty,
          q.question,
          JSON.stringify(q.options),
          q.correct_option,
          q.explanation,
          q.points,
          q.recommended_time_seconds,
          q.is_active ? 1 : 0,
        );
      }
    });
  }

  getBankSummary() {
    const indicators = this.db.prepare(`
      SELECT i.id, i.category, i.topic, i.indicator_text AS indicatorText, i.sort_order AS sortOrder,
             COUNT(q.id) AS questionCount
      FROM indicators i
      LEFT JOIN questions q ON q.indicator_id = i.id AND q.is_active = 1
      GROUP BY i.id
      ORDER BY i.sort_order ASC
    `).all();
    const totalRow = this.db.prepare(`SELECT COUNT(*) AS total FROM questions WHERE is_active = 1`).get() as { total: number };
    return { indicators, totalQuestions: totalRow.total };
  }

  verifyToken(roomCode: string, candidateToken: string | null | undefined): boolean {
    if (!candidateToken || typeof candidateToken !== 'string') return false;
    const row = this.db.prepare(`SELECT controller_token_hash FROM matches WHERE room_code = ?`).get(roomCode.trim().toUpperCase()) as
      | { controller_token_hash: string }
      | undefined;
    if (!row) return false;
    const expected = Buffer.from(row.controller_token_hash, 'hex');
    const actual = Buffer.from(hashToken(candidateToken), 'hex');
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  }

  createMatch(input: CreateMatchInput, now = Date.now()) {
    if (!input || !Array.isArray(input.players) || input.players.length !== 3) {
      throw new AppError(400, 'INVALID_PLAYERS', 'Pertandingan wajib diikuti tepat 3 peserta.');
    }
    const cleanNames = input.players.map((raw) =>
      typeof raw === 'string' ? raw.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim() : '',
    );
    for (let i = 0; i < 3; i++) {
      if (!cleanNames[i]) {
        throw new AppError(400, 'EMPTY_PLAYER_NAME', `Nama Peserta ${i + 1} tidak boleh kosong.`);
      }
      if (cleanNames[i].length > 40) {
        throw new AppError(400, 'PLAYER_NAME_TOO_LONG', `Nama Peserta ${i + 1} maksimal 40 karakter.`);
      }
    }
    if (new Set(cleanNames.map((n) => n.toLowerCase())).size !== 3) {
      throw new AppError(400, 'DUPLICATE_PLAYER_NAME', 'Nama ketiga peserta harus unik agar operator tidak salah memilih.');
    }

    const mode = input.mode;
    if (!['FULL', 'CATEGORY', 'QUICK'].includes(mode)) {
      throw new AppError(400, 'INVALID_MODE', 'Mode permainan harus FULL, CATEGORY, atau QUICK.');
    }

    const durationSeconds = input.durationSeconds ?? 20;
    if (!Number.isInteger(durationSeconds) || durationSeconds < 5 || durationSeconds > 300) {
      throw new AppError(400, 'INVALID_DURATION', 'Durasi soal harus bilangan bulat antara 5 hingga 300 detik.');
    }

    const pointsCorrect = input.pointsCorrect ?? 10;
    if (!Number.isInteger(pointsCorrect) || pointsCorrect < 0 || pointsCorrect > 1000) {
      throw new AppError(400, 'INVALID_POINTS', 'Poin benar harus bilangan bulat nonnegatif (0–1000).');
    }

    const order: 'sequential' | 'random' = input.order === 'random' ? 'random' : 'sequential';
    const showOptionsOnDisplay = input.showOptionsOnDisplay !== false;
    const allowAnswerReveal = input.allowAnswerReveal !== false;
    const allowRepeat = Boolean(input.allowRepeat);

    const allIndicators = this.db.prepare(`SELECT id FROM indicators ORDER BY sort_order ASC`).all() as { id: string }[];
    const validIndSet = new Set(allIndicators.map((i) => i.id));

    let indicatorIds: string[];
    if (mode === 'FULL') {
      indicatorIds = allIndicators.map((i) => i.id);
    } else if (mode === 'CATEGORY') {
      if (!Array.isArray(input.indicatorIds) || input.indicatorIds.length === 0) {
        throw new AppError(400, 'MISSING_INDICATORS', 'Pilih minimal satu indikator untuk Category Challenge.');
      }
      indicatorIds = [...new Set(input.indicatorIds)];
      for (const id of indicatorIds) {
        if (!validIndSet.has(id)) throw new AppError(400, 'INVALID_INDICATOR', `Indikator tidak dikenal: ${id}`);
      }
    } else {
      indicatorIds =
        Array.isArray(input.indicatorIds) && input.indicatorIds.length > 0
          ? [...new Set(input.indicatorIds.filter((id) => validIndSet.has(id)))]
          : allIndicators.map((i) => i.id);
      if (indicatorIds.length === 0) {
        throw new AppError(400, 'MISSING_INDICATORS', 'Tidak ada indikator valid yang dipilih.');
      }
    }

    const levels =
      mode === 'FULL'
        ? [1, 2, 3]
        : Array.isArray(input.levels) && input.levels.length > 0
          ? [...new Set(input.levels.filter((l) => [1, 2, 3].includes(l)))].sort()
          : [1, 2, 3];
    if (levels.length === 0) {
      throw new AppError(400, 'INVALID_LEVELS', 'Pilih minimal satu level kesulitan (1, 2, atau 3).');
    }

    const indPlaceholders = indicatorIds.map(() => '?').join(',');
    const lvlPlaceholders = levels.map(() => '?').join(',');
    const pool = this.db
      .prepare(`
        SELECT q.id
        FROM questions q
        JOIN indicators i ON i.id = q.indicator_id
        WHERE q.is_active = 1
          AND q.indicator_id IN (${indPlaceholders})
          AND q.level IN (${lvlPlaceholders})
        ORDER BY i.sort_order ASC, q.level ASC, q.id ASC
      `)
      .all(...indicatorIds, ...levels) as { id: string }[];

    if (pool.length === 0) {
      throw new AppError(400, 'NO_QUESTIONS_AVAILABLE', 'Tidak ada soal yang tersedia untuk filter yang dipilih.');
    }

    let selectedIds: string[];
    if (mode === 'QUICK') {
      const requested = input.questionCount ?? Math.min(10, pool.length);
      if (!Number.isInteger(requested) || requested < 1 || requested > 200) {
        throw new AppError(400, 'INVALID_QUESTION_COUNT', 'Jumlah soal Quick Match harus bilangan bulat positif (1–200).');
      }
      if (!allowRepeat && requested > pool.length) {
        throw new AppError(
          400,
          'INSUFFICIENT_QUESTIONS',
          `Jumlah soal yang diminta (${requested}) melebihi bank soal tersedia (${pool.length}). Aktifkan opsi pengulangan atau kurangi jumlah soal.`,
        );
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

    const settings: MatchSettings = {
      durationSeconds,
      pointsCorrect,
      order,
      showOptionsOnDisplay,
      allowAnswerReveal,
      indicatorIds,
      levels,
      questionCount: selectedIds.length,
      allowRepeat,
    };

    const matchId = crypto.randomUUID();
    const controllerToken = generateControllerToken();
    const controllerTokenHash = hashToken(controllerToken);
    const durationMs = durationSeconds * 1000;

    const roomCode = this.inTx(() => {
      let code = '';
      for (let attempt = 0; attempt < 20; attempt++) {
        const candidate = randomCode(6);
        const exists = this.db.prepare(`SELECT 1 FROM matches WHERE room_code = ?`).get(candidate);
        if (!exists) {
          code = candidate;
          break;
        }
      }
      if (!code) throw new AppError(500, 'ROOM_CODE_EXHAUSTED', 'Gagal membuat kode ruang unik.');

      this.db
        .prepare(`
          INSERT INTO matches (
            id, room_code, controller_token_hash, status, mode, settings_json,
            current_question_index, current_question_id, created_at
          ) VALUES (?, ?, ?, 'LOBBY', ?, ?, 0, ?, ?)
        `)
        .run(matchId, code, controllerTokenHash, mode, JSON.stringify(settings), selectedIds[0], now);

      const insPlayer = this.db.prepare(`
        INSERT INTO match_players (id, match_id, seat_number, display_name, score, theme_color)
        VALUES (?, ?, ?, ?, 0, ?)
      `);
      for (let i = 0; i < 3; i++) {
        insPlayer.run(crypto.randomUUID(), matchId, i + 1, cleanNames[i], PLAYER_COLORS[i]);
      }

      const insMq = this.db.prepare(`
        INSERT INTO match_questions (
          id, match_id, question_id, sequence_number, status, remaining_ms,
          deadline_at, attempted_player_ids_json, selected_player_id, result, answer_revealed
        ) VALUES (?, ?, ?, ?, 'PENDING', ?, NULL, '[]', NULL, NULL, 0)
      `);
      for (let idx = 0; idx < selectedIds.length; idx++) {
        insMq.run(crypto.randomUUID(), matchId, selectedIds[idx], idx + 1, durationMs);
      }

      this.logEvent(matchId, null, 'MATCH_CREATED', { mode, questionCount: selectedIds.length }, now);
      return code;
    });

    return {
      matchId,
      roomCode,
      controllerToken,
      snapshot: this.getSnapshot(roomCode, 'controller', now),
    };
  }

  private logEvent(matchId: string, actionId: string | null | undefined, eventType: string, payload: unknown, now: number): void {
    this.db
      .prepare(`
        INSERT INTO match_events (id, match_id, action_id, event_type, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(crypto.randomUUID(), matchId, actionId ?? null, eventType, JSON.stringify(payload), now);
  }

  private reconcileTimeoutTx(matchRow: { id: string; status: string; current_question_index: number }, now: number): boolean {
    if (matchRow.status !== 'RUNNING') return false;
    const mq = this.db
      .prepare(`SELECT id, deadline_at FROM match_questions WHERE match_id = ? AND sequence_number = ?`)
      .get(matchRow.id, matchRow.current_question_index + 1) as { id: string; deadline_at: number | null } | undefined;
    if (!mq || mq.deadline_at === null || now < mq.deadline_at) return false;

    this.db
      .prepare(`
        UPDATE match_questions
        SET status = 'TIMEOUT', result = 'TIMEOUT', remaining_ms = 0, deadline_at = NULL, selected_player_id = NULL
        WHERE id = ?
      `)
      .run(mq.id);
    this.db.prepare(`UPDATE matches SET status = 'QUESTION_FINISHED' WHERE id = ?`).run(matchRow.id);
    this.logEvent(matchRow.id, null, 'QUESTION_FINISHED', { reason: 'TIMEOUT', matchQuestionId: mq.id }, now);
    return true;
  }

  reconcileTimeout(roomCode: string, now = Date.now()): boolean {
    const code = roomCode.trim().toUpperCase();
    return this.inTx(() => {
      const m = this.db
        .prepare(`SELECT id, status, current_question_index FROM matches WHERE room_code = ?`)
        .get(code) as { id: string; status: string; current_question_index: number } | undefined;
      if (!m) return false;
      return this.reconcileTimeoutTx(m, now);
    });
  }

  getNextDeadline(roomCode: string): number | null {
    const m = this.db
      .prepare(`SELECT id, status, current_question_index FROM matches WHERE room_code = ?`)
      .get(roomCode.trim().toUpperCase()) as { id: string; status: string; current_question_index: number } | undefined;
    if (!m || m.status !== 'RUNNING') return null;
    const mq = this.db
      .prepare(`SELECT deadline_at FROM match_questions WHERE match_id = ? AND sequence_number = ?`)
      .get(m.id, m.current_question_index + 1) as { deadline_at: number | null } | undefined;
    return mq?.deadline_at ?? null;
  }

  getSnapshot(roomCode: string, role: 'display' | 'controller', now = Date.now()) {
    const code = roomCode.trim().toUpperCase();
    this.reconcileTimeout(code, now);

    const match = this.db.prepare(`SELECT * FROM matches WHERE room_code = ?`).get(code) as
      | {
          id: string;
          room_code: string;
          status: string;
          mode: string;
          settings_json: string;
          current_question_index: number;
          current_question_id: string | null;
          created_at: number;
          started_at: number | null;
          finished_at: number | null;
        }
      | undefined;

    if (!match) {
      throw new AppError(404, 'ROOM_NOT_FOUND', `Ruang pertandingan "${code}" tidak ditemukan.`);
    }

    const settings: MatchSettings = JSON.parse(match.settings_json);
    const rawPlayers = this.db
      .prepare(`
        SELECT id, seat_number AS seatNumber, display_name AS displayName, score, theme_color AS themeColor
        FROM match_players
        WHERE match_id = ?
        ORDER BY seat_number ASC
      `)
      .all(match.id) as { id: string; seatNumber: number; displayName: string; score: number; themeColor: string }[];

    const { bySeat, standings } = computeStandings(rawPlayers);

    const totalRow = this.db
      .prepare(`SELECT COUNT(*) AS cnt FROM match_questions WHERE match_id = ?`)
      .get(match.id) as { cnt: number };

    let currentQuestion: Record<string, unknown> | null = null;
    if (match.status !== 'LOBBY') {
      const mq = this.db
        .prepare(`
          SELECT mq.*, q.indicator_id, q.level, q.difficulty, q.question_text,
                 q.options_json, q.correct_option, q.explanation,
                 i.category, i.topic, i.indicator_text
          FROM match_questions mq
          JOIN questions q ON q.id = mq.question_id
          JOIN indicators i ON i.id = q.indicator_id
          WHERE mq.match_id = ? AND mq.sequence_number = ?
        `)
        .get(match.id, match.current_question_index + 1) as Record<string, unknown> | undefined;

      if (mq) {
        const attempts = this.db
          .prepare(`
            SELECT a.id, a.player_id AS playerId, p.display_name AS playerName, p.seat_number AS seatNumber,
                   a.result, a.points_awarded AS pointsAwarded, a.created_at AS createdAt
            FROM answer_attempts a
            JOIN match_players p ON p.id = a.player_id
            WHERE a.match_question_id = ?
            ORDER BY a.created_at ASC, a.rowid ASC
          `)
          .all(mq.id as string);

        const isController = role === 'controller';
        const isPending = mq.status === 'PENDING';
        const isFinished = match.status === 'QUESTION_FINISHED' || match.status === 'MATCH_FINISHED';
        const revealed = Boolean(mq.answer_revealed) && settings.allowAnswerReveal && isFinished;

        const showQuestionText = isController || !isPending;
        const showOptions = isController || (!isPending && (settings.showOptionsOnDisplay || revealed));
        const showAnswerKey = isController || revealed;

        const liveRemainingMs =
          match.status === 'RUNNING' && typeof mq.deadline_at === 'number'
            ? Math.max(0, mq.deadline_at - now)
            : (mq.remaining_ms as number);

        currentQuestion = {
          matchQuestionId: mq.id,
          questionId: mq.question_id,
          sequenceNumber: mq.sequence_number,
          totalQuestions: totalRow.cnt,
          indicatorId: mq.indicator_id,
          category: mq.category,
          topic: mq.topic,
          indicatorText: mq.indicator_text,
          level: mq.level,
          difficulty: mq.difficulty,
          status: mq.status,
          result: mq.result,
          remainingMs: liveRemainingMs,
          deadlineAt: mq.deadline_at,
          selectedPlayerId: mq.selected_player_id,
          attemptedPlayerIds: JSON.parse(mq.attempted_player_ids_json as string) as string[],
          answerRevealed: Boolean(mq.answer_revealed),
          questionText: showQuestionText ? mq.question_text : null,
          options: showOptions ? JSON.parse(mq.options_json as string) : null,
          correctOption: showAnswerKey ? mq.correct_option : null,
          explanation: showAnswerKey ? mq.explanation : null,
          attempts,
        };
      }
    }

    const adjustEvents = this.db
      .prepare(`
        SELECT id, payload_json, created_at AS createdAt
        FROM match_events
        WHERE match_id = ? AND event_type = 'SCORE_ADJUSTED'
        ORDER BY created_at DESC, rowid DESC
      `)
      .all(match.id) as { id: string; payload_json: string; createdAt: number }[];

    const scoreAdjustments = adjustEvents.map((ev) => ({
      id: ev.id,
      createdAt: ev.createdAt,
      ...(JSON.parse(ev.payload_json) as Record<string, unknown>),
    }));

    return {
      role,
      serverNow: now,
      match: {
        id: match.id,
        roomCode: match.room_code,
        status: match.status,
        mode: match.mode,
        settings,
        currentQuestionIndex: match.current_question_index,
        totalQuestions: totalRow.cnt,
        createdAt: match.created_at,
        startedAt: match.started_at,
        finishedAt: match.finished_at,
      },
      players: bySeat,
      standings,
      currentQuestion,
      scoreAdjustments,
    };
  }

  dispatchAction(roomCode: string, token: string | null | undefined, action: GameAction, now = Date.now()) {
    const code = roomCode.trim().toUpperCase();
    const exists = this.db.prepare(`SELECT id FROM matches WHERE room_code = ?`).get(code);
    if (!exists) {
      throw new AppError(404, 'ROOM_NOT_FOUND', `Ruang pertandingan "${code}" tidak ditemukan.`);
    }
    if (!this.verifyToken(code, token)) {
      throw new AppError(401, 'INVALID_CONTROLLER_TOKEN', 'Token controller tidak valid. Akses kontrol ditolak.');
    }
    if (!action || typeof action !== 'object' || typeof action.type !== 'string') {
      throw new AppError(400, 'INVALID_ACTION', 'Format aksi tidak valid.');
    }

    let emittedEvent = action.type as string;

    this.inTx(() => {
      const match = this.db.prepare(`SELECT * FROM matches WHERE room_code = ?`).get(code) as {
        id: string;
        status: string;
        settings_json: string;
        current_question_index: number;
      };

      if (action.actionId) {
        const dup = this.db
          .prepare(`SELECT event_type FROM match_events WHERE match_id = ? AND action_id = ?`)
          .get(match.id, action.actionId) as { event_type: string } | undefined;
        if (dup) {
          emittedEvent = dup.event_type;
          return;
        }
      }

      if (this.reconcileTimeoutTx(match, now)) {
        match.status = 'QUESTION_FINISHED';
      }

      if (match.status === 'MATCH_FINISHED') {
        throw new AppError(409, 'MATCH_ALREADY_FINISHED', 'Pertandingan sudah selesai dan tidak dapat diubah lagi.');
      }

      const settings: MatchSettings = JSON.parse(match.settings_json);
      const getCurrentMq = () =>
        this.db
          .prepare(`SELECT * FROM match_questions WHERE match_id = ? AND sequence_number = ?`)
          .get(match.id, match.current_question_index + 1) as {
          id: string;
          question_id: string;
          sequence_number: number;
          status: string;
          remaining_ms: number;
          deadline_at: number | null;
          attempted_player_ids_json: string;
          selected_player_id: string | null;
          result: string | null;
          answer_revealed: number;
        };

      switch (action.type) {
        case 'START_MATCH': {
          if (match.status !== 'LOBBY') {
            throw new AppError(409, 'INVALID_STATE', 'Pertandingan hanya dapat dimulai dari status LOBBY.');
          }
          const firstMq = this.db
            .prepare(`SELECT question_id FROM match_questions WHERE match_id = ? AND sequence_number = 1`)
            .get(match.id) as { question_id: string } | undefined;
          if (!firstMq) {
            throw new AppError(400, 'NO_QUESTIONS', 'Soal tidak tersedia untuk memulai pertandingan.');
          }
          this.db
            .prepare(`UPDATE matches SET status = 'READY', started_at = ?, current_question_index = 0, current_question_id = ? WHERE id = ?`)
            .run(now, firstMq.question_id, match.id);
          emittedEvent = 'MATCH_STARTED';
          this.logEvent(match.id, action.actionId, emittedEvent, {}, now);
          break;
        }

        case 'START_QUESTION': {
          if (match.status !== 'READY') {
            throw new AppError(409, 'INVALID_STATE', 'Soal hanya dapat dimulai saat status SIAP (READY).');
          }
          const mq = getCurrentMq();
          const deadlineAt = now + mq.remaining_ms;
          this.db
            .prepare(`UPDATE match_questions SET status = 'RUNNING', deadline_at = ? WHERE id = ?`)
            .run(deadlineAt, mq.id);
          this.db.prepare(`UPDATE matches SET status = 'RUNNING' WHERE id = ?`).run(match.id);
          emittedEvent = 'QUESTION_STARTED';
          this.logEvent(match.id, action.actionId, emittedEvent, { sequenceNumber: mq.sequence_number, deadlineAt }, now);
          break;
        }

        case 'SELECT_PLAYER': {
          if (match.status !== 'RUNNING') {
            throw new AppError(409, 'INVALID_STATE', 'Peserta hanya dapat dipilih saat timer sedang berjalan.');
          }
          const player = this.db
            .prepare(`SELECT id, display_name FROM match_players WHERE id = ? AND match_id = ?`)
            .get(action.playerId, match.id) as { id: string; display_name: string } | undefined;
          if (!player) {
            throw new AppError(400, 'PLAYER_NOT_FOUND', 'Peserta tidak ditemukan dalam pertandingan ini.');
          }
          const mq = getCurrentMq();
          const attempted: string[] = JSON.parse(mq.attempted_player_ids_json);
          if (attempted.includes(player.id)) {
            throw new AppError(409, 'PLAYER_ALREADY_ATTEMPTED', `${player.display_name} sudah menjawab salah pada soal ini.`);
          }
          const remainingMs = Math.max(0, (mq.deadline_at ?? now) - now);
          if (remainingMs <= 0) {
            this.reconcileTimeoutTx(match, now);
            throw new AppError(409, 'QUESTION_TIMED_OUT', 'Waktu soal sudah habis.');
          }
          this.db
            .prepare(`
              UPDATE match_questions
              SET status = 'ANSWERING', remaining_ms = ?, deadline_at = NULL, selected_player_id = ?
              WHERE id = ?
            `)
            .run(remainingMs, player.id, mq.id);
          this.db.prepare(`UPDATE matches SET status = 'ANSWERING' WHERE id = ?`).run(match.id);
          emittedEvent = 'PLAYER_SELECTED';
          this.logEvent(match.id, action.actionId, emittedEvent, { playerId: player.id, remainingMs }, now);
          break;
        }

        case 'CANCEL_SELECTION': {
          if (match.status !== 'ANSWERING') {
            throw new AppError(409, 'INVALID_STATE', 'Tidak ada pemilihan peserta aktif untuk dibatalkan.');
          }
          const mq = getCurrentMq();
          const attempted: string[] = JSON.parse(mq.attempted_player_ids_json);
          const nextQStatus = attempted.length > 0 ? 'WRONG_RETRY' : 'RUNNING';
          const deadlineAt = now + mq.remaining_ms;
          this.db
            .prepare(`
              UPDATE match_questions
              SET status = ?, deadline_at = ?, selected_player_id = NULL
              WHERE id = ?
            `)
            .run(nextQStatus, deadlineAt, mq.id);
          this.db.prepare(`UPDATE matches SET status = 'RUNNING' WHERE id = ?`).run(match.id);
          emittedEvent = 'PLAYER_SELECTION_CANCELLED';
          this.logEvent(match.id, action.actionId, emittedEvent, { remainingMs: mq.remaining_ms, deadlineAt }, now);
          break;
        }

        case 'JUDGE_CORRECT': {
          if (match.status !== 'ANSWERING') {
            throw new AppError(409, 'INVALID_STATE', 'Penilaian BENAR hanya dapat dilakukan saat peserta sedang menjawab.');
          }
          const mq = getCurrentMq();
          if (!mq.selected_player_id) {
            throw new AppError(409, 'NO_SELECTED_PLAYER', 'Belum ada peserta yang dipilih.');
          }
          const alreadyCorrect = this.db
            .prepare(`SELECT 1 FROM answer_attempts WHERE match_question_id = ? AND result = 'CORRECT'`)
            .get(mq.id);
          if (alreadyCorrect) {
            throw new AppError(409, 'ALREADY_SCORED', 'Poin untuk soal ini sudah diberikan.');
          }

          const pts = settings.pointsCorrect;
          const attempted: string[] = JSON.parse(mq.attempted_player_ids_json);
          if (!attempted.includes(mq.selected_player_id)) attempted.push(mq.selected_player_id);

          this.db
            .prepare(`UPDATE match_players SET score = score + ? WHERE id = ? AND match_id = ?`)
            .run(pts, mq.selected_player_id, match.id);
          this.db
            .prepare(`
              INSERT INTO answer_attempts (id, match_question_id, player_id, result, points_awarded, created_at)
              VALUES (?, ?, ?, 'CORRECT', ?, ?)
            `)
            .run(crypto.randomUUID(), mq.id, mq.selected_player_id, pts, now);
          this.db
            .prepare(`
              UPDATE match_questions
              SET status = 'FINISHED', result = 'CORRECT', deadline_at = NULL, attempted_player_ids_json = ?
              WHERE id = ?
            `)
            .run(JSON.stringify(attempted), mq.id);
          this.db.prepare(`UPDATE matches SET status = 'QUESTION_FINISHED' WHERE id = ?`).run(match.id);

          emittedEvent = 'ANSWER_CORRECT';
          this.logEvent(match.id, action.actionId, emittedEvent, { playerId: mq.selected_player_id, pointsAwarded: pts }, now);
          break;
        }

        case 'JUDGE_WRONG': {
          if (match.status !== 'ANSWERING') {
            throw new AppError(409, 'INVALID_STATE', 'Penilaian SALAH hanya dapat dilakukan saat peserta sedang menjawab.');
          }
          const mq = getCurrentMq();
          if (!mq.selected_player_id) {
            throw new AppError(409, 'NO_SELECTED_PLAYER', 'Belum ada peserta yang dipilih.');
          }

          const attempted: string[] = JSON.parse(mq.attempted_player_ids_json);
          if (!attempted.includes(mq.selected_player_id)) attempted.push(mq.selected_player_id);

          this.db
            .prepare(`
              INSERT INTO answer_attempts (id, match_question_id, player_id, result, points_awarded, created_at)
              VALUES (?, ?, ?, 'WRONG', 0, ?)
            `)
            .run(crypto.randomUUID(), mq.id, mq.selected_player_id, now);

          if (attempted.length < 3 && mq.remaining_ms > 0) {
            const deadlineAt = now + mq.remaining_ms;
            this.db
              .prepare(`
                UPDATE match_questions
                SET status = 'WRONG_RETRY', deadline_at = ?, selected_player_id = NULL, attempted_player_ids_json = ?
                WHERE id = ?
              `)
              .run(deadlineAt, JSON.stringify(attempted), mq.id);
            this.db.prepare(`UPDATE matches SET status = 'RUNNING' WHERE id = ?`).run(match.id);
            emittedEvent = 'ANSWER_WRONG';
            this.logEvent(
              match.id,
              action.actionId,
              emittedEvent,
              { playerId: mq.selected_player_id, remainingMs: mq.remaining_ms, questionFinished: false },
              now,
            );
          } else {
            const finalResult = attempted.length >= 3 ? 'ALL_WRONG' : 'TIMEOUT';
            this.db
              .prepare(`
                UPDATE match_questions
                SET status = 'FINISHED', result = ?, deadline_at = NULL, selected_player_id = NULL, attempted_player_ids_json = ?
                WHERE id = ?
              `)
              .run(finalResult, JSON.stringify(attempted), mq.id);
            this.db.prepare(`UPDATE matches SET status = 'QUESTION_FINISHED' WHERE id = ?`).run(match.id);
            emittedEvent = 'ANSWER_WRONG';
            this.logEvent(
              match.id,
              action.actionId,
              emittedEvent,
              { playerId: mq.selected_player_id, reason: finalResult, questionFinished: true },
              now,
            );
          }
          break;
        }

        case 'PAUSE_MATCH': {
          if (match.status !== 'RUNNING') {
            throw new AppError(409, 'INVALID_STATE', 'Pertandingan hanya dapat dijeda saat timer berjalan.');
          }
          const mq = getCurrentMq();
          const remainingMs = Math.max(0, (mq.deadline_at ?? now) - now);
          this.db
            .prepare(`UPDATE match_questions SET remaining_ms = ?, deadline_at = NULL WHERE id = ?`)
            .run(remainingMs, mq.id);
          this.db.prepare(`UPDATE matches SET status = 'PAUSED' WHERE id = ?`).run(match.id);
          emittedEvent = 'MATCH_PAUSED';
          this.logEvent(match.id, action.actionId, emittedEvent, { remainingMs }, now);
          break;
        }

        case 'RESUME_MATCH': {
          if (match.status !== 'PAUSED') {
            throw new AppError(409, 'INVALID_STATE', 'Pertandingan tidak sedang dalam status jeda.');
          }
          const mq = getCurrentMq();
          const attempted: string[] = JSON.parse(mq.attempted_player_ids_json);
          const nextQStatus = attempted.length > 0 ? 'WRONG_RETRY' : 'RUNNING';
          const deadlineAt = now + mq.remaining_ms;
          this.db
            .prepare(`UPDATE match_questions SET status = ?, deadline_at = ? WHERE id = ?`)
            .run(nextQStatus, deadlineAt, mq.id);
          this.db.prepare(`UPDATE matches SET status = 'RUNNING' WHERE id = ?`).run(match.id);
          emittedEvent = 'MATCH_RESUMED';
          this.logEvent(match.id, action.actionId, emittedEvent, { remainingMs: mq.remaining_ms, deadlineAt }, now);
          break;
        }

        case 'REVEAL_ANSWER': {
          if (match.status !== 'QUESTION_FINISHED') {
            throw new AppError(409, 'INVALID_STATE', 'Kunci jawaban hanya dapat ditampilkan setelah soal selesai.');
          }
          if (!settings.allowAnswerReveal) {
            throw new AppError(400, 'REVEAL_DISABLED', 'Pengaturan pertandingan menonaktifkan tampilan kunci jawaban di Display.');
          }
          const mq = getCurrentMq();
          const nextVal = typeof action.reveal === 'boolean' ? (action.reveal ? 1 : 0) : mq.answer_revealed ? 0 : 1;
          this.db.prepare(`UPDATE match_questions SET answer_revealed = ? WHERE id = ?`).run(nextVal, mq.id);
          emittedEvent = 'ANSWER_REVEALED';
          this.logEvent(match.id, action.actionId, emittedEvent, { answerRevealed: Boolean(nextVal) }, now);
          break;
        }

        case 'NEXT_QUESTION': {
          if (match.status !== 'QUESTION_FINISHED') {
            throw new AppError(409, 'INVALID_STATE', 'Selesaikan soal saat ini terlebih dahulu sebelum lanjut.');
          }
          const totalRow = this.db
            .prepare(`SELECT COUNT(*) AS cnt FROM match_questions WHERE match_id = ?`)
            .get(match.id) as { cnt: number };
          const nextIndex = match.current_question_index + 1;
          if (nextIndex < totalRow.cnt) {
            const nextMq = this.db
              .prepare(`SELECT question_id FROM match_questions WHERE match_id = ? AND sequence_number = ?`)
              .get(match.id, nextIndex + 1) as { question_id: string };
            this.db
              .prepare(`UPDATE matches SET status = 'READY', current_question_index = ?, current_question_id = ? WHERE id = ?`)
              .run(nextIndex, nextMq.question_id, match.id);
            emittedEvent = 'NEXT_QUESTION';
            this.logEvent(match.id, action.actionId, emittedEvent, { sequenceNumber: nextIndex + 1 }, now);
          } else {
            this.db
              .prepare(`UPDATE matches SET status = 'MATCH_FINISHED', finished_at = ? WHERE id = ?`)
              .run(now, match.id);
            emittedEvent = 'MATCH_FINISHED';
            this.logEvent(match.id, action.actionId, emittedEvent, { endedEarly: false }, now);
          }
          break;
        }

        case 'ADJUST_SCORE': {
          if (!Number.isInteger(action.delta) || action.delta === 0 || Math.abs(action.delta) > 1000) {
            throw new AppError(400, 'INVALID_DELTA', 'Perubahan skor harus bilangan bulat bukan nol (maks ±1000).');
          }
          const reason = typeof action.reason === 'string' ? action.reason.replace(/\s+/g, ' ').trim() : '';
          if (reason.length < 3 || reason.length > 200) {
            throw new AppError(400, 'REASON_REQUIRED', 'Alasan koreksi skor wajib diisi (minimal 3 karakter).');
          }
          const player = this.db
            .prepare(`SELECT id, display_name, score FROM match_players WHERE id = ? AND match_id = ?`)
            .get(action.playerId, match.id) as { id: string; display_name: string; score: number } | undefined;
          if (!player) {
            throw new AppError(400, 'PLAYER_NOT_FOUND', 'Peserta tidak ditemukan.');
          }
          const newScore = player.score + action.delta;
          if (newScore < 0) {
            throw new AppError(400, 'NEGATIVE_SCORE_FORBIDDEN', 'Skor peserta tidak boleh menjadi negatif.');
          }
          this.db.prepare(`UPDATE match_players SET score = ? WHERE id = ?`).run(newScore, player.id);
          emittedEvent = 'SCORE_ADJUSTED';
          this.logEvent(
            match.id,
            action.actionId,
            emittedEvent,
            {
              playerId: player.id,
              playerName: player.display_name,
              oldScore: player.score,
              newScore,
              delta: action.delta,
              reason,
            },
            now,
          );
          break;
        }

        case 'END_MATCH': {
          if (match.status !== 'LOBBY') {
            const mq = getCurrentMq();
            if (mq && !['FINISHED', 'TIMEOUT', 'PENDING'].includes(mq.status)) {
              const rem = match.status === 'RUNNING' ? Math.max(0, (mq.deadline_at ?? now) - now) : mq.remaining_ms;
              this.db
                .prepare(`
                  UPDATE match_questions
                  SET status = 'FINISHED', result = COALESCE(result, 'ABORTED'), remaining_ms = ?, deadline_at = NULL, selected_player_id = NULL
                  WHERE id = ?
                `)
                .run(rem, mq.id);
            }
          }
          this.db.prepare(`UPDATE matches SET status = 'MATCH_FINISHED', finished_at = ? WHERE id = ?`).run(now, match.id);
          emittedEvent = 'MATCH_FINISHED';
          this.logEvent(match.id, action.actionId, emittedEvent, { endedEarly: true }, now);
          break;
        }

        default:
          throw new AppError(400, 'UNKNOWN_ACTION', 'Tipe aksi tidak dikenali.');
      }
    });

    return {
      eventType: emittedEvent,
      snapshotDisplay: this.getSnapshot(code, 'display', now),
      snapshotController: this.getSnapshot(code, 'controller', now),
    };
  }

  listHistory(dateFilter?: string) {
    const rows = this.db
      .prepare(`
        SELECT id, room_code AS roomCode, status, mode, settings_json AS settingsJson,
               created_at AS createdAt, started_at AS startedAt, finished_at AS finishedAt
        FROM matches
        ORDER BY created_at DESC
      `)
      .all() as {
      id: string;
      roomCode: string;
      status: string;
      mode: string;
      settingsJson: string;
      createdAt: number;
      startedAt: number | null;
      finishedAt: number | null;
    }[];

    const getPlayers = this.db.prepare(`
      SELECT id, seat_number AS seatNumber, display_name AS displayName, score, theme_color AS themeColor
      FROM match_players WHERE match_id = ? ORDER BY seat_number ASC
    `);

    const filtered = rows.filter((r) => {
      if (!dateFilter || !/^\d{4}-\d{2}-\d{2}$/.test(dateFilter)) return true;
      const d = new Date(r.createdAt);
      const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return localDate === dateFilter;
    });

    return filtered.map((r) => {
      const settings: MatchSettings = JSON.parse(r.settingsJson);
      const rawP = getPlayers.all(r.id) as {
        id: string;
        seatNumber: number;
        displayName: string;
        score: number;
        themeColor: string;
      }[];
      const { standings } = computeStandings(rawP);
      return {
        id: r.id,
        roomCode: r.roomCode,
        status: r.status,
        mode: r.mode,
        questionCount: settings.questionCount,
        durationSeconds: settings.durationSeconds,
        pointsCorrect: settings.pointsCorrect,
        createdAt: r.createdAt,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        standings,
      };
    });
  }

  getHistoryDetail(matchIdOrCode: string) {
    const key = matchIdOrCode.trim();
    const match = this.db
      .prepare(`SELECT * FROM matches WHERE id = ? OR room_code = ?`)
      .get(key, key.toUpperCase()) as
      | {
          id: string;
          room_code: string;
          status: string;
          mode: string;
          settings_json: string;
          created_at: number;
          started_at: number | null;
          finished_at: number | null;
        }
      | undefined;

    if (!match) throw new AppError(404, 'MATCH_NOT_FOUND', 'Data riwayat pertandingan tidak ditemukan.');

    const settings: MatchSettings = JSON.parse(match.settings_json);
    const rawPlayers = this.db
      .prepare(`
        SELECT id, seat_number AS seatNumber, display_name AS displayName, score, theme_color AS themeColor
        FROM match_players WHERE match_id = ? ORDER BY seat_number ASC
      `)
      .all(match.id) as { id: string; seatNumber: number; displayName: string; score: number; themeColor: string }[];
    const { bySeat, standings } = computeStandings(rawPlayers);

    const isMatchFinished = match.status === 'MATCH_FINISHED';

    const mqs = this.db
      .prepare(`
        SELECT mq.id, mq.sequence_number AS sequenceNumber, mq.question_id AS questionId,
               mq.status, mq.result, mq.remaining_ms AS remainingMs,
               q.level, q.difficulty, q.question_text AS questionText,
               q.correct_option AS correctOption, q.explanation,
               i.id AS indicatorId, i.category, i.topic
        FROM match_questions mq
        JOIN questions q ON q.id = mq.question_id
        JOIN indicators i ON i.id = q.indicator_id
        WHERE mq.match_id = ?
        ORDER BY mq.sequence_number ASC
      `)
      .all(match.id) as Record<string, unknown>[];

    const getAttempts = this.db.prepare(`
      SELECT a.id, a.player_id AS playerId, p.display_name AS playerName, p.seat_number AS seatNumber,
             a.result, a.points_awarded AS pointsAwarded, a.created_at AS createdAt
      FROM answer_attempts a
      JOIN match_players p ON p.id = a.player_id
      WHERE a.match_question_id = ?
      ORDER BY a.created_at ASC, a.rowid ASC
    `);

    const questions = mqs.map((q) => ({
      sequenceNumber: q.sequenceNumber,
      questionId: q.questionId,
      indicatorId: q.indicatorId,
      category: q.category,
      topic: q.topic,
      level: q.level,
      difficulty: q.difficulty,
      status: q.status,
      result: q.result,
      questionText: isMatchFinished ? q.questionText : null,
      correctOption: isMatchFinished ? q.correctOption : null,
      explanation: isMatchFinished ? q.explanation : null,
      attempts: getAttempts.all(q.id as string),
    }));

    const adjustRows = this.db
      .prepare(`
        SELECT id, payload_json, created_at AS createdAt
        FROM match_events WHERE match_id = ? AND event_type = 'SCORE_ADJUSTED'
        ORDER BY created_at ASC, rowid ASC
      `)
      .all(match.id) as { id: string; payload_json: string; createdAt: number }[];

    return {
      id: match.id,
      roomCode: match.room_code,
      status: match.status,
      mode: match.mode,
      settings,
      createdAt: match.created_at,
      startedAt: match.started_at,
      finishedAt: match.finished_at,
      players: bySeat,
      standings,
      questions,
      scoreAdjustments: adjustRows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        ...(JSON.parse(r.payload_json) as Record<string, unknown>),
      })),
    };
  }

  deleteHistory(matchId: string) {
    const row = this.db.prepare(`SELECT id, status FROM matches WHERE id = ?`).get(matchId) as
      | { id: string; status: string }
      | undefined;
    if (!row) throw new AppError(404, 'MATCH_NOT_FOUND', 'Riwayat pertandingan tidak ditemukan.');
    if (!['MATCH_FINISHED', 'LOBBY'].includes(row.status)) {
      throw new AppError(409, 'MATCH_ACTIVE', 'Pertandingan masih berlangsung. Akhiri pertandingan terlebih dahulu sebelum menghapus riwayat.');
    }
    this.db.prepare(`DELETE FROM matches WHERE id = ?`).run(row.id);
    return { deletedId: row.id };
  }

  close(): void {
    this.db.close();
  }
}
