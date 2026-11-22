/** 간격 반복 (SM-2 변형). rating: 0 다시, 1 어려움, 2 좋음, 3 쉬움 */
export interface SrsState {
  ease: number;
  intervalDays: number;
  reps: number;
  lapses: number;
}

export type Rating = 0 | 1 | 2 | 3;

const MIN_EASE = 1.3;
const MAX_EASE = 2.8;
const clampEase = (e: number) => Math.min(MAX_EASE, Math.max(MIN_EASE, Math.round(e * 100) / 100));

export function schedule(s: SrsState, rating: Rating): SrsState & { dueInMinutes: number } {
  let { ease, intervalDays, reps, lapses } = s;
  if (rating === 0) {
    return { ease: clampEase(ease - 0.2), intervalDays: 0, reps: 0, lapses: lapses + 1, dueInMinutes: 1 };
  }
  if (rating === 1) {
    ease = clampEase(ease - 0.15);
    intervalDays = Math.max(1, Math.round(intervalDays * 1.2));
  } else if (rating === 2) {
    intervalDays = reps === 0 ? 1 : reps === 1 ? 3 : Math.max(intervalDays + 1, Math.round(intervalDays * ease));
  } else {
    intervalDays = reps === 0 ? 3 : reps === 1 ? 6 : Math.max(intervalDays + 1, Math.round(intervalDays * ease * 1.3));
    ease = clampEase(ease + 0.15);
  }
  return { ease, intervalDays, reps: reps + 1, lapses, dueInMinutes: intervalDays * 24 * 60 };
}

export function intervalLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}분 후`;
  const days = Math.round(minutes / (24 * 60));
  if (days < 30) return `${days}일 후`;
  return `${Math.round(days / 30)}개월 후`;
}
