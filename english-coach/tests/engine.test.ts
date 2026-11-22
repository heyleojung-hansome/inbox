import { describe, expect, it } from "vitest";
import { schedule, intervalLabel } from "@/lib/engine/srs";
import { adjustDifficulty, adjustKoreanRatio, updateSkill } from "@/lib/engine/adapt";
import { normalize, similarity, wordDiff } from "@/lib/text";
import { scoreDiagnostic, DIAGNOSTIC } from "@/lib/diagnostic";
import { offlineProvider } from "@/lib/ai/offline";
import { streakFrom } from "@/lib/stats";
import { UNITS } from "@/lib/curriculum";
import type { Item, Learner } from "@/lib/types";

const fresh = { ease: 2.5, intervalDays: 0, reps: 0, lapses: 0 };

describe("간격 반복", () => {
  it("첫 복습은 좋음 1일, 쉬움 3일", () => {
    expect(schedule(fresh, 2).intervalDays).toBe(1);
    expect(schedule(fresh, 3).intervalDays).toBe(3);
  });
  it("두 번째 '좋음'은 3일, 그다음은 ease 배수로 늘어남", () => {
    const a = schedule(fresh, 2);
    const b = schedule(a, 2);
    expect(b.intervalDays).toBe(3);
    const c = schedule(b, 2);
    expect(c.intervalDays).toBe(Math.round(3 * 2.5));
  });
  it("'다시'는 1분 후 다시 나오고 실패 횟수가 늘어남", () => {
    const s = schedule({ ...fresh, reps: 3, intervalDays: 10 }, 0);
    expect(s.dueInMinutes).toBe(1);
    expect(s.lapses).toBe(1);
    expect(s.reps).toBe(0);
    expect(s.ease).toBeCloseTo(2.3);
  });
  it("ease는 1.3~2.8 범위를 벗어나지 않음", () => {
    let s = { ...fresh, ease: 1.35 };
    for (let i = 0; i < 5; i++) s = schedule(s, 0);
    expect(s.ease).toBe(1.3);
    let t = { ...fresh, ease: 2.75 };
    for (let i = 0; i < 5; i++) t = schedule(t, 3);
    expect(t.ease).toBe(2.8);
  });
  it("간격 표시", () => {
    expect(intervalLabel(1)).toBe("1분 후");
    expect(intervalLabel(3 * 1440)).toBe("3일 후");
  });
});

describe("난이도와 언어 비율", () => {
  it("최근 10문제 정답률 85% 이상이면 난이도 +1", () => {
    expect(adjustDifficulty(2, Array(10).fill(true))).toBe(3);
  });
  it("50% 미만이면 -1, 최소 1", () => {
    expect(adjustDifficulty(2, [true, false, false, false, false, false])).toBe(1);
    expect(adjustDifficulty(1, Array(10).fill(false))).toBe(1);
  });
  it("기록이 5개 미만이면 그대로", () => {
    expect(adjustDifficulty(3, [true, true])).toBe(3);
  });
  it("영역 점수는 지수이동평균", () => {
    const s = updateSkill({ listening: 50, speaking: 50, reading: 50, writing: 50 }, "speaking", 100);
    expect(s.speaking).toBeCloseTo(57.5);
    expect(s.listening).toBe(50);
  });
  it("주간 정답률 80% 이상이면 한국어 비율 5%p 감소, 최소 30%", () => {
    expect(adjustKoreanRatio(0.8, 0.9)).toBe(0.75);
    expect(adjustKoreanRatio(0.3, 0.95)).toBe(0.3);
    expect(adjustKoreanRatio(0.8, null)).toBe(0.8);
  });
});

