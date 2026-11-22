"use client";

import { useEffect, useRef, useState } from "react";
import { LearnerMsg, SayButton, TeacherMsg, Typing } from "@/components/chat";
import { Icon } from "@/components/Icon";
import { usePrefs } from "@/components/Shell";
import type { TalkFeedback, TalkReport, TalkScenario } from "@/lib/ai/provider";
import { canListen, listenOnce, speak, stopSpeaking } from "@/lib/speech";

type Scenario = Omit<TalkScenario, "script">;
interface Line { role: "ai" | "me"; text: string; ko?: string; feedback?: TalkFeedback[] }

const CATS = [
  { id: "daily", label: "일상" },
  { id: "travel", label: "여행" },
  { id: "work", label: "직장" },
] as const;

async function post<T>(body: unknown): Promise<T> {
  const res = await fetch("/api/talk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "문제가 생겼어요.");
  return data as T;
}

const FB_CHIP: Record<TalkFeedback["type"], { label: string; cls: string }> = {
  grammar: { label: "문법", cls: "a" },
  expression: { label: "더 자연스럽게", cls: "" },
  good: { label: "좋아요", cls: "g" },
};

export default function TalkPage() {
  const { voiceRate } = usePrefs();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [cat, setCat] = useState<(typeof CATS)[number]["id"]>("daily");
  const [active, setActive] = useState<Scenario | null>(null);
  const [convId, setConvId] = useState<number | null>(null);
  const [history, setHistory] = useState<Line[]>([]);
  const [done, setDone] = useState(false);
  const [report, setReport] = useState<TalkReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const [showKo, setShowKo] = useState<Record<number, boolean>>({});
  const [error, setError] = useState("");
  const [micOk, setMicOk] = useState(false);
  const stopRef = useRef<() => void>(() => {});
  const bodyRef = useRef<HTMLDivElement>(null);
  const lastAt = useRef(Date.now());

  useEffect(() => {
    setMicOk(canListen());
    fetch("/api/talk").then((r) => r.json()).then((d) => setScenarios(d.scenarios ?? []));
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [history.length, busy, report]);

  async function start(s: Scenario) {
    setError("");
    setBusy(true);
    setActive(s);
    setReport(null);
    setDone(false);
    try {
      const r = await post<{ id: number; history: Line[] }>({ action: "start", scenario: s.id });
      setConvId(r.id);
      setHistory(r.history);
      lastAt.current = Date.now();
      speak(r.history[0].text, voiceRate);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function say(text: string) {
    if (!convId || !text.trim() || busy) return;
    setBusy(true);
    setError("");
    const secs = Math.min(180, (Date.now() - lastAt.current) / 1000);
    setHistory((h) => [...h, { role: "me", text }]);
    setInput("");
    try {
      const r = await post<{ history: Line[]; done: boolean }>({ action: "say", id: convId, text, secs });
      setHistory(r.history);
      setDone(r.done);
      lastAt.current = Date.now();
      speak(r.history[r.history.length - 1].text, voiceRate);
    } catch (e) {
      setError((e as Error).message);
      setHistory((h) => h.slice(0, -1));
      setInput(text);
    } finally {
      setBusy(false);
    }
  }

  async function end() {
    if (!convId) return;
    setBusy(true);
    stopSpeaking();
    try {
      const r = await post<{ report: TalkReport }>({ action: "end", id: convId });
      setReport(r.report);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function mic() {
    if (listening) return stopRef.current();
    setError("");
    setListening(true);
    stopSpeaking();
    stopRef.current = listenOnce({
      onPartial: setInput,
      onFinal: (t) => { setInput(t); say(t); },
      onError: setError,
      onEnd: () => setListening(false),
    });
  }

  if (!active) {
    return (
      <div className="page">
        <div className="page-head">
          <div><div className="eyebrow">AI 영어 회화</div><h1>상황을 골라 대화해보세요</h1></div>
        </div>
        <div className="scen">
          {CATS.map((c) => (
            <button key={c.id} type="button" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{c.label}</button>
          ))}
        </div>
        <div className="scen-grid">
          {scenarios.filter((s) => s.category === cat).map((s) => (
            <button key={s.id} type="button" className="scen-card" onClick={() => start(s)}>
              <span className="chip">약 5분</span>
              <h3>{s.title}</h3>
              <span className="en muted">“{s.sample}”</span>
            </button>
          ))}
        </div>
        <p className="small muted">AI가 상대 역할을 맡아요. 짧고 쉬운 문장으로 대화하고, 내가 말할 때마다 문법과 표현을 바로 알려줘요. 대화가 끝나면 고칠 표현이 복습 카드로 저장돼요.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div><div className="eyebrow">AI 영어 회화 · {CATS.find((c) => c.id === active.category)?.label}</div><h1>{active.title}</h1></div>
        <button type="button" className="btn btn-line" onClick={() => { stopSpeaking(); setActive(null); setHistory([]); setConvId(null); }}>다른 상황 고르기</button>
      </div>
      <div className="chat">
        <div className="chat-body" ref={bodyRef} aria-live="polite">
          {history.map((h, i) =>
            h.role === "ai" ? (
              <TeacherMsg key={i}>
                <div className="bubble">
                  <div className="say"><SayButton text={h.text} rate={voiceRate} /><p className="en">{h.text}</p></div>
                  {h.ko && (showKo[i] ? <p className="small muted">{h.ko}</p> : (
                    <button type="button" className="btn-ghost small" style={{ alignSelf: "flex-start", border: "none", padding: 0 }} onClick={() => setShowKo((s) => ({ ...s, [i]: true }))}>번역 보기</button>
                  ))}
                </div>
              </TeacherMsg>
            ) : (
              <div key={i} style={{ display: "contents" }}>
                <LearnerMsg text={h.text} />
                {h.feedback && h.feedback.length > 0 && (
                  <TeacherMsg>
                    <div className="bubble">
                      <div className="inline-fb">
                        {h.feedback.map((f, j) => (
                          <div key={j} className="ifb">
                            <span className={`chip ${FB_CHIP[f.type].cls}`}>{FB_CHIP[f.type].label}</span>
                            {f.suggestion && <span className="en">{f.original ? <><del style={{ color: "var(--red)" }}>{f.original}</del> → </> : null}<b style={{ color: "var(--green)" }}>{f.suggestion}</b></span>}
                            <span>{f.noteKo}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TeacherMsg>
                )}
              </div>
            ),
          )}
          {busy && <Typing />}
          {report && (
            <TeacherMsg>
              <div className="summary report">
                <div className="fb-head" style={{ color: "var(--green)" }}><Icon name="check" size={18} />대화 리포트</div>
                <p>{report.summaryKo}</p>
                {report.good.length > 0 && (
                  <div><div className="eyebrow">잘 쓴 표현</div>{report.good.map((g) => <p key={g} className="en">✓ {g}</p>)}</div>
                )}
                {report.fixes.length > 0 && (
                  <div>
                    <div className="eyebrow">고치면 좋을 표현 (복습 카드에 저장됨)</div>
                    {report.fixes.map((f) => (
                      <div key={f.original} className="phrase">
                        <span className="en"><del style={{ color: "var(--red)" }}>{f.original}</del> → <b style={{ color: "var(--green)" }}>{f.suggestion}</b></span>
                        <span className="small muted">{f.noteKo}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TeacherMsg>
          )}
        </div>
        {error && <div className="err" style={{ margin: 12 }}>{error}</div>}
        {!report && (
          typing || !micOk ? (
            <form className="composer" onSubmit={(e) => { e.preventDefault(); say(input); }}>
              {done && <div className="notice">대화가 자연스럽게 마무리됐어요. ‘대화 끝내기’를 눌러 리포트를 받아보세요.</div>}
              <div className="input-row">
                {micOk && <button className="icon-btn" type="button" onClick={() => setTyping(false)} aria-label="말로 입력하기"><Icon name="mic" /></button>}
                <input id="talk-input" type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={`예: ${active.sample}`} autoComplete="off" lang="en" enterKeyHint="send" />
                <button className="icon-btn" type="submit" disabled={busy || !input.trim()} aria-label="보내기" style={{ background: "var(--green)", color: "var(--green-ink)", borderColor: "var(--green)" }}><Icon name="send" /></button>
              </div>
              <button type="button" className="btn btn-line" onClick={end} disabled={busy || history.length < 3}>대화 끝내고 리포트 보기</button>
            </form>
          ) : (
            <div>
              {done && <div className="notice" style={{ margin: "12px 12px 0" }}>대화가 자연스럽게 마무리됐어요. ‘대화 끝내기’를 눌러 리포트를 받아보세요.</div>}
              {listening && input && <p className="en" style={{ textAlign: "center", padding: "12px 16px 0" }}>{input}</p>}
              <div className="voice-bar">
                <button className="icon-btn" type="button" aria-label="글자로 입력하기" onClick={() => setTyping(true)}>Aa</button>
                <button className={`big-mic ${listening ? "mic-live" : ""}`} type="button" aria-label={listening ? "말하기 멈추기" : "눌러서 말하기"} onClick={mic} disabled={busy}>
                  <Icon name={listening ? "stop" : "mic"} size={28} />
                </button>
                <button className="icon-btn" type="button" onClick={end} disabled={busy || history.length < 3} style={{ width: "auto", padding: "0 14px", fontSize: 13 }}>대화 끝내기</button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
