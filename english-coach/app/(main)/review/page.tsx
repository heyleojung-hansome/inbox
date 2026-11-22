"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { SayButton } from "@/components/chat";
import { usePrefs } from "@/components/Shell";
import { intervalLabel, schedule, type Rating } from "@/lib/engine/srs";
import type { Card } from "@/lib/repo";

const KIND: Record<Card["kind"], { label: string; chip: string }> = {
  word: { label: "단어", chip: "" },
  sentence: { label: "문장", chip: "g" },
  mistake: { label: "오답 노트", chip: "r" },
};
const FILTERS = [
  { id: "all", label: "전체" },
  { id: "word", label: "단어" },
  { id: "sentence", label: "문장" },
  { id: "mistake", label: "오답" },
];
const RATINGS: { r: Rating; label: string; cls: string }[] = [
  { r: 0, label: "다시", cls: "again" },
  { r: 1, label: "어려움", cls: "" },
  { r: 2, label: "좋음", cls: "good" },
  { r: 3, label: "쉬움", cls: "" },
];

function dueLabel(iso: string) {
  const diff = Date.parse(iso) - Date.now();
  if (diff <= 0) return "오늘";
  const days = Math.ceil(diff / 86400000);
  return days <= 1 ? "내일" : `${days}일 후`;
}

export default function ReviewPage() {
  const { voiceRate } = usePrefs();
  const [queue, setQueue] = useState<Card[] | null>(null);
  const [start, setStart] = useState(0);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [filter, setFilter] = useState("all");
  const [list, setList] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const shownAt = useRef(Date.now());

  const loadList = useCallback(async (f: string) => {
    const res = await fetch(`/api/review?filter=${f}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data as { due: Card[]; list: Card[]; total: number };
  }, []);

  useEffect(() => {
    loadList("all")
      .then((d) => {
        setQueue(d.due);
        setStart(d.due.length);
        setList(d.list);
        setTotal(d.total);
      })
      .catch((e) => setError(e.message));
  }, [loadList]);

  async function changeFilter(f: string) {
    setFilter(f);
    try {
      setList((await loadList(f)).list);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const card = queue?.[pos];

  async function rate(r: Rating) {
    if (!card) return;
    const secs = Math.min(120, (Date.now() - shownAt.current) / 1000);
    setFlipped(false);
    try {
      const res = await fetch("/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: card.id, rating: r, secs }) });
      if (!res.ok) throw new Error((await res.json()).error);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    // '다시'는 오늘 안에 한 번 더 보도록 뒤로 보냅니다
    setQueue((q) => (q && r === 0 ? [...q, { ...card }] : q));
    setPos((p) => p + 1);
    shownAt.current = Date.now();
  }

  const remaining = queue ? queue.length - pos : 0;
  const progressPct = queue && queue.length ? (Math.min(pos, queue.length) / queue.length) * 100 : 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">간격 반복 복습</div>
          <h1>{queue === null ? "복습 카드를 불러오는 중" : remaining > 0 ? `오늘 복습할 카드 ${remaining}장` : "오늘 복습 끝!"}</h1>
        </div>
        {queue && queue.length > 0 && (
          <div className="progress-line" style={{ minWidth: 220 }}>
            <span className="num">{Math.min(pos + 1, queue.length)} / {queue.length}</span>
            <div className="bar"><span style={{ width: `${progressPct}%`, background: "var(--green)" }} /></div>
          </div>
        )}
      </div>
      {error && <div className="err">{error}</div>}

      <div className="review">
        <div className="flash-wrap">
          {card ? (
            <>
              <div className={`flash ${flipped ? "flipped" : ""}`} role="button" tabIndex={0} aria-label="카드 뒤집기"
                onClick={() => setFlipped((f) => !f)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFlipped((f) => !f); } }}>
                <div className="flash-inner">
                  <div className="face">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <span className={`chip ${KIND[card.kind].chip}`}>{KIND[card.kind].label}</span>
                      <span className="small muted">영어로 떠올린 뒤 눌러서 확인</span>
                    </div>
                    <p className="front-text">{card.kind === "word" ? card.front : `“${card.front}”`}</p>
                    <p className="hint">{card.lapses > 0 ? `${card.lapses}번 다시 본 카드예요.` : card.reps === 0 ? "처음 복습하는 카드예요." : `${card.reps}번째 복습이에요.`}</p>
                  </div>
                  <div className="face back">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="chip g">정답</span>
                      <span onClick={(e) => e.stopPropagation()}><SayButton text={card.back} rate={voiceRate} /></span>
                    </div>
                    <p className="en big">{card.back}</p>
                    {card.note && <p className="small muted">{card.note}</p>}
                  </div>
                </div>
              </div>
              <div className="rate">
                {RATINGS.map(({ r, label, cls }) => (
                  <button key={r} type="button" className={cls} onClick={() => rate(r)}>
                    {label}
                    <span>{intervalLabel(schedule({ ease: card.ease, intervalDays: card.interval_days, reps: card.reps, lapses: card.lapses }, r).dueInMinutes)}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            queue && (
              <div className="card empty">
                <h3>{start > 0 ? `${start}장을 모두 복습했어요!` : "지금 복습할 카드가 없어요"}</h3>
                <p className="small">수업에서 틀린 문장과 배운 표현이 자동으로 쌓이고, 잊어버릴 때쯤 다시 나와요.</p>
                <div className="done-actions" style={{ justifyContent: "center" }}>
                  <Link className="btn btn-primary" href="/lesson">오늘의 수업</Link>
                  <Link className="btn btn-line" href="/">홈으로</Link>
                </div>
              </div>
            )
          )}
        </div>

        <div className="card">
          <div className="card-head"><h3>저장된 표현</h3><span className="small muted">총 {total}개</span></div>
          <div className="filters">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => changeFilter(f.id)}>{f.label}</button>
            ))}
          </div>
          <div className="items">
            {list.length === 0 && <p className="small muted">아직 저장된 표현이 없어요.</p>}
            {list.map((c) => (
              <div key={c.id} className="item">
                <span className="en">{c.back}</span>
                <span className={`chip ${KIND[c.kind].chip}`}>{KIND[c.kind].label}</span>
                <span className="small muted">{c.front}</span>
                <span className="meta">{dueLabel(c.due_at)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
