import { getAI } from "../ai";
import { unitAt, type Unit } from "../curriculum";
import { all, one, run } from "../db";
import { addDays, localDate } from "../dates";
import {
  addActivity, addAttempt, dueCards, getCard, getLearner, HttpError, rateCard, recentCorrectness, recentTags,
  requireLearner, saveLearner, upsertCard,
} from "../repo";
import { normalize } from "../text";
import {
  STEPS, type ChatKind, type ChatMessage, type ErrorTag, type Evaluation, type Item, type Learner, type LessonState,
  type LessonSummary,
} from "../types";
import { adjustDifficulty, adjustKoreanRatio, updateSkill } from "./adapt";

const uid = () => Math.random().toString(36).slice(2, 10);
const MAX_EXTRA = 2; // 보강 문제로 단계당 늘어날 수 있는 최대 문항 수
const MAX_GAP_SECS = 180; // 이보다 오래 쉬면 학습 시간에 넣지 않음

interface LessonRow {
  id: number;
  date: string;
  unit_index: number;
  status: "in_progress" | "completed";
  state: string;
  summary: string | null;
  active_secs: number;
  started_at: string;
}

export interface LessonView {
  id: number;
  status: "in_progress" | "completed";
  date: string;
  unit: { index: number; title: string; keySentence: string; phrases: Unit["phrases"] };
  step: number;
  stepCounts: number[];
  targets: number[];
  correct: number;
  wrong: number;
  difficulty: number;
  activeSecs: number;
  current: Item | null;
  messages: ChatMessage[];
  summary: (LessonSummary & { accuracy: number; advanced: boolean }) | null;
}

/* ---------- 메시지 ---------- */

async function addMessage(lessonId: number, role: "teacher" | "learner", kind: ChatKind, payload: object): Promise<ChatMessage> {
  const id = await run(
    "INSERT INTO messages (lesson_id, role, kind, payload, created_at) VALUES (?, ?, ?, ?, ?)",
    [lessonId, role, kind, JSON.stringify(payload), new Date().toISOString()],
  );
  return { id, role, kind, payload: payload as Record<string, unknown> };
}

/** 정답이 화면에 미리 노출되지 않도록 문제에서 정답 키를 뺍니다 */
export function publicItem(item: Item | null): Item | null {
  if (!item) return null;
  const { answerKey: _a, acceptable: _b, ...rest } = item;
  return { ...rest, answerKey: "" };
}

function publicMessage(m: ChatMessage): ChatMessage {
  if (m.kind === "item") return { ...m, payload: { ...m.payload, item: publicItem(m.payload.item as Item) } };
  return m;
}

/* ---------- 수업 생성 ---------- */

async function buildReviewQueue(learner: Learner): Promise<string[]> {
  const cards = await dueCards(30);
  const ordered = [...cards.filter((c) => c.kind === "mistake"), ...cards.filter((c) => c.kind !== "mistake")];
  const queue = ordered.slice(0, 5).map((c) => `c:${c.id}`);
  if (queue.length >= 2) return queue;
  // 복습할 카드가 부족하면 이전 단원(첫 단원이면 이번 단원) 표현으로 채웁니다
  const ui = Math.max(0, learner.unitIndex - 1);
  const phrases = unitAt(ui).phrases.map((_, i) => `p:${ui}:${i}`);
  return [...queue, ...phrases].slice(0, 3);
}

export async function startToday(): Promise<LessonView> {
  const learner = await requireLearner();
  const today = localDate();
  const existing = await one<LessonRow>("SELECT * FROM lessons WHERE date = ? ORDER BY id DESC LIMIT 1", [today]);
  if (existing) return loadView(existing.id);

  const unit = unitAt(learner.unitIndex);
  const reviewQueue = await buildReviewQueue(learner);
  const targets = STEPS.map((s) => (s.id === "review" ? reviewQueue.length : s.target));
  const state: LessonState = {
    step: 0, stepCounts: STEPS.map(() => 0), targets, current: null, reviewQueue, tagCounts: {}, correct: 0, wrong: 0,
    usedPhrases: [], lastActivity: Date.now(),
  };
  const lessonId = await run(
    "INSERT INTO lessons (date, unit_index, status, state, started_at) VALUES (?, ?, 'in_progress', ?, ?)",
    [today, learner.unitIndex, JSON.stringify(state), new Date().toISOString()],
  );
  const opener = learner.memory
    ? `${learner.name}님, 다시 만나서 반가워요! 지난번 기록을 보고 오늘 수업을 준비했어요.`
    : `${learner.name}님, 반가워요! 오늘부터 하루 30분씩 함께 공부해요.`;
  await addMessage(lessonId, "teacher", "text", {
    text: `${opener} 오늘 배울 내용은 '${unit.title}'이에요. 핵심 문장은 "${unit.keySentence}"예요.`,
  });
  await enterStep(lessonId, state, learner, unit);
  await saveState(lessonId, state);
  return loadView(lessonId);
}

