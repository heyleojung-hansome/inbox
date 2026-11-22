import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { z } from "zod";
import { ERROR_TAGS, type Evaluation, type Item, type Learner } from "../types";
import { offlineProvider } from "./offline";
import type { AIProvider, GenContext, SummaryContext, TalkContext } from "./provider";
import {
  EvalJson, EvalZ, GenItemJson, GenItemZ, ReportJson, ReportZ, SummaryJson, SummaryZ, TalkJson, TalkZ,
} from "./schemas";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const uid = () => Math.random().toString(36).slice(2, 10);

let client: GoogleGenAI | null = null;
function ai() {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

const LEVEL_KO = { PRE_A1: "완전 초급", A1: "기초", A2: "초중급", B1: "중급" } as const;
const GOAL_KO = { daily: "일상 회화", travel: "해외 여행", work: "직장·비즈니스" } as const;

function tutorSystem(l: Learner): string {
  const ko = Math.round(l.koreanRatio * 100);
  const tone = l.tone === "coach" ? "친근하고 다정한 코치처럼 반말이 아닌 부드러운 존댓말(~해요체)" : "차분하고 정중한 선생님처럼 ~습니다/~해요체";
  return [
    "너는 한국인 성인 학습자를 가르치는 1:1 영어 튜터다. 단순히 정답을 알려주는 사람이 아니라 학습자가 스스로 말하고 쓸 수 있게 돕는다.",
    `말투: ${tone}.`,
    `설명 언어: 설명의 약 ${ko}%는 한국어, 나머지는 쉬운 영어로 한다. 영어 예문은 항상 영어로 쓴다.`,
    "원칙: 한 번에 한 문제만 낸다. 초급자에게 맞는 짧고 쉬운 문장을 쓴다. 틀린 답은 정답만 주지 말고 이유를 쉽게 설명한다. 학습자를 깎아내리지 않는다.",
    `학습자: 이름 ${l.name}, 수준 ${l.level}(${LEVEL_KO[l.level]}), 목표 ${GOAL_KO[l.goal]}, 난이도 ${l.difficulty}/5.`,
    l.memory ? `선생님 메모(이전 수업 기억):\n${l.memory}` : "",
    `오류 유형 태그는 다음 중에서만 고른다: ${Object.entries(ERROR_TAGS).map(([k, v]) => `${k}(${v})`).join(", ")}.`,
  ].filter(Boolean).join("\n");
}

async function callJson<T>(system: string, prompt: string, schema: object, zod: z.ZodType<T>): Promise<T> {
  const res = await ai().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      responseJsonSchema: schema,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      temperature: 0.7,
    },
  });
  const text = res.text;
  if (!text) throw new Error("Gemini 응답이 비어 있습니다");
  return zod.parse(JSON.parse(text));
}