describe("문장 비교", () => {
  it("축약형과 구두점을 무시하고 비교", () => {
    expect(normalize("I'm from Seoul!")).toBe(normalize("I am from seoul"));
    expect(normalize("That's all, thanks.")).toBe("that is all thanks");
  });
  it("빠진 관사를 diff로 찾음", () => {
    const ops = wordDiff("Can I get iced americano, please?", "Can I get an iced americano, please?");
    expect(ops.filter((o) => o.op === "ins").map((o) => o.text)).toEqual(["an"]);
    expect(ops.filter((o) => o.op === "del")).toHaveLength(0);
  });
  it("유사도", () => {
    expect(similarity("I went to the gym", "I went to the gym.")).toBe(1);
    expect(similarity("I goed to the gym", "I went to the gym")).toBeCloseTo(0.8);
  });
});

describe("수준 진단", () => {
  it("전부 맞히면 B1, 전부 틀리면 PRE_A1", () => {
    const all = Object.fromEntries(DIAGNOSTIC.map((d) => [d.id, d.answer]));
    expect(scoreDiagnostic(all).level).toBe("B1");
    expect(scoreDiagnostic({}).level).toBe("PRE_A1");
  });
  it("쉬운 문제만 맞히면 A1 근처", () => {
    const easy = Object.fromEntries(DIAGNOSTIC.filter((d) => d.level <= 2).map((d) => [d.id, d.answer]));
    expect(["A1", "A2"]).toContain(scoreDiagnostic(easy).level);
  });
});

describe("커리큘럼 데이터", () => {
  it("모든 객관식 정답이 보기에 들어 있음", () => {
    for (const u of UNITS) for (const q of u.questions) expect(q.choices).toContain(q.answer);
  });
  it("진단 정답도 보기에 들어 있음", () => {
    for (const d of DIAGNOSTIC) expect(d.choices).toContain(d.answer);
  });
});

describe("예비 모드 채점", () => {
  const learner = {} as Learner;
  const item: Item = {
    id: "x", step: "build", type: "build", skill: "writing", instructionKo: "", promptKo: "아이스 아메리카노 한 잔 주시겠어요?",
    answerKey: "Can I get an iced americano, please?",
  };
  it("정답은 맞음", async () => {
    const ev = await offlineProvider.evaluate(item, "can i get an iced americano please", learner);
    expect(ev.isCorrect).toBe(true);
  });
  it("관사가 빠지면 article 태그", async () => {
    const ev = await offlineProvider.evaluate(item, "Can I get iced americano, please?", learner);
    expect(ev.isCorrect).toBe(false);
    expect(ev.errorTags).toContain("article");
    expect(ev.corrected).toBe(item.answerKey);
  });
  it("완전히 다른 문장에는 문법 태그를 붙이지 않음", async () => {
    const ev = await offlineProvider.evaluate({ ...item, answerKey: "Hi, I'm Jieun." }, "I am from Seoul.", learner);
    expect(ev.errorTags).toEqual(["vocabulary"]);
  });
  it("불규칙 과거형 실수는 tense 태그", async () => {
    const ev = await offlineProvider.evaluate({ ...item, answerKey: "I went to the gym." }, "I goed to the gym.", learner);
    expect(ev.errorTags).toContain("tense");
  });
  it("따라 말하기는 80% 이상 비슷하면 정답", async () => {
    const ev = await offlineProvider.evaluate({ ...item, type: "shadowing", answerKey: "Can I get a latte please" }, "can I get a lot a please", learner);
    expect(ev.isCorrect).toBe(false);
    const ok = await offlineProvider.evaluate({ ...item, type: "shadowing", answerKey: "Nice to meet you too" }, "nice to meet you to", learner);
    expect(ok.isCorrect).toBe(true);
  });
});

describe("연속 학습일", () => {
  it("오늘 안 했으면 어제부터 셈", () => {
    const done = new Set(["2026-11-20", "2026-11-21"]);
    expect(streakFrom(done, "2026-11-22")).toBe(2);
    done.add("2026-11-22");
    expect(streakFrom(done, "2026-11-22")).toBe(3);
    expect(streakFrom(new Set(["2026-11-19"]), "2026-11-22")).toBe(0);
  });
});
