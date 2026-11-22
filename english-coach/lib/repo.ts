import { all, one, run } from "./db";
import { localDate } from "./dates";
import type { ErrorTag, Learner, Skill, Skills } from "./types";
import { schedule, type Rating } from "./engine/srs";

/* ---------------- 학습자 ---------------- */

export async function getLearner(): Promise<Learner | null> {
  const row = await one<{ data: string }>("SELECT data FROM learner WHERE id = 1");
  return row ? (JSON.parse(row.data) as Learner) : null;
}

export async function saveLearner(l: Learner): Promise<void> {
  await run(
    "INSERT INTO learner (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data",
    [JSON.stringify(l)],
  );
}

export async function requireLearner(): Promise<Learner> {
  const l = await getLearner();
  if (!l) throw new HttpError(409, "먼저 수준 진단을 완료해 주세요.");
  return l;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/* ---------------- 학습 시간 ---------------- */

export async function addActivity(secs: number, date = localDate()): Promise<void> {
  if (secs <= 0) return;
  await run(
    "INSERT INTO activity (date, secs) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET secs = secs + excluded.secs",
    [date, Math.round(secs)],
  );
}

/* ---------------- 응답 기록 ---------------- */

export interface AttemptInput {
  lessonId: number | null;
  step: string;
  skill: Skill;
  itemType: string;
  prompt: string;
  answer: string;
  correct: boolean;
  score: number;
  tags: ErrorTag[];
}

export async function addAttempt(a: AttemptInput): Promise<void> {
  await run(
    `INSERT INTO attempts (lesson_id, date, step, skill, item_type, prompt, answer, correct, score, tags, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [a.lessonId, localDate(), a.step, a.skill, a.itemType, a.prompt, a.answer, a.correct ? 1 : 0, a.score, JSON.stringify(a.tags), new Date().toISOString()],
  );
}

export async function recentCorrectness(limit = 10): Promise<boolean[]> {
  const rows = await all<{ correct: number }>("SELECT correct FROM attempts ORDER BY id DESC LIMIT ?", [limit]);
  return rows.map((r) => r.correct === 1).reverse();
}

export async function recentTags(days = 14): Promise<ErrorTag[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const rows = await all<{ tags: string }>("SELECT tags FROM attempts WHERE correct = 0 AND created_at >= ?", [since]);
  const count = new Map<ErrorTag, number>();
  rows.forEach((r) => (JSON.parse(r.tags) as ErrorTag[]).forEach((t) => count.set(t, (count.get(t) ?? 0) + 1)));
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
}

/* ---------------- 복습 카드 ---------------- */

export interface Card {
  id: number;
  kind: "word" | "sentence" | "mistake";
  front: string;
  back: string;
  note: string | null;
  ease: number;
  interval_days: number;
  reps: number;
  lapses: number;
  due_at: string;
  created_at: string;
}

/** 같은 카드가 있으면 다시 복습 대상으로 당겨옵니다 */
export async function upsertCard(kind: Card["kind"], front: string, back: string, note?: string, dueNow = false): Promise<void> {
  const due = dueNow ? new Date().toISOString() : new Date(Date.now() + 86400000).toISOString();
  await run(
    `INSERT INTO cards (kind, front, back, note, due_at, created_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(kind, back) DO UPDATE SET front = excluded.front, note = COALESCE(excluded.note, note),
       due_at = MIN(due_at, excluded.due_at)`,
    [kind, front, back, note ?? null, due, new Date().toISOString()],
  );
}

export async function dueCards(limit = 50): Promise<Card[]> {
  return all<Card>("SELECT * FROM cards WHERE due_at <= ? ORDER BY due_at LIMIT ?", [endOfTodayIso(), limit]);
}

export async function getCard(id: number): Promise<Card | null> {
  return one<Card>("SELECT * FROM cards WHERE id = ?", [id]);
}

export async function rateCard(id: number, rating: Rating): Promise<Card | null> {
  const c = await getCard(id);
  if (!c) return null;
  const next = schedule({ ease: c.ease, intervalDays: c.interval_days, reps: c.reps, lapses: c.lapses }, rating);
  const due = new Date(Date.now() + next.dueInMinutes * 60000).toISOString();
  await run("UPDATE cards SET ease = ?, interval_days = ?, reps = ?, lapses = ?, due_at = ? WHERE id = ?", [
    next.ease, next.intervalDays, next.reps, next.lapses, due, id,
  ]);
  return getCard(id);
}

/** 오늘 안에 돌아오는 카드까지 '오늘 복습'으로 셉니다 (학습자 시간대 기준 하루 끝) */
export function endOfTodayIso(): string {
  const now = new Date();
  const today = localDate(now);
  // 하루 끝을 찾기 위해 최대 24시간을 한 시간 단위로 앞으로 이동
  let t = now.getTime();
  for (let i = 0; i < 25; i++) {
    const next = t + 3600000;
    if (localDate(new Date(next)) !== today) break;
    t = next;
  }
  for (let i = 0; i < 60; i++) {
    const next = t + 60000;
    if (localDate(new Date(next)) !== today) break;
    t = next;
  }
  return new Date(t).toISOString();
}

export async function cardCounts(): Promise<{ total: number; due: Record<Card["kind"], number> }> {
  const rows = await all<{ kind: Card["kind"]; n: number }>(
    "SELECT kind, COUNT(*) AS n FROM cards WHERE due_at <= ? GROUP BY kind",
    [endOfTodayIso()],
  );
  const total = await one<{ n: number }>("SELECT COUNT(*) AS n FROM cards");
  const due = { word: 0, sentence: 0, mistake: 0 };
  rows.forEach((r) => (due[r.kind] = Number(r.n)));
  return { total: Number(total?.n ?? 0), due };
}

export function defaultSkills(): Skills {
  return { listening: 30, speaking: 20, reading: 30, writing: 25 };
}