/* ---------- 단계 진행 ---------- */

const STEP_INTRO: Record<string, (u: Unit) => string> = {
  review: () => "먼저 지난번에 배운 표현을 가볍게 복습할게요. 영어로 말하거나 써보세요.",
  listen_read: (u) => `이제 '${u.title}' 상황의 짧은 대화를 듣고 읽어볼게요.`,
  speak: () => "이번엔 직접 말해볼 차례예요. 마이크 버튼을 누르고 말하거나, 글자로 써도 괜찮아요.",
  build: () => "배운 표현을 새로운 상황에 응용해서 문장을 만들어봐요.",
  wrap: () => "수고했어요! 오늘 배운 내용을 정리할게요.",
};

async function enterStep(lessonId: number, state: LessonState, learner: Learner, unit: Unit) {
  const step = STEPS[state.step];
  await addMessage(lessonId, "teacher", "step", { step: state.step, name: step.name, minutes: step.minutes, text: STEP_INTRO[step.id](unit) });
  if (step.id === "wrap") return;
  await nextItem(lessonId, state, learner, unit);
}

async function nextItem(lessonId: number, state: LessonState, learner: Learner, unit: Unit) {
  const step = STEPS[state.step];
  const k = state.stepCounts[state.step];
  const ai = getAI();
  let item: Item;
  const avoid = await all<{ prompt: string }>("SELECT prompt FROM attempts WHERE lesson_id = ?", [lessonId]);
  const tags = await recentTags();

  if (state.reinforceTag) {
    item = await ai.generateItem({
      learner, unit, step: step.id, type: "build", skill: "writing", index: k, reinforceTag: state.reinforceTag,
      recentTags: tags, avoid: avoid.map((a) => a.prompt),
    });
    item.reinforce = true;
    state.reinforceTag = undefined;
  } else if (step.id === "review") {
    item = await reviewItem(state.reviewQueue[k] ?? state.reviewQueue[0]);
  } else if (step.id === "listen_read") {
    item = await ai.generateItem({
      learner, unit, step: step.id, type: "mcq", skill: k % 2 === 0 ? "listening" : "reading", index: k,
      recentTags: tags, avoid: avoid.map((a) => a.prompt),
    });
  } else if (step.id === "speak") {
    const p = unit.phrases[Math.floor(k / 2) % unit.phrases.length];
    item = k % 2 === 0
      ? {
          id: uid(), step: step.id, type: "shadowing", skill: "speaking",
          instructionKo: "듣고 따라 말해보세요. 마이크 버튼을 누르고 말하면 돼요.",
          promptEn: p.en, promptKo: p.ko, audioText: p.en, answerKey: p.en,
        }
      : {
          id: uid(), step: step.id, type: "translate", skill: "speaking",
          instructionKo: "이 문장을 영어로 말해보세요.", promptKo: p.ko, answerKey: p.en,
          hint: `방금 따라 한 문장을 떠올려 보세요: ${p.en.split(" ").slice(0, 2).join(" ")} ...`,
        };
  } else {
    item = await ai.generateItem({
      learner, unit, step: step.id, type: "build", skill: "writing", index: k,
      recentTags: tags, avoid: avoid.map((a) => a.prompt),
    });
  }
  state.current = item;
  await addMessage(lessonId, "teacher", "item", { item, number: k + 1, total: state.targets[state.step] });
}

async function reviewItem(ref: string): Promise<Item> {
  if (ref?.startsWith("c:")) {
    const card = await getCard(Number(ref.slice(2)));
    if (card) {
      return {
        id: uid(), step: "review", type: "translate", skill: "writing", cardId: String(card.id),
        instructionKo: card.kind === "word" ? "이 뜻의 영어 단어를 써보세요." : card.kind === "mistake" ? "지난번에 틀렸던 문장이에요. 영어로 말하거나 써보세요." : "영어로 말하거나 써보세요.",
        promptKo: card.front, answerKey: card.back, hint: card.note ?? undefined,
      };
    }
  }
  const [, ui, pi] = (ref ?? "p:0:0").split(":").map(Number);
  const p = unitAt(ui).phrases[pi] ?? unitAt(0).phrases[0];
  return {
    id: uid(), step: "review", type: "translate", skill: "writing",
    instructionKo: "지난 단원 표현이에요. 영어로 말하거나 써보세요.", promptKo: p.ko, answerKey: p.en,
  };
}

/* ---------- 답변 처리 ---------- */

