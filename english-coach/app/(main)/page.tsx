import Link from "next/link";
import { Icon } from "@/components/Icon";
import { homeData } from "@/lib/stats";
import { STEPS } from "@/lib/types";

export const dynamic = "force-dynamic";

const SKILL_ROWS = [
  { key: "listening", label: "듣기", color: "var(--listen)" },
  { key: "speaking", label: "말하기", color: "var(--speak)" },
  { key: "reading", label: "읽기", color: "var(--read)" },
  { key: "writing", label: "쓰기", color: "var(--write)" },
] as const;
const DAY = ["월", "화", "수", "목", "금", "토", "일"];

export default async function Home() {
  const d = await homeData();
  const lesson = d.lesson;
  const minutes = Math.round((lesson?.activeSecs ?? 0) / 60);
  const goal = d.dailyMinutes;
  const doneSteps = lesson ? (lesson.status === "completed" ? STEPS.length : lesson.step) : 0;
  const pct = lesson?.status === "completed" ? 1 : Math.min(1, doneSteps / STEPS.length + (lesson ? 0.05 : 0));
  const C = 2 * Math.PI * 40;
  const dueTotal = d.due.word + d.due.sentence + d.due.mistake;

  let cta = { label: "오늘의 수업 시작하기", note: `약 ${goal}분 · 복습부터 정리까지 5단계로 진행해요` };
  if (lesson?.status === "in_progress") {
    const s = STEPS[lesson.step];
    cta = { label: "이어서 학습하기", note: `${s.name} ${Math.min(lesson.stepCounts[lesson.step] + 1, Math.max(1, lesson.targets[lesson.step]))}번째 문제부터 이어서 시작해요` };
  } else if (lesson?.status === "completed") {
    cta = { label: "오늘 수업 다시 보기", note: dueTotal ? `수업 완료! 복습 카드 ${dueTotal}장으로 마무리해 보세요` : "오늘 수업을 모두 마쳤어요. 내일 또 만나요!" };
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">{d.dateLabel}</div>
          <h1>{d.greeting}, {d.name}님</h1>
        </div>
        <span className="chip g">레벨 {d.level.replace("_", "-")} · {d.stageLabel}</span>
      </div>

      <div className="grid g-home">
        <div className="card today">
          <div className="today-top">
            <div>
              <div className="eyebrow">오늘의 수업</div>
              <h2>{d.unit.title}</h2>
              <p className="en">“{d.unit.keySentence}”</p>
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                <span className="chip">목표 표현 {d.unit.phrases}개</span>
                {d.due.mistake > 0 && <span className="chip a">오답 {d.due.mistake}개 복습</span>}
                {d.weak[0] && <span className="chip">{d.weak[0].label} 보강</span>}
              </div>
            </div>
            <div className="ring" aria-label={`오늘 학습 ${minutes}분`}>
              <svg width="96" height="96" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="40" fill="none" stroke="var(--surface-2)" strokeWidth="9" />
                <circle cx="48" cy="48" r="40" fill="none" stroke="var(--green)" strokeWidth="9" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
              </svg>
              <div className="ring-label"><div><b className="num">{minutes}분</b><span>/ {goal}분</span></div></div>
            </div>
          </div>
          <div className="steps">
            {STEPS.map((s, i) => {
              const state = lesson?.status === "completed" || (lesson && i < lesson.step) ? "done" : lesson && i === lesson.step ? "now" : "todo";
              return (
                <div key={s.id} className={`step ${state}`}>
                  <span className="t">{s.minutes}분</span>
                  <span className="n">{s.name}</span>
                  <span className="st">{state === "done" ? "완료 ✓" : state === "now" ? "진행 중" : "대기"}</span>
                </div>
              );
            })}
          </div>
          <div className="today-cta">
            <span className="muted small">{cta.note}</span>
            <Link className="btn btn-primary" href="/lesson">{cta.label} <Icon name="send" size={18} /></Link>
          </div>
        </div>

        <div className="side-stack">
          <div className="card">
            <div className="stat-row">
              <div className="stat"><div className="k">연속 학습</div><div className="v num" style={{ color: "var(--amber)" }}>{d.streak}<small>일</small></div></div>
              <div className="stat"><div className="k">이번 주 달성</div><div className="v num">{d.weekDone}<small>/ 7일</small></div></div>
              <div className="stat"><div className="k">누적</div><div className="v num">{d.totalHours}<small>시간</small></div></div>
            </div>
            <div className="week" aria-label="이번 주 학습 기록">
              {d.week.map((w, i) => (
                <div key={w.date} className={`${w.state === "none" ? "" : w.state}${w.today ? " today-d" : ""}`}><i />{DAY[i]}</div>
              ))}
            </div>
          </div>
          <Link className="card due card-link" href="/review">
            <div className="big num">{dueTotal}</div>
            <div style={{ flex: 1 }}>
              <h3>복습할 카드</h3>
              <p className="muted small">
                {dueTotal ? `단어 ${d.due.word} · 문장 ${d.due.sentence} · 오답 ${d.due.mistake} — 약 ${Math.max(1, Math.round(dueTotal / 3))}분` : "오늘 복습할 카드가 없어요"}
              </p>
            </div>
            <Icon name="send" size={20} style={{ color: "var(--ink-3)" }} />
          </Link>
        </div>
      </div>

      <div className="grid g-3">
        <div className="card">
          <div className="card-head"><h3>영역별 성취도</h3><Link className="small muted" href="/stats">자세히</Link></div>
          <div className="skills">
            {SKILL_ROWS.map((s) => (
              <div key={s.key} className="skill">
                <span>{s.label}</span>
                <div className="bar"><span style={{ width: `${Math.round(d.skills[s.key])}%`, background: s.color }} /></div>
                <span className="num">{Math.round(d.skills[s.key])}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3>요즘 자주 틀리는 것</h3></div>
          {d.weak.length ? (
            <ul className="weak-list">
              {d.weak.map((w) => (
                <li key={w.tag}><span>{w.label}</span><span className={`chip ${w.improving ? "a" : "r"}`}>{w.improving ? "개선 중" : `오답 ${w.wrong}회`}</span></li>
              ))}
            </ul>
          ) : (
            <p className="muted small">최근 7일 동안 반복된 실수가 없어요. 수업을 하면 여기에 약점이 정리돼요.</p>
          )}
        </div>
        <div className="card memo">
          <div className="who"><div className="msg" style={{ maxWidth: "none" }}><div className="av">T</div></div><h3>코치의 메모</h3></div>
          <p>{d.coachNote}</p>
        </div>
      </div>
    </div>
  );
}
