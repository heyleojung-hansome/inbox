import Link from "next/link";
import { statsData } from "@/lib/stats";

export const dynamic = "force-dynamic";

const SKILLS = [
  { key: "listening", label: "듣기", color: "var(--listen)" },
  { key: "speaking", label: "말하기", color: "var(--speak)" },
  { key: "reading", label: "읽기", color: "var(--read)" },
  { key: "writing", label: "쓰기", color: "var(--write)" },
] as const;

function TrendChart({ trend }: { trend: Record<string, number | null | string>[] }) {
  const W = 440, H = 220, L = 36, R = 430, T = 20, B = 190;
  const x = (i: number) => L + 20 + (i * (R - L - 30)) / (trend.length - 1);
  const y = (v: number) => B - (v / 100) * (B - T);
  const has = trend.some((p) => SKILLS.some((s) => p[s.key] !== null));
  return (
    <div className="chart-box">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="최근 6주 영역별 평균 점수">
        <g stroke="var(--line)" strokeWidth="1">
          {[0, 25, 50, 75, 100].map((v) => <line key={v} x1={L} y1={y(v)} x2={R} y2={y(v)} />)}
        </g>
        <g fill="var(--ink-3)" fontSize="11" textAnchor="end">
          {[0, 25, 50, 75, 100].map((v) => <text key={v} x={L - 8} y={y(v) + 4}>{v}</text>)}
        </g>
        <g fill="var(--ink-3)" fontSize="11" textAnchor="middle">
          {trend.map((p, i) => <text key={i} x={x(i)} y={H - 6}>{String(p.label)}</text>)}
        </g>
        {SKILLS.map((s) => {
          const pts = trend.map((p, i) => (p[s.key] === null ? null : [x(i), y(Number(p[s.key]))] as const));
          const segs: string[] = [];
          let cur: string[] = [];
          pts.forEach((pt) => {
            if (pt) cur.push(`${pt[0]},${pt[1]}`);
            else if (cur.length) { segs.push(cur.join(" ")); cur = []; }
          });
          if (cur.length) segs.push(cur.join(" "));
          return (
            <g key={s.key}>
              {segs.map((seg, i) => <polyline key={i} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" points={seg} />)}
              {pts.map((pt, i) => pt && <circle key={i} cx={pt[0]} cy={pt[1]} r={i === pts.length - 1 ? 4.5 : 3} fill={s.color} stroke="var(--surface)" strokeWidth="2" />)}
            </g>
          );
        })}
        {!has && <text x={(L + R) / 2} y={(T + B) / 2} textAnchor="middle" fill="var(--ink-2)" fontSize="13">수업을 하면 주별 점수가 여기에 그려져요</text>}
      </svg>
    </div>
  );
}

function delta(v: number | null, unit: string) {
  if (v === null) return <div className="d muted">비교할 이전 기록이 없어요</div>;
  if (v === 0) return <div className="d muted">이전과 같아요</div>;
  return <div className={`d ${v > 0 ? "up" : ""}`} style={v < 0 ? { color: "var(--red)" } : undefined}>{v > 0 ? "▲" : "▼"} 이전보다 {Math.abs(v)}{unit}</div>;
}

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range: r } = await searchParams;
  const range = r === "month" ? "month" : "week";
  const d = await statsData(range);
  const h = Math.floor(d.minutes / 60);
  const level = (m: number) => (m >= 30 ? "l3" : m >= 15 ? "l2" : m > 0 ? "l1" : "");

  return (
    <div className="page">
      <div className="page-head">
        <div><div className="eyebrow">학습 통계</div><h1>성장 리포트</h1></div>
        <div className="seg">
          <Link href="/stats" aria-pressed={range === "week"} className="card-link" style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, ...(range === "week" ? { background: "var(--surface)", boxShadow: "var(--shadow)" } : { color: "var(--ink-2)" }) }}>최근 7일</Link>
          <Link href="/stats?range=month" aria-pressed={range === "month"} className="card-link" style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, ...(range === "month" ? { background: "var(--surface)", boxShadow: "var(--shadow)" } : { color: "var(--ink-2)" }) }}>최근 30일</Link>
        </div>
      </div>

      <div className="kpis">
        <div className="card kpi">
          <div className="small muted">수업 달성률</div>
          <div className="v num">{d.completion}%</div>
          <div className="d muted">{d.doneDays}일 수업 완료</div>
        </div>
        <div className="card kpi">
          <div className="small muted">학습 시간</div>
          <div className="v num">{h ? `${h}시간 ` : ""}{d.minutes % 60}분</div>
          <div className="d muted">하루 평균 {d.avgMinutes}분</div>
        </div>
        <div className="card kpi">
          <div className="small muted">평균 정답률</div>
          <div className="v num">{d.accuracy === null ? "–" : `${d.accuracy}%`}</div>
          {delta(d.accuracyDelta, "%p")}
        </div>
        <div className="card kpi">
          <div className="small muted">새로 저장한 표현</div>
          <div className="v num">{d.newCards}개</div>
          <div className="d muted">그중 복습한 표현 {d.reviewedCards}개</div>
        </div>
      </div>

      <div className="grid g-2">
        <div className="card">
          <div className="card-head">
            <h3>영역별 점수 추이</h3>
            <div className="legend">{SKILLS.map((s) => <span key={s.key}><i style={{ background: s.color }} />{s.label} {Math.round(d.skills[s.key])}</span>)}</div>
          </div>
          <TrendChart trend={d.trend} />
        </div>
        <div className="card">
          <div className="card-head"><h3>{d.calendar.month}월 학습 캘린더</h3><span className="small muted">{d.calendar.studied}일 학습</span></div>
          <div className="heat" aria-label={`${d.calendar.month}월 일별 학습량`}>
            {["월", "화", "수", "목", "금", "토", "일"].map((w) => <span key={w} style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "center" }}>{w}</span>)}
            {Array.from({ length: d.calendar.firstDow }, (_, i) => <i key={`b${i}`} style={{ visibility: "hidden" }} />)}
            {d.calendar.days.map((c) => (
              <i key={c.day} className={level(c.minutes)} title={`${d.calendar.month}월 ${c.day}일 · ${c.minutes}분`} style={c.future ? { opacity: 0.35 } : undefined} />
            ))}
          </div>
          <div className="heat-legend">적음 <i style={{ background: "var(--surface-2)" }} /><i className="l1" /><i className="l2" /><i className="l3" /> 30분 이상</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>취약 영역과 개선 추이</h3><span className="small muted">최근 28일, 전체 응답 중 해당 실수 비율</span></div>
        {d.weak.length === 0 && <p className="small muted">아직 반복된 실수가 없어요. 수업을 하면 자주 틀리는 유형이 여기에 정리돼요.</p>}
        {d.weak.map((w) => (
          <div key={w.tag} className="weak-row">
            <span>{w.label}</span>
            <div className="bar"><span style={{ width: `${Math.min(100, w.rate * 2)}%`, background: w.rate >= 20 ? "var(--red)" : w.rate >= 10 ? "var(--amber)" : "var(--green)" }} /></div>
            <span className={`num ${w.delta !== null && w.delta < 0 ? "up" : ""}`} style={w.delta === null || w.delta >= 0 ? { color: w.rate >= 20 ? "var(--red)" : "var(--ink-2)" } : undefined}>
              {w.delta !== null && w.delta < 0 ? `▼ ${Math.abs(w.delta)}%p` : `${w.rate}%`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