async function evaluate(item: Item, answer: string, skipped: boolean, learner: Learner): Promise<Evaluation> {
  if (skipped) {
    return {
      isCorrect: false, score: 0, corrected: item.answerKey, errorTags: item.focusTag ? [item.focusTag] : [],
      explanationKo: `정답은 "${item.answerKey}"예요. 복습 카드에 넣어둘게요. 다음에 다시 나올 거예요.`,
      encouragement: "모르는 건 괜찮아요. 오늘 하나 배웠어요!",
    };
  }
  if (item.type === "mcq") {
    const ok = normalize(answer) === normalize(item.answerKey) || answer === item.answerKey;
    return {
      isCorrect: ok, score: ok ? 100 : 0, corrected: item.answerKey, errorTags: ok ? [] : ["comprehension"],
      explanationKo: ok ? "정확해요!" : `정답은 "${item.answerKey}"예요. 대화를 한 번 더 확인해 보세요.`,
      encouragement: ok ? "잘 들었어요!" : "다음 문제에서 만회해요!",
    };
  }
  const keys = [item.answerKey, ...(item.acceptable ?? [])];
  if (keys.some((k) => normalize(k) === normalize(answer))) {
    return { isCorrect: true, score: 100, corrected: answer, errorTags: [], explanationKo: "완벽해요!", encouragement: "아주 좋아요!" };
  }
  return getAI().evaluate(item, answer, learner);
}

export async function submitAnswer(lessonId: number, answer: string, skipped = false): Promise<{ view: LessonView; added: ChatMessage[] }> {
  const row = await one<LessonRow>("SELECT * FROM lessons WHERE id = ?", [lessonId]);
  if (!row) throw new HttpError(404, "수업을 찾을 수 없어요.");
  if (row.status === "completed") throw new HttpError(409, "이미 끝난 수업이에요.");
  const state = JSON.parse(row.state) as LessonState;
  const item = state.current;
  if (!item) throw new HttpError(409, "지금은 답할 문제가 없어요.");
  const text = answer.trim();
  if (!text && !skipped) throw new HttpError(400, "답을 입력해 주세요.");

  let learner = (await getLearner())!;
  const unit = unitAt(row.unit_index);
  const startMsgId = (await one<{ m: number }>("SELECT COALESCE(MAX(id), 0) AS m FROM messages WHERE lesson_id = ?", [lessonId]))!.m;

  // 학습 시간
  const gap = Math.min(MAX_GAP_SECS, Math.max(0, (Date.now() - state.lastActivity) / 1000));
  state.lastActivity = Date.now();
  await run("UPDATE lessons SET active_secs = active_secs + ? WHERE id = ?", [Math.round(gap), lessonId]);
  await addActivity(gap);

  await addMessage(lessonId, "learner", "answer", { text: skipped ? "잘 모르겠어요" : text, skipped });
  const ev = await evaluate(item, text, skipped, learner);
  await addMessage(lessonId, "teacher", "feedback", { evaluation: ev, answer: skipped ? "" : text, itemType: item.type, answerKey: item.answerKey });

  // 기록 저장
  const promptText = item.promptKo ?? item.promptEn ?? item.answerKey;
  await addAttempt({
    lessonId, step: item.step, skill: item.skill, itemType: item.type, prompt: promptText,
    answer: skipped ? "" : text, correct: ev.isCorrect, score: ev.score, tags: ev.errorTags,
  });
  if (ev.isCorrect) state.correct++;
  else state.wrong++;

  // 복습 카드 반영
  if (item.cardId) await rateCard(Number(item.cardId), ev.isCorrect ? 2 : 0);
  else if (!ev.isCorrect && item.type !== "mcq") {
    await upsertCard("mistake", item.promptKo ?? item.promptEn ?? "", ev.corrected || item.answerKey, ev.explanationKo.slice(0, 140));
  }

  // 학습자 상태 갱신
  learner = { ...learner, skills: updateSkill(learner.skills, item.skill, ev.score) };
  learner.difficulty = adjustDifficulty(learner.difficulty, await recentCorrectness(10));

  // 같은 실수 반복 → 보강 문제
  for (const t of ev.errorTags) {
    state.tagCounts[t] = (state.tagCounts[t] ?? 0) + 1;
    if ((state.tagCounts[t] ?? 0) >= 2 && !state.reinforceTag && t !== "comprehension" && t !== "pronunciation") {
      state.reinforceTag = t as ErrorTag;
      state.tagCounts[t] = 0;
    }
  }

  state.stepCounts[state.step]++;
  state.current = null;
  const count = state.stepCounts[state.step];
  const target = state.targets[state.step];
  const stepDone = (count >= target && !state.reinforceTag) || count >= target + MAX_EXTRA;
  if (stepDone) {
    state.reinforceTag = undefined;
    state.step++;
    if (STEPS[state.step].id === "wrap") {
      await enterStep(lessonId, state, learner, unit);
      learner = await finishLesson(lessonId, state, learner, unit);
    } else {
      await enterStep(lessonId, state, learner, unit);
    }
  } else {
    if (state.reinforceTag) {
      await addMessage(lessonId, "teacher", "text", { text: "같은 부분을 두 번 틀렸어요. 비슷한 문제로 한 번 더 연습해볼게요." });
    }
    await nextItem(lessonId, state, learner, unit);
  }

  await saveLearner(learner);
  await saveState(lessonId, state);
  const view = await loadView(lessonId);
  return { view, added: view.messages.filter((m) => m.id > startMsgId) };
}

