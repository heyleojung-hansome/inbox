import { unitAt, STAGE_NAME, UNITS } from "./curriculum";
import { all, one } from "./db";
import { addDays, koreanDateLabel, localDate, localHour, weekDates } from "./dates";
import { todayLessonBrief } from "./engine/lesson";
import { cardCounts, requireLearner } from "./repo";
import { ERROR_TAGS, type ErrorTag, type Skill } from "./types";

async function completedDates(): Promise<Set<string>> {
  const rows = await all<{ date: string }>("SELECT DISTINCT date FROM lessons WHERE status = 'completed'");
  return new Set(rows.map((r) => r.date));
}

async function activityMap(from: string, to: string): Promise<Map<string, number>> {
  const rows = await all<{ date: string; secs: number }>("SELECT date, secs FROM activity WHERE date BETWEEN ? AND ?", [from, to]);
  return new Map(rows.map((r) => [r.date, Number(r.secs)]));
}

export function streakFrom(done: Set<string>, today: string): number {
  let d = done.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (done.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

async function tagStats(fromIso: string, toIso: string): Promise<Map<ErrorTag, { wrong: number }> & { total?: number }> {
  const rows = await all<{ tags: string; correct: number }>(
    "SELECT tags, correct FROM attempts WHERE created_at >= ? AND created_at < ?", [fromIso, toIso],
  );
  const map = new Map<ErrorTag, { wrong: number }>() as Map<ErrorTag, { wrong: number }> & { total?: number };
  map.total = rows.length;
  rows.forEach((r) => {
    if (r.correct) return;
    (JSON.parse(r.tags) as ErrorTag[]).forEach((t) => {
      const v = map.get(t) ?? { wrong: 0 };
      v.wrong++;
      map.set(t, v);
    });
  });
  return map;
}

export async function homeData() {
  const learner = await requireLearner();
  const today = localDate();
  const done = await completedDates();
  const week = weekDates(today);
  const act = await activityMap(week[0], week[6]);
  const totalSecs = Number((await one<{ s: number }>("SELECT COALESCE(SUM(secs), 0) AS s FROM activity"))!.s);
  const cards = await cardCounts();
  const brief = await todayLessonBrief();
  const unit = unitAt(brief?.unitIndex ?? learner.unitIndex);

  const now = Date.now();
  const recent = await tagStats(new Date(now - 7 * 86400000).toISOString(), new Date(now + 1000).toISOString());
  const prev = await tagStats(new Date(now - 14 * 86400000).toISOString(), new Date(now - 7 * 86400000).toISOString());
  const weak = [...recent.entries()]
    .sort((a, b) => b[1].wrong - a[1].wrong)
    .slice(0, 3)
    .map(([tag, v]) => ({ tag, label: ERROR_TAGS[tag], wrong: v.wrong, improving: (prev.get(tag)?.wrong ?? 0) > v.wrong }));

  const last = await one<{ summary: string }>("SELECT summary FROM lessons WHERE status = 'completed' ORDER BY id DESC LIMIT 1");
  const lastSummary = last ? JSON.parse(last.summary) : null;
  const h = localHour();
  const greeting = h < 5 ? "늦은 밤이에요" : h < 12 ? "좋은 아침이에요" : h < 18 ? "좋은 오후예요" : "좋은 저녁이에요";

  return {
    name: learner.name,
    greeting,
    dateLabel: koreanDateLabel(today),
    level: learner.level,
    stageLabel: `${STAGE_NAME[unit.stage]} 단계 ${Math.min(learner.unitIndex + 1, UNITS.length)}/${UNITS.length}`,
    unit: { title: unit.title, keySentence: unit.keySentence, phrases: unit.phrases.length },
    lesson: brief,
    dailyMinutes: learner.dailyMinutes,
    streak: streakFrom(done, today),
    weekDone: week.filter((d) => done.has(d)).length,
    week: week.map((d) => ({ date: d, state: done.has(d) ? "full" : (act.get(d) ?? 0) > 0 ? "part" : "none", today: d === today })),
    totalHours: Math.round((totalSecs / 3600) * 10) / 10,
    due: cards.due,
    skills: learner.skills,
    weak,
    coachNote: lastSummary?.nextFocus
      ? `${lastSummary.summaryKo} ${lastSummary.nextFocus}`
      : "첫 수업이에요. 부담 없이 시작해 봐요. 틀려도 괜찮아요, 제가 이유를 쉽게 설명해 드릴게요.",
  };
}

export async function statsData(range: "week" | "month") {
  const learner = await requireLearner();
  const today = localDate();
  const span = range === "week" ? 7 : 30;
  const from = addDays(today, -(span - 1));
  const prevFrom = addDays(from, -span);
  const created = learner.createdAt.slice(0, 10);
  const effectiveDays = Math.max(1, Math.min(span, Math.round((Date.parse(today) - Date.parse(localDate(new Date(learner.createdAt)))) / 86400000) + 1));

  const done = await completedDates();
  const doneInRange = [...done].filter((d) => d >= from && d <= today).length;
  const doneInPrev = [...done].filter((d) => d >= prevFrom && d < from).length;

  const act = await activityMap(from, today);
  const secs = [...act.values()].reduce((a, b) => a + b, 0);

  const acc = async (a: string, b: string) => {
    const r = await one<{ c: number; n: number }>("SELECT SUM(correct) AS c, COUNT(*) AS n FROM attempts WHERE date >= ? AND date <= ?", [a, b]);
    const n = Number(r?.n ?? 0);
    return n ? Number(r!.c) / n : null;
  };
  const accNow = await acc(from, today);
  const accPrev = await acc(prevFrom, addDays(from, -1));

  const newCards = await one<{ n: number; r: number }>(
    "SELECT COUNT(*) AS n, SUM(CASE WHEN reps > 0 THEN 1 ELSE 0 END) AS r FROM cards WHERE created_at >= ?",
    [new Date(Date.now() - span * 86400000).toISOString()],
  );

  // 최근 6주 영역별 평균 점수
  const weeks = Array.from({ length: 6 }, (_, i) => addDays(today, -7 * (5 - i) - 6));
  const trendRows = await all<{ date: string; skill: Skill; score: number }>(
    "SELECT date, skill, score FROM attempts WHERE date >= ?", [weeks[0]],
  );
  const skills: Skill[] = ["listening", "speaking", "reading", "writing"];
  const trend = weeks.map((start) => {
    const end = addDays(start, 6);
    const point: Record<string, number | null | string> = { label: `${Number(start.slice(5, 7))}/${Number(start.slice(8))}` };
    skills.forEach((s) => {
      const rows = trendRows.filter((r) => r.skill === s && r.date >= start && r.date <= end);
      point[s] = rows.length ? Math.round(rows.reduce((a, r) => a + Number(r.score), 0) / rows.length) : null;
    });
    return point;
  });

  // 이번 달 캘린더
  const monthStart = today.slice(0, 8) + "01";
  const monthAct = await activityMap(monthStart, today);
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstDow = (new Date(monthStart + "T00:00:00Z").getUTCDay() + 6) % 7;
  const calendar = Array.from({ length: daysInMonth }, (_, i) => {
    const d = addDays(monthStart, i);
    const mins = Math.round((monthAct.get(d) ?? 0) / 60);
    return { day: i + 1, minutes: mins, done: done.has(d), future: d > today };
  });

  // 취약 영역: 최근 28일 vs 그 전 28일 오답 비율
  const now = Date.now();
  const cur = await tagStats(new Date(now - 28 * 86400000).toISOString(), new Date(now + 1000).toISOString());
  const old = await tagStats(new Date(now - 56 * 86400000).toISOString(), new Date(now - 28 * 86400000).toISOString());
  const rate = (m: typeof cur, t: ErrorTag) => (m.total ? (m.get(t)?.wrong ?? 0) / m.total : 0);
  const weak = [...cur.keys()]
    .map((t) => ({ tag: t, label: ERROR_TAGS[t], rate: Math.round(rate(cur, t) * 100), delta: old.total ? Math.round((rate(cur, t) - rate(old, t)) * 100) : null }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5);

  return {
    range,
    completion: Math.round((doneInRange / Math.min(span, effectiveDays)) * 100),
    completionDelta: range === "week" ? doneInRange - doneInPrev : null,
    doneDays: doneInRange,
    minutes: Math.round(secs / 60),
    avgMinutes: Math.round(secs / 60 / Math.min(span, effectiveDays)),
    accuracy: accNow === null ? null : Math.round(accNow * 100),
    accuracyDelta: accNow !== null && accPrev !== null ? Math.round((accNow - accPrev) * 100) : null,
    newCards: Number(newCards?.n ?? 0),
    reviewedCards: Number(newCards?.r ?? 0),
    trend,
    skills: learner.skills,
    calendar: { year: y, month: m, firstDow, days: calendar, studied: calendar.filter((c) => c.minutes > 0 || c.done).length },
    weak,
    since: created,
  };
}
