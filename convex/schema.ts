import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  indicators: defineTable({
    id: v.string(), // e.g. "IND-01"
    category: v.string(),
    topic: v.string(),
    indicatorText: v.string(),
    sortOrder: v.number(),
  }).index('by_indicator_id', ['id']),

  questions: defineTable({
    id: v.string(), // e.g. "Q001"
    indicatorId: v.string(),
    category: v.string(),
    topic: v.string(),
    level: v.number(),
    difficulty: v.union(v.literal('easy'), v.literal('medium'), v.literal('hard')),
    bank: v.optional(v.union(v.literal('BASIC'), v.literal('ADVANCED'))), // ponytail: missing = 'BASIC' (old Q001–Q039 docs)
    question: v.string(),
    options: v.object({
      A: v.string(),
      B: v.string(),
      C: v.string(),
      D: v.string(),
    }),
    correctOption: v.union(v.literal('A'), v.literal('B'), v.literal('C'), v.literal('D')),
    explanation: v.string(),
    points: v.number(),
    recommendedTimeSeconds: v.number(),
    isActive: v.boolean(),
  })
    .index('by_question_id', ['id'])
    .index('by_indicator', ['indicatorId']),

  matches: defineTable({
    roomCode: v.string(),
    controllerTokenHash: v.string(),
    status: v.union(
      v.literal('LOBBY'),
      v.literal('READY'),
      v.literal('RUNNING'),
      v.literal('ANSWERING'),
      v.literal('PAUSED'),
      v.literal('QUESTION_FINISHED'),
      v.literal('MATCH_FINISHED'),
    ),
    mode: v.union(v.literal('FULL'), v.literal('CATEGORY'), v.literal('QUICK')),
    settings: v.object({
      durationSeconds: v.number(),
      pointsCorrect: v.number(),
      order: v.string(),
      showOptionsOnDisplay: v.boolean(),
      allowAnswerReveal: v.boolean(),
      indicatorIds: v.array(v.string()),
      levels: v.array(v.number()),
      questionCount: v.number(),
      allowRepeat: v.boolean(),
      bank: v.optional(v.union(v.literal('BASIC'), v.literal('ADVANCED'))),
    }),
    currentQuestionIndex: v.number(),
    currentQuestionId: v.optional(v.string()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
  })
    .index('by_roomCode', ['roomCode'])
    .index('by_createdAt', ['createdAt']),

  matchPlayers: defineTable({
    matchId: v.id('matches'),
    seatNumber: v.number(),
    displayName: v.string(),
    score: v.number(),
    themeColor: v.string(),
  }).index('by_match', ['matchId']),

  matchQuestions: defineTable({
    matchId: v.id('matches'),
    questionId: v.string(),
    sequenceNumber: v.number(),
    status: v.string(),
    remainingMs: v.number(),
    deadlineAt: v.optional(v.number()),
    attemptedPlayerIds: v.array(v.string()),
    selectedPlayerId: v.optional(v.string()),
    result: v.optional(v.string()),
    answerRevealed: v.boolean(),
  })
    .index('by_match', ['matchId'])
    .index('by_match_seq', ['matchId', 'sequenceNumber']),

  answerAttempts: defineTable({
    matchQuestionId: v.id('matchQuestions'),
    playerId: v.string(),
    result: v.union(v.literal('CORRECT'), v.literal('WRONG')),
    pointsAwarded: v.number(),
    createdAt: v.number(),
  }).index('by_match_question', ['matchQuestionId']),

  matchEvents: defineTable({
    matchId: v.id('matches'),
    actionId: v.optional(v.string()),
    eventType: v.string(),
    payload: v.any(),
    createdAt: v.number(),
  })
    .index('by_match', ['matchId'])
    .index('by_match_action', ['matchId', 'actionId']),
});

