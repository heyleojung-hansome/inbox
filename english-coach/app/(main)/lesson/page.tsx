"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FeedbackCard, LearnerMsg, SayButton, TeacherMsg, Typing } from "@/components/chat";
import { Icon } from "@/components/Icon";
import { usePrefs } from "@/components/Shell";
import type { LessonView } from "@/lib/engine/lesson";
import { canListen, listenOnce, speak, stopSpeaking } from "@/lib/speech";
import { STEPS, type ChatMessage, type Evaluation, type Item, type LessonSummary } from "@/lib/types";

type Summary = LessonSummary & { accuracy: number; advanced: boolean };

async function api<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "문제가 생겼어요.");
  return data as T;
}

function mmss(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export default function LessonPage() {
  const { voiceRate } = usePrefs();
  const [view, setView] = useState<LessonView | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [hintFor, setHintFor] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [micOk, setMicOk] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const stopRef = useRef<() => void>(() => {});
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const v = await api<LessonView>("/api/lesson/start");
      setView(v);
      setElapsed(v.activeSecs);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    setMicOk(canListen());
    load();
    return () => stopSpeaking();
  }, [load]);

  useEffect(() => {
    if (view?.status !== "in_progress") return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [view?.status]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [view?.messages.length, busy]);

  const current = view?.current ?? null;

  async function send(answer: string, skipped = false) {
    if (!view || busy) return;
    setBusy(true);
    setError("");
    stopRef.current();
    try {
      const { view: next } = await api<{ view: LessonView }>("/api/lesson/answer", { lessonId: view.id, answer, skipped });
      setView(next);
      setInput("");
      setPicked(null);
      setHintFor(null);
      const it = next.current;
      if (it?.type === "shadowing" && it.audioText) speak(it.audioText, voiceRate);
      else if (it?.type === "mcq" && it.skill === "listening" && it.audioText) speak(it.audioText, voiceRate);
      if (it && it.type !== "mcq") setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function toggleMic() {
    if (listening) {
      stopRef.current();
      return;
    }
    setError("");
    setListening(true);
    stopRef.current = listenOnce({
      onPartial: (t) => setInput(t),
      onFinal: (t) => setInput(t),
      onError: (m) => setError(m),
      onEnd: () => setListening(false),
    });
  }

  if (error && !view) {
    return (
      <div className="page">
        <div className="err">{error}</div>
        <button className="btn btn-line" type="button" onClick={load}>다시 시도</button>
      </div>
    );
  }
  if (!view) {
    return (
      <div className="page">
        <div className="page-head"><div><div className="eyebrow">오늘의 수업</div><h1>수업을 준비하고 있어요</h1></div></div>
        <div className="chat"><div className="chat-body"><Typing /></div></div>
      </div>
    );
  }

  const step = STEPS[view.step];
  const done = view.status === "completed";
  const lastItemMsgId = [...view.messages].reverse().find((m) => m.kind === "item")?.id;

  return (
    <div className="page">
      <div className="page-head lesson-head">
        <div>
          <div className="eyebrow">{view.unit.title}</div>
          <h1>{done ? "오늘 수업 완료" : `${view.step + 1}단계 · ${step.name}`}</h1>
        </div>
        <div className="timer">오늘 학습 시간 <b className="num">{mmss(elapsed)}</b></div>
      </div>
      <div className="stepper" aria-label="수업 단계">
        {STEPS.map((s, i) => {
          const st = done || i < view.step ? "done" : i === view.step ? "now" : "";
          return (
            <span key={s.id} style={{ display: "contents" }}>
              {i > 0 && <span className="sep" />}
              <span className={`s ${st}`}><i>{st === "done" ? "✓" : i + 1}</i><span className="lbl">{s.name}</span></span>
            </span>
          );
        })}
      </div>

      <div className="lesson">
        <div className="chat">
          <div className="chat-body" ref={bodyRef} aria-live="polite">
            {view.messages.map((m) => (
              <Message key={m.id} m={m} rate={voiceRate} active={m.id === lastItemMsgId && !!current && !done}
                hintOpen={hintFor === (m.payload.item as Item | undefined)?.id} picked={picked}
                onPick={(c) => { setPicked(c); send(c); }} busy={busy} />
            ))}
            {busy && <Typing />}
          </div>

          {!done && current && (
            <div className="composer">
              {error && <div className="err">{error}</div>}
              <div className="quick">
                {current.hint && <button type="button" onClick={() => setHintFor(current.id)}>힌트 보기</button>}
                {(current.audioText || current.type === "shadowing") && (
                  <button type="button" onClick={() => speak(current.audioText ?? current.promptEn ?? "", voiceRate)}>다시 듣기</button>
                )}
                {(current.audioText || current.type === "shadowing") && (
                  <button type="button" onClick={() => speak(current.audioText ?? current.promptEn ?? "", Math.max(0.6, voiceRate - 0.2))}>천천히 듣기</button>
                )}
                <button type="button" disabled={busy} onClick={() => send("", true)}>잘 모르겠어요</button>
              </div>
              {current.type !== "mcq" && (
                <form className="input-row" onSubmit={(e) => { e.preventDefault(); if (input.trim()) send(input); }}>
                  {micOk && (
                    <button className={`icon-btn mic ${listening ? "mic-live" : ""}`} type="button" onClick={toggleMic} aria-label={listening ? "말하기 멈추기" : "말로 답하기"} disabled={busy}>
                      <Icon name={listening ? "stop" : "mic"} />
                    </button>
                  )}
                  <input ref={inputRef} id="lesson-answer" type="text" value={input} onChange={(e) => setInput(e.target.value)}
                    placeholder={listening ? "듣고 있어요… 영어로 말해보세요" : "영어로 답을 입력하세요"} autoComplete="off" autoCapitalize="sentences" spellCheck={false} lang="en" enterKeyHint="send" />
                  <button className="icon-btn" type="submit" aria-label="답 보내기" disabled={busy || !input.trim()} style={{ background: "var(--green)", color: "var(--green-ink)", borderColor: "var(--green)" }}>
                    <Icon name="send" />
                  </button>
                </form>
              )}
            </div>
          )}
          {done && (
            <div className="composer">
              <div className="done-actions">
                <Link className="btn btn-primary" href="/review">복습하러 가기</Link>
                <Link className="btn btn-line" href="/talk">AI와 회화 연습</Link>
                <Link className="btn btn-ghost" href="/">홈으로</Link>
              </div>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="card">
            <div className="card-head"><h3>오늘의 표현</h3><span className="small muted">{view.unit.phrases.length}개</span></div>
            {view.unit.phrases.map((p) => (
              <div key={p.en} className="phrase">
                <span className="say"><SayButton text={p.en} rate={voiceRate} /><span className="en">{p.en}</span></span>
                <span className="small muted">{p.ko}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-head"><h3>이번 수업 기록</h3></div>
            <div className="tally">
              <div><b className="num up">{view.correct}</b><span className="small muted">정답</span></div>
              <div><b className="num" style={{ color: "var(--red)" }}>{view.wrong}</b><span className="small muted">오답</span></div>
              <div><b className="num">{view.correct + view.wrong ? Math.round((view.correct / (view.correct + view.wrong)) * 100) : 0}%</b><span className="small muted">정답률</span></div>
            </div>
            <p className="small muted" style={{ marginTop: 12 }}>난이도 <b>{view.difficulty} / 5</b> · 최근 10문제 정답률에 따라 자동으로 조정돼요.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Message({ m, rate, active, hintOpen, picked, onPick, busy }: {
  m: ChatMessage; rate: number; active: boolean; hintOpen: boolean; picked: string | null; onPick: (c: string) => void; busy: boolean;
}) {
  const p = m.payload;
  switch (m.kind) {
    case "text":
      return <TeacherMsg><div className="bubble"><p>{String(p.text)}</p></div></TeacherMsg>;
    case "step":
      return (
        <>
          <div className="step-banner"><b>{Number(p.step) + 1}단계</b> {String(p.name)} · {String(p.minutes)}분</div>
          <TeacherMsg><div className="bubble"><p>{String(p.text)}</p></div></TeacherMsg>
        </>
      );
    case "answer":
      return <LearnerMsg text={String(p.text)} muted={!!p.skipped} />;
    case "feedback":
      return <FeedbackCard ev={p.evaluation as Evaluation} answer={String(p.answer ?? "")} itemType={String(p.itemType)} rate={rate} />;
    case "summary":
      return <SummaryCard s={p as unknown as Summary} rate={rate} />;
    case "item":
      return <ItemCard item={p.item as Item} number={Number(p.number)} total={Number(p.total)} rate={rate} active={active} hintOpen={hintOpen} picked={picked} onPick={onPick} busy={busy} />;
    default:
      return null;
  }
}

function ItemCard({ item, number, total, rate, active, hintOpen, picked, onPick, busy }: {
  item: Item; number: number; total: number; rate: number; active: boolean; hintOpen: boolean; picked: string | null; onPick: (c: string) => void; busy: boolean;
}) {
  const label = item.reinforce ? "보강 문제" : `문제 ${number} / ${Math.max(total, number)}`;
  const showDialogue = item.dialogue && (item.showDialogue || !active);
  return (
    <TeacherMsg>
      <div className="qcard" style={{ minWidth: 0, width: "100%" }}>
        <span className="qlabel">{label} · {item.instructionKo}</span>
        {item.type === "mcq" && item.skill === "listening" && item.audioText && (
          <div className="audio">
            <button className="play" type="button" aria-label="대화 듣기" onClick={() => speak(item.audioText!, rate)}><Icon name="play" size={14} /></button>
            <span className="small muted">눌러서 대화 듣기{active ? " · 대화 내용은 답한 뒤에 보여드려요" : ""}</span>
          </div>
        )}
        {showDialogue && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {item.dialogue!.map((l, i) => (
              <div key={i} className="dialog-line"><b>{l.speaker}</b><span><span className="en">{l.en}</span>{!active && l.ko && <span className="small muted" style={{ display: "block" }}>{l.ko}</span>}</span></div>
            ))}
          </div>
        )}
        {item.type === "mcq" && (
          <>
            <p style={{ fontSize: 16, fontWeight: 500 }}>{item.promptEn}</p>
            <div className="choices">
              {item.choices?.map((c) => (
                <button key={c} type="button" className={`choice ${picked === c && active ? "picked" : ""}`} disabled={!active || busy} onClick={() => onPick(c)}>{c}</button>
              ))}
            </div>
          </>
        )}
        {item.type === "shadowing" && (
          <>
            <div className="say"><SayButton text={item.promptEn!} rate={rate} /><p className="en" style={{ fontSize: 19 }}>{item.promptEn}</p></div>
            <p className="small muted">{item.promptKo}</p>
          </>
        )}
        {(item.type === "translate" || item.type === "build") && (
          <p style={{ fontSize: 17, fontWeight: 500 }}>“{item.promptKo}”</p>
        )}
        {hintOpen && item.hint && <p className="small muted">힌트: {item.hint}</p>}
      </div>
    </TeacherMsg>
  );
}

function SummaryCard({ s, rate }: { s: Summary; rate: number }) {
  return (
    <TeacherMsg>
      <div className="summary">
        <div className="fb-head" style={{ color: "var(--green)" }}><Icon name="check" size={18} />오늘 수업을 마쳤어요 · 정답률 {s.accuracy}%</div>
        <p>{s.summaryKo}</p>
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>오늘의 핵심 표현</div>
          {s.keyPhrases.map((p) => (
            <div key={p.en} className="phrase">
              <span className="say"><SayButton text={p.en} rate={rate} /><span className="en">{p.en}</span></span>
              <span className="small muted">{p.ko}</span>
            </div>
          ))}
        </div>
        <div className="why"><b>다음 수업에서는</b><br />{s.nextFocus}</div>
        <p className="small muted">{s.advanced ? "다음 수업부터 새 단원으로 넘어가요." : "정답률이 60%가 안 돼서 다음 수업도 이 단원을 한 번 더 연습해요."} 오늘 배운 표현은 내일부터 복습 카드로 나와요.</p>
      </div>
    </TeacherMsg>
  );
}