async function finishLesson(lessonId: number, state: LessonState, learner: Learner, unit: Unit): Promise<Learner> {
  const attempts = await all<{ prompt: string; answer: string; correct: number; tags: string }>(
    "SELECT prompt, answer, correct, tags FROM attempts WHERE lesson_id = ? ORDER BY id", [lessonId],
  );
  const summary = await getAI().summarize({
    learner, unit, correct: state.correct, wrong: state.wrong,
    attempts: attempts.map((a) => ({ prompt: a.prompt, answer: a.answer, correct: a.correct === 1, tags: JSON.parse(a.tags) })),
  });
  const total = state.correct + state.wrong;
  const accuracy = total ? state.correct / total : 0;
  const advanced = accuracy >= 0.6;

  // 오늘 배운 표현과 단어를 복습 카드로 저장 (내일부터 복습)
  for (const p of unit.phrases) await upsertCard("sentence", p.ko, p.en, p.note);
  for (const v of unit.vocab) await upsertCard("word", v.ko, v.en);

  const next: Learner = { ...learner, memory: summary.memory };
  if (advanced) next.unitIndex = learner.unitIndex + 1;
  if (learner.autoRatio) {
    const since = addDays(localDate(), -6);
    const w = await one<{ c: number; n: number }>("SELECT SUM(correct) AS c, COUNT(*) AS n FROM attempts WHERE date >= ?", [since]);
    const n = Number(w?.n ?? 0);
    next.koreanRatio = adjustKoreanRatio(learner.koreanRatio, n >= 20 ? Number(w!.c) / n : null);
  }

  const full = { ...summary, accuracy: Math.round(accuracy * 100), advanced };
  await addMessage(lessonId, "teacher", "summary", full);
  await run("UPDATE lessons SET status = 'completed', summary = ?, ended_at = ? WHERE id = ?", [
    JSON.stringify(full), new Date().toISOString(), lessonId,
  ]);
  return next;
}

/* ---------- 조회 ---------- */

async function saveState(lessonId: number, state: LessonState) {
  await run("UPDATE lessons SET state = ? WHERE id = ?", [JSON.stringify(state), lessonId]);
}

export async function loadView(lessonId: number): Promise<LessonView> {
  const row = await one<LessonRow>("SELECT * FROM lessons WHERE id = ?", [lessonId]);
  if (!row) throw new HttpError(404, "수업을 찾을 수 없어요.");
  const state = JSON.parse(row.state) as LessonState;
  const learner = await getLearner();
  const unit = unitAt(row.unit_index);
  const msgs = await all<{ id: number; role: "teacher" | "learner"; kind: ChatKind; payload: string }>(
    "SELECT id, role, kind, payload FROM messages WHERE lesson_id = ? ORDER BY id", [lessonId],
  );
  return {
    id: row.id,
    status: row.status,
    date: row.date,
    unit: { index: row.unit_index, title: unit.title, keySentence: unit.keySentence, phrases: unit.phrases },
    step: Math.min(state.step, STEPS.length - 1),
    stepCounts: state.stepCounts,
    targets: state.targets,
    correct: state.correct,
    wrong: state.wrong,
    difficulty: learner?.difficulty ?? 2,
    activeSecs: row.active_secs,
    current: publicItem(state.current),
    messages: msgs.map((m) => publicMessage({ id: Number(m.id), role: m.role, kind: m.kind, payload: JSON.parse(m.payload) })),
    summary: row.summary ? JSON.parse(row.summary) : null,
  };
}

export async function todayLessonBrief() {
  const row = await one<LessonRow>("SELECT * FROM lessons WHERE date = ? ORDER BY id DESC LIMIT 1", [localDate()]);
  if (!row) return null;
  const s = JSON.parse(row.state) as LessonState;
  return { id: row.id, status: row.status, step: Math.min(s.step, STEPS.length - 1), stepCounts: s.stepCounts, targets: s.targets, activeSecs: row.active_secs, unitIndex: row.unit_index };
}