async function withFallback<T>(label: string, fn: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[gemini] ${label} 실패, 예비 모드로 대체합니다:`, err instanceof Error ? err.message : err);
    return fallback();
  }
}

function genPrompt(ctx: GenContext): string {
  const { unit, step, type, skill } = ctx;
  const base = [
    `오늘의 단원: "${unit.title}" (핵심 문장: ${unit.keySentence})`,
    `목표 표현: ${unit.phrases.map((p) => `${p.en} (${p.ko})`).join(" / ")}`,
    `단원 문법 포인트: ${unit.grammar.noteKo}`,
    `최근 자주 틀린 유형: ${ctx.recentTags.length ? ctx.recentTags.join(", ") : "없음"}`,
    ctx.avoid.length ? `이미 낸 문제와 겹치지 않게 할 것: ${ctx.avoid.slice(-6).join(" | ")}` : "",
  ];
  if (ctx.reinforceTag) {
    return [...base,
      `학습자가 '${ERROR_TAGS[ctx.reinforceTag]}' 유형을 반복해서 틀렸다. 이 유형만 집중 연습할 수 있는 한→영 작문 문제를 1개 만들어라.`,
      "promptKo에 한국어 문장, answerKey에 가장 자연스러운 영어 정답, acceptable에 정답으로 인정할 다른 표현을 넣는다. hint에는 그 문법 규칙을 한 문장으로 적는다. dialogue와 choices는 비운다.",
    ].join("\n");
  }
  if (type === "mcq") {
    const listening = skill === "listening";
    return [...base,
      `${listening ? "듣기" : "읽기"} 이해 문제를 1개 만들어라. 목표 표현을 포함한 2~5줄짜리 새 대화(A, B)를 dialogue에 쓰고, 각 줄에 한국어 번역 ko를 넣는다.`,
      "promptEn 자리에 대화 내용을 묻는 질문을 한국어로 쓰고, choices에 보기 4개(짧게), answerKey에 보기 중 정답 하나를 그대로 넣는다.",
      `instructionKo는 "${listening ? "대화를 듣고 질문에 답하세요." : "대화를 읽고 질문에 답하세요."}"로 한다.`,
    ].join("\n");
  }
  return [...base,
    `${step === "build" ? "배운 표현을 새로운 상황에 응용하는" : "목표 표현을 연습하는"} 한→영 작문 문제를 1개 만들어라. 난이도 ${ctx.learner.difficulty}/5에 맞춘다.`,
    "promptKo에 한국어 문장 하나, answerKey에 자연스러운 영어 정답, acceptable에 정답으로 인정할 다른 표현 1~3개, hint에 한국어 힌트를 넣는다. dialogue와 choices는 비운다.",
  ].join("\n");
}

export const geminiProvider: AIProvider = {
  name: "gemini",

  generateItem(ctx) {
    return withFallback(
      "문제 생성",
      async () => {
        const g = await callJson(tutorSystem(ctx.learner), genPrompt(ctx), GenItemJson, GenItemZ);
        const isMcq = ctx.type === "mcq" && !ctx.reinforceTag;
        if (isMcq && (!g.choices || g.choices.length < 2 || !g.choices.includes(g.answerKey) || !g.dialogue?.length)) {
          throw new Error("객관식 문제 형식이 올바르지 않습니다");
        }
        if (!isMcq && !g.promptKo) throw new Error("작문 문제에 한국어 문장이 없습니다");
        const item: Item = {
          id: uid(),
          step: ctx.step,
          type: isMcq ? "mcq" : "build",
          skill: isMcq ? ctx.skill : "writing",
          instructionKo: g.instructionKo,
          promptKo: g.promptKo,
          promptEn: g.promptEn,
          dialogue: isMcq ? g.dialogue : undefined,
          showDialogue: isMcq ? ctx.skill !== "listening" : undefined,
          audioText: isMcq ? g.dialogue!.map((l) => l.en).join(" ") : undefined,
          choices: isMcq ? g.choices : undefined,
          answerKey: g.answerKey,
          acceptable: g.acceptable,
          hint: g.hint,
          reinforce: !!ctx.reinforceTag,
          focusTag: ctx.reinforceTag,
        };
        return item;
      },
      () => offlineProvider.generateItem(ctx),
    );
  },

  evaluate(item, answer, learner) {
    return withFallback<Evaluation>(
      "채점",
      () =>
        callJson(
          tutorSystem(learner),
          [
            `문제 유형: ${item.type === "shadowing" ? "듣고 따라 말하기(음성 인식 결과라 대소문자·구두점은 무시)" : "한→영 작문"}`,
            item.promptKo ? `한국어 문장: ${item.promptKo}` : "",
            `모범 답안: ${item.answerKey}${item.acceptable?.length ? ` (그 밖에 인정: ${item.acceptable.join(" / ")})` : ""}`,
            `학습자 답: ${answer}`,
            "모범 답안과 똑같지 않아도 의미가 맞고 문법이 맞으면 정답(isCorrect=true)으로 처리한다.",
            "틀렸다면 corrected에는 학습자 답을 최소한으로 고친 문장을 쓰고, explanationKo에 왜 틀렸는지 초급자 눈높이로 설명한다.",
          ].filter(Boolean).join("\n"),
          EvalJson,
          EvalZ,
        ) as Promise<Evaluation>,
      () => offlineProvider.evaluate(item, answer, learner),
    );
  },

  summarize(ctx: SummaryContext) {
    return withFallback(
      "수업 정리",
      () =>
        callJson(
          tutorSystem(ctx.learner),
          [
            `오늘 단원: ${ctx.unit.title}. 정답 ${ctx.correct}개, 오답 ${ctx.wrong}개.`,
            "오늘 응답 기록:",
            ...ctx.attempts.slice(-20).map((a) => `- [${a.correct ? "O" : "X"}] ${a.prompt} → ${a.answer}${a.tags.length ? ` (${a.tags.join(",")})` : ""}`),
            "오늘 수업을 정리해라. keyPhrases는 오늘 배운 핵심 표현 3~5개. memory에는 기존 선생님 메모를 갱신해 학습자의 강점·약점·관심사를 5문장 이내로 적는다.",
          ].join("\n"),
          SummaryJson,
          SummaryZ,
        ),
      () => offlineProvider.summarize(ctx),
    );
  },

  talk(ctx: TalkContext) {
    return withFallback(
      "회화",
      () =>
        callJson(
          [
            tutorSystem(ctx.learner),
            `지금은 역할극이다. 너는 ${ctx.scenario.roleAi}, 학습자는 ${ctx.scenario.roleLearner}. 상황: ${ctx.scenario.title}.`,
            "대사는 1~2문장으로 짧게, 학습자 수준에 맞는 쉬운 영어로 한다. 대화가 5~6번 오가면 자연스럽게 마무리한다.",
          ].join("\n"),
          [
            "지금까지 대화:",
            ...ctx.history.map((h) => `${h.role === "ai" ? "You" : "Learner"}: ${h.text}`),
            `Learner: ${ctx.said}`,
            "학습자의 마지막 발화에 피드백(문법 오류가 있으면 grammar, 더 자연스러운 표현이 있으면 expression, 잘했으면 good)을 주고, 이어지는 대사를 써라.",
          ].join("\n"),
          TalkJson,
          TalkZ,
        ),
      () => offlineProvider.talk(ctx),
    );
  },

  talkReport(ctx) {
    return withFallback(
      "회화 리포트",
      () =>
        callJson(
          tutorSystem(ctx.learner),
          [
            `상황: ${ctx.scenario.title}`,
            ...ctx.history.map((h) => `${h.role === "ai" ? "AI" : "Learner"}: ${h.text}`),
            "학습자의 발화를 돌아보고 총평, 잘 쓴 표현, 고치면 좋을 표현 최대 3개를 정리해라.",
          ].join("\n"),
          ReportJson,
          ReportZ,
        ),
      () => offlineProvider.talkReport(ctx),
    );
  },
};
