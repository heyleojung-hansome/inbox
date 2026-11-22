import { z } from "zod";
import { ERROR_TAG_KEYS } from "../types";

/** Gemini 응답 검증용 zod 스키마와, Gemini에 보내는 JSON Schema를 함께 둡니다. */

const tagEnum = z.enum(ERROR_TAG_KEYS as [string, ...string[]]);

export const GenItemZ = z.object({
  instructionKo: z.string().min(1),
  promptKo: z.string().optional(),
  promptEn: z.string().optional(),
  dialogue: z
    .array(z.object({ speaker: z.enum(["A", "B"]), en: z.string(), ko: z.string().optional() }))
    .optional(),
  choices: z.array(z.string()).optional(),
  answerKey: z.string().min(1),
  acceptable: z.array(z.string()).optional(),
  hint: z.string().optional(),
});
export type GenItem = z.infer<typeof GenItemZ>;

export const GenItemJson = {
  type: "object",
  properties: {
    instructionKo: { type: "string", description: "학습자에게 보여줄 문제 지시문 (한국어)" },
    promptKo: { type: "string", description: "영어로 옮길 한국어 문장 (작문 문제일 때)" },
    promptEn: { type: "string", description: "영어 질문 또는 문장 (객관식 문제일 때)" },
    dialogue: {
      type: "array",
      description: "듣기·읽기 문제용 짧은 대화 (2~5줄)",
      items: {
        type: "object",
        properties: {
          speaker: { type: "string", enum: ["A", "B"] },
          en: { type: "string" },
          ko: { type: "string" },
        },
        required: ["speaker", "en"],
      },
    },
    choices: { type: "array", items: { type: "string" }, description: "객관식 보기 4개" },
    answerKey: { type: "string", description: "정답. 객관식이면 보기 중 하나와 똑같은 문자열" },
    acceptable: { type: "array", items: { type: "string" }, description: "정답으로 인정할 다른 영어 표현" },
    hint: { type: "string", description: "한국어 힌트 한 문장" },
  },
  required: ["instructionKo", "answerKey"],
} as const;

export const EvalZ = z.object({
  isCorrect: z.boolean(),
  score: z.number().min(0).max(100),
  corrected: z.string(),
  explanationKo: z.string(),
  errorTags: z.array(tagEnum),
  encouragement: z.string(),
});

export const EvalJson = {
  type: "object",
  properties: {
    isCorrect: { type: "boolean", description: "의미가 통하고 문법 오류가 없으면 true" },
    score: { type: "integer", minimum: 0, maximum: 100 },
    corrected: { type: "string", description: "학습자 답을 최소한으로 고친 자연스러운 영어 문장. 맞았으면 학습자 답 그대로" },
    explanationKo: { type: "string", description: "틀린 이유를 초급자가 이해하도록 쉽게 설명 (2~3문장). 맞았으면 짧은 칭찬과 팁" },
    errorTags: { type: "array", items: { type: "string", enum: ERROR_TAG_KEYS } },
    encouragement: { type: "string", description: "짧은 격려 한마디" },
  },
  required: ["isCorrect", "score", "corrected", "explanationKo", "errorTags", "encouragement"],
} as const;

export const SummaryZ = z.object({
  summaryKo: z.string(),
  keyPhrases: z.array(z.object({ en: z.string(), ko: z.string() })),
  nextFocus: z.string(),
  memory: z.string(),
});

export const SummaryJson = {
  type: "object",
  properties: {
    summaryKo: { type: "string", description: "오늘 수업 총평 (2~3문장, 한국어)" },
    keyPhrases: {
      type: "array",
      items: { type: "object", properties: { en: { type: "string" }, ko: { type: "string" } }, required: ["en", "ko"] },
    },
    nextFocus: { type: "string", description: "다음 수업에서 집중할 점 한 문장 (한국어)" },
    memory: { type: "string", description: "선생님이 기억할 학습자 요약. 기존 메모를 갱신해 5문장 이내로" },
  },
  required: ["summaryKo", "keyPhrases", "nextFocus", "memory"],
} as const;

export const TalkZ = z.object({
  reply: z.string(),
  replyKo: z.string(),
  feedback: z.array(
    z.object({
      type: z.enum(["grammar", "expression", "good"]),
      original: z.string().optional(),
      suggestion: z.string().optional(),
      noteKo: z.string(),
    }),
  ),
  done: z.boolean(),
});

export const TalkJson = {
  type: "object",
  properties: {
    reply: { type: "string", description: "상대 역할로서의 다음 영어 대사. 학습자 수준에 맞게 짧고 쉽게" },
    replyKo: { type: "string", description: "reply의 한국어 번역" },
    feedback: {
      type: "array",
      description: "학습자의 방금 발화에 대한 피드백 0~2개",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["grammar", "expression", "good"] },
          original: { type: "string" },
          suggestion: { type: "string" },
          noteKo: { type: "string" },
        },
        required: ["type", "noteKo"],
      },
    },
    done: { type: "boolean", description: "상황이 자연스럽게 마무리되었으면 true" },
  },
  required: ["reply", "replyKo", "feedback", "done"],
} as const;

export const ReportZ = z.object({
  summaryKo: z.string(),
  good: z.array(z.string()),
  fixes: z.array(z.object({ original: z.string(), suggestion: z.string(), noteKo: z.string() })),
});

export const ReportJson = {
  type: "object",
  properties: {
    summaryKo: { type: "string" },
    good: { type: "array", items: { type: "string" }, description: "학습자가 잘 쓴 영어 표현" },
    fixes: {
      type: "array",
      description: "고치면 좋을 표현 최대 3개",
      items: {
        type: "object",
        properties: { original: { type: "string" }, suggestion: { type: "string" }, noteKo: { type: "string" } },
        required: ["original", "suggestion", "noteKo"],
      },
    },
  },
  required: ["summaryKo", "good", "fixes"],
} as const;
