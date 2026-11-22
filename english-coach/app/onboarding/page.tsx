"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import type { DiagItem } from "@/lib/diagnostic";
import { speak } from "@/lib/speech";
import type { Goal } from "@/lib/types";

type PublicItem = Omit<DiagItem, "answer">;
const LEVEL_TEXT: Record<string, string> = {
  PRE_A1: "입문 · 알파벳과 기본 인사부터 차근차근 시작해요",
  A1: "기초 · 짧은 문장으로 자기소개와 주문을 할 수 있어요",
  A2: "초중급 · 익숙한 상황에서 간단한 대화를 할 수 있어요",
  B1: "중급 · 여행과 업무 상황에서 대화를 이어갈 수 있어요",
};

export default function Onboarding() {
  const router = useRouter();
  const [items, setItems] = useState<PublicItem[]>([]);
  const [stage, setStage] = useState<"profile" | "test" | "result">("profile");
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<Goal>("daily");
  const [minutes, setMinutes] = useState(30);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ level: string; correct: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const retest = new URLSearchParams(location.search).get("retest");
    fetch("/api/onboarding").then((r) => r.json()).then((d) => {
      if (d.done && !retest) router.replace("/");
      setItems(d.items ?? []);
    });
    if (retest) {
      fetch("/api/settings").then((r) => r.json()).then((d) => {
        if (d.learner) { setName(d.learner.name); setGoal(d.learner.goal); setMinutes(d.learner.dailyMinutes); }
      });
    }
  }, [router]);

  const item = items[idx];

  async function finish(final: Record<string, string>) {
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, goal, dailyMinutes: minutes, answers: final }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      setStage("result");
    } catch (e) {
      setError((e as Error).message || "저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  function choose(c: string) {
    const next = { ...answers, [item.id]: c };
    setAnswers(next);
    if (idx + 1 < items.length) {
      setIdx(idx + 1);
      const n = items[idx + 1];
      if (n.audio) setTimeout(() => speak(n.prompt, 0.85), 250);
    } else finish(next);
  }

  return (
    <div className="center-wrap">
      <div className="narrow">
        <div className="brand" style={{ padding: 0 }}><div className="brand-mark">Ec</div><b>English Coach</b></div>

        {stage === "profile" && (
          <form className="card" style={{ display: "flex", flexDirection: "column", gap: 4 }} onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return setError("이름을 입력해 주세요.");
            setError("");
            setStage("test");
            if (items[0]?.audio) speak(items[0].prompt, 0.85);
          }}>
            <h1 style={{ fontSize: 24 }}>반가워요! 먼저 몇 가지만 알려주세요</h1>
            <p className="muted small" style={{ marginBottom: 8 }}>입력한 내용에 맞춰 AI 선생님이 매일 수업을 준비해요.</p>
            <div className="field">
              <label htmlFor="ob-name">어떻게 불러드릴까요?</label>
              <input id="ob-name" className="text-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="이름 또는 별명" maxLength={20} autoComplete="given-name" />
            </div>
            <div className="field">
              <span className="lbl">영어를 주로 어디에 쓰고 싶나요?</span>
              <div className="opts">
                {([["daily", "일상 회화"], ["travel", "해외 여행"], ["work", "직장·비즈니스"]] as const).map(([v, label]) => (
                  <button key={v} type="button" aria-pressed={goal === v} onClick={() => setGoal(v)}>{label}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="lbl">하루에 얼마나 공부할까요?</span>
              <div className="opts">
                {[15, 30, 45, 60].map((m) => <button key={m} type="button" aria-pressed={minutes === m} onClick={() => setMinutes(m)}>{m}분</button>)}
              </div>
            </div>
            {error && <div className="err">{error}</div>}
            <button className="btn btn-primary btn-block" type="submit" disabled={!items.length}>수준 진단 시작 (10문제, 약 3분)</button>
          </form>
        )}

        {stage === "test" && item && (
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="qprogress" aria-label={`${idx + 1} / ${items.length}`}>
              {items.map((_, i) => <i key={i} className={i <= idx ? "on" : ""} />)}
            </div>
            <span className="qlabel">문제 {idx + 1} / {items.length} · {item.instructionKo}</span>
            {item.audio ? (
              <div className="audio">
                <button className="play" type="button" aria-label="문장 듣기" onClick={() => speak(item.prompt, 0.85)}><Icon name="play" size={14} /></button>
                <span className="small muted">눌러서 듣기 (여러 번 들어도 괜찮아요)</span>
              </div>
            ) : (
              <p className={/[가-힣]/.test(item.prompt) ? "" : "en"} style={{ fontSize: 19, fontWeight: 500 }}>{item.prompt}</p>
            )}
            <div className="choices">
              {item.choices.map((c) => <button key={c} type="button" className="choice" disabled={busy} onClick={() => choose(c)}>{c}</button>)}
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => choose("")} disabled={busy}>잘 모르겠어요</button>
            {error && <div className="err">{error}</div>}
          </div>
        )}

        {stage === "result" && result && (
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <span className="eyebrow">진단 결과</span>
            <div className="level-badge">
              <span className="lv">{result.level.replace("_", "-")}</span>
              <div><b>{LEVEL_TEXT[result.level]}</b><p className="small muted">10문제 중 {result.correct}문제 정답</p></div>
            </div>
            <p>이 수준에 맞춰 첫 수업을 준비했어요. 매일 수업을 하면 AI 선생님이 실력을 다시 판단해서 난이도를 조절해요.</p>
            <button className="btn btn-primary btn-block" type="button" onClick={() => { router.replace("/"); router.refresh(); }}>시작하기</button>
          </div>
        )}
      </div>
    </div>
  );
}
