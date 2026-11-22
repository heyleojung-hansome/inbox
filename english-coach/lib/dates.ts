const TZ = () => process.env.APP_TIMEZONE || "Asia/Seoul";

/** 학습자 시간대 기준 YYYY-MM-DD */
export function localDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ(), year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function addDays(date: string, n: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 월요일 시작 주의 날짜 7개 */
export function weekDates(today: string): string[] {
  const dow = (new Date(today + "T00:00:00Z").getUTCDay() + 6) % 7; // 월=0
  const monday = addDays(today, -dow);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function localHour(d: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ(), hour: "numeric", hourCycle: "h23" }).format(d));
}

export function koreanDateLabel(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${days[d.getUTCDay()]}요일`;
}
