import type { Skill, Skills } from "../types";

/** 최근 정답 기록(최신순 아님, 시간순)으로 난이도 1~5 조정 */
export function adjustDifficulty(current: number, recentCorrect: boolean[]): number {
  const last = recentCorrect.slice(-10);
  if (last.length < 5) return current;
  const acc = last.filter(Boolean).length / last.length;
  if (acc >= 0.85) return Math.min(5, current + 1);
  if (acc < 0.5) return Math.max(1, current - 1);
  return current;
}

/** 영역 점수는 지수이동평균으로 천천히 움직입니다 */
export function updateSkill(skills: Skills, skill: Skill, score: number): Skills {
  const next = { ...skills };
  next[skill] = Math.round((0.85 * skills[skill] + 0.15 * score) * 10) / 10;
  return next;
}

/** 주간 정답률이 높으면 한국어 설명 비율을 조금씩 낮춥니다 */
export function adjustKoreanRatio(ratio: number, weeklyAccuracy: number | null): number {
  if (weeklyAccuracy === null) return ratio;
  if (weeklyAccuracy >= 0.8) return Math.max(0.3, Math.round((ratio - 0.05) * 100) / 100);
  if (weeklyAccuracy < 0.5) return Math.min(1, Math.round((ratio + 0.05) * 100) / 100);
  return ratio;
}
