import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  subIndicators: defineTable({
    id: v.string(), // e.g. "SUB-01"
    category: v.string(), // "TIU Verbal" | "TIU Numerik" | "TIU Figural"
    subIndicator: v.string(), // "Analogi", "Silogisme", etc.
    description: v.string(),
    sortOrder: v.number(),
  }).index('by_sub_id', ['id']),

  questionBank: defineTable({
    id: v.string(), // e.g. "TIU-VAN-001"
    subIndicatorId: v.string(),
    category: v.string(),
    subIndicator: v.string(),
    question: v.string(),
    options: v.object({
      A: v.string(),
      B: v.string(),
      C: v.string(),
      D: v.string(),
      E: v.string(),
    }),
    figural: v.optional(v.any()),
    correctOption: v.union(
      v.literal('A'),
      v.literal('B'),
      v.literal('C'),
      v.literal('D'),
      v.literal('E'),
    ),
    explanation: v.string(),
    explanationParts: v.object({
      coreQuestion: v.string(),
      knownInformation: v.string(),
      strategy: v.string(),
      solutionSteps: v.string(),
      correctAnswerReason: v.string(),
      distractorAnalysis: v.string(),
      patternTip: v.string(),
      finalCheck: v.string(),
    }),
    sourcePack: v.string(),
    isActive: v.boolean(),
  })
    .index('by_question_id', ['id'])
    .index('by_sub_indicator', ['subIndicatorId']),

  sessions: defineTable({
    joinCode: v.string(),
    title: v.string(),
    hostTokenHash: v.string(),
    status: v.union(
      v.literal('waiting'),
      v.literal('in_progress'),
      v.literal('completed'),
      v.literal('review_open'),
    ),
    joinOpen: v.boolean(),
    settings: v.object({
      pointsCorrect: v.number(),
      pointsWrong: v.number(),
      pointsBlank: v.number(),
      order: v.union(v.literal('sequential'), v.literal('random')),
      showSubIndicator: v.boolean(),
      allowAnswerChange: v.boolean(),
      subIndicatorIds: v.array(v.string()),
      questionCount: v.number(),
    }),
    questionIds: v.array(v.string()),
    reviewQuestionIndex: v.number(),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    reviewOpenedAt: v.optional(v.number()),
  })
    .index('by_joinCode', ['joinCode'])
    .index('by_createdAt', ['createdAt']),

  sessionQuestions: defineTable({
    sessionId: v.id('sessions'),
    questionId: v.string(),
    sequenceNumber: v.number(),
  })
    .index('by_session', ['sessionId'])
    .index('by_session_seq', ['sessionId', 'sequenceNumber']),

  participants: defineTable({
    sessionId: v.id('sessions'),
    displayName: v.string(),
    normalizedName: v.string(),
    participantTokenHash: v.string(),
    status: v.union(v.literal('joined'), v.literal('working'), v.literal('finished')),
    currentQuestionIndex: v.number(),
    answeredCount: v.number(),
    correctCount: v.number(),
    wrongCount: v.number(),
    score: v.number(),
    accuracy: v.number(),
    joinedAt: v.number(),
    finishedAt: v.optional(v.number()),
  })
    .index('by_session', ['sessionId'])
    .index('by_session_token', ['sessionId', 'participantTokenHash']),

  participantAnswers: defineTable({
    sessionId: v.id('sessions'),
    participantId: v.id('participants'),
    questionId: v.string(),
    selectedOption: v.union(
      v.literal('A'),
      v.literal('B'),
      v.literal('C'),
      v.literal('D'),
      v.literal('E'),
    ),
    isCorrect: v.boolean(),
    pointsAwarded: v.number(),
    submittedAt: v.number(),
  })
    .index('by_session', ['sessionId'])
    .index('by_participant', ['participantId'])
    .index('by_participant_question', ['participantId', 'questionId']),

  sessionEvents: defineTable({
    sessionId: v.id('sessions'),
    actionId: v.optional(v.string()),
    eventType: v.string(),
    payload: v.any(),
    createdAt: v.number(),
  })
    .index('by_session', ['sessionId'])
    .index('by_session_action', ['sessionId', 'actionId']),
});
