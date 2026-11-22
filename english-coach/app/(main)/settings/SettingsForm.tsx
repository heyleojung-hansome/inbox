"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useTheme } from "@/components/Shell";
import { speak } from "@/lib/speech";
import type { Learner } from "@/lib/types";

const LEVEL_NAME = { PRE_A1: "입문 단계", A1: "기초 문장 단계", A2: "일상 회화 단계", B1: "실생활 응용 단계" } as const;

function Opts<T extends string | number>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="opts">
      {options.map((o) => (
        <button key={String(o.v)} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)}>{o.label}</button>
      ))}
    </div>
  );
}

export function SettingsForm({ initial, ai }: { initial: Learner; ai: string | null }) {
  const [l, setL] = useState(initial);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [theme, setTheme] = useTheme();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function save(patch: Partial<Learner>) {
    setL((x) => ({ ...x, ...patch }));
    setError("");
    try {
      const res = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      if (!res.ok) throw new Error((await res.json()).error);
      setSaved("저장했어요");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setSaved(""), 1500);
    } catch (e) {
      setError((e as Error).message || "저장하지 못했어요. 다시 시도해 주세요.");
    }
  }

  const ratio = Math.round(l.koreanRatio * 100);

  return (
    <div className="page">
      <div className="page-head">
        <div><div className="eyebrow">목표·설정</div><h1>나에게 맞게 조정하기</h1></div>
        <span className="small muted" role="status">{saved}</span>
      </div>
      {error && <div className="err">{error}</div>}
      <div className="prefs">
        <div className="card">
          <div className="card-head"><h3>학습 목표</h3></div>
          <div className="field">
            <div className="level-badge">
              <span className="lv">{l.level.replace("_", "-")}</span>
              <div><b>{LEVEL_NAME[l.level]}</b><p className="small muted">수업 난이도 {l.difficulty} / 5 · 정답률에 따라 자동으로 바뀌어요</p></div>
            </div>
            <Link className="btn btn-line" href="/onboarding?retest=1" style={{ alignSelf: "flex-start" }}>수준 다시 진단하기</Link>
          </div>
          <div className="field">
            <label htmlFor="name">이름</label>
            <input id="name" className="text-input" defaultValue={l.name} maxLength={20} onBlur={(e) => e.target.value.trim() && e.target.value !== l.name && save({ name: e.target.value.trim() })} />
          </div>
          <div className="field">
            <span className="lbl">주로 쓰고 싶은 상황</span>
            <Opts value={l.goal} onChange={(goal) => save({ goal })} options={[{ v: "daily", label: "일상 회화" }, { v: "travel", label: "해외 여행" }, { v: "work", label: "직장·비즈니스" }]} />
          </div>
          <div className="field">
            <span className="lbl">하루 학습 시간</span>
            <Opts value={l.dailyMinutes} onChange={(dailyMinutes) => save({ dailyMinutes })} options={[15, 30, 45, 60].map((v) => ({ v, label: `${v}분` }))} />
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>AI 선생님</h3></div>
          <div className="field">
            <label htmlFor="koRatio">설명할 때 한국어 비율</label>
            <div className="range-row">
              <input id="koRatio" type="range" min={30} max={100} step={5} value={ratio}
                onChange={(e) => setL((x) => ({ ...x, koreanRatio: Number(e.target.value) / 100 }))}
                onPointerUp={(e) => save({ koreanRatio: Number((e.target as HTMLInputElement).value) / 100, autoRatio: false })}
                onKeyUp={(e) => save({ koreanRatio: Number((e.target as HTMLInputElement).value) / 100, autoRatio: false })} />
              <output htmlFor="koRatio" className="num">한국어 {ratio}%</output>
            </div>
            <div className="toggle">
              <p className="desc">자동 조정: 주간 정답률이 80%를 넘으면 영어 비율을 조금씩 늘려요.</p>
              <button className="switch" type="button" role="switch" aria-checked={l.autoRatio} aria-label="한국어 비율 자동 조정" onClick={() => save({ autoRatio: !l.autoRatio })} />
            </div>
          </div>
          <div className="field">
            <span className="lbl">음성 속도</span>
            <Opts value={l.voiceRate} onChange={(voiceRate) => { save({ voiceRate }); speak("Can I get a latte, please?", voiceRate); }}
              options={[{ v: 0.7, label: "천천히" }, { v: 0.9, label: "보통" }, { v: 1.1, label: "빠르게" }]} />
          </div>
          <div className="field">
            <span className="lbl">말투</span>
            <Opts value={l.tone} onChange={(tone) => save({ tone })} options={[{ v: "coach", label: "친근한 코치" }, { v: "teacher", label: "차분한 선생님" }]} />
          </div>
          <div className="field">
            <span className="lbl">화면 테마 <span className="small muted">(이 기기에만 적용)</span></span>
            <Opts value={theme} onChange={setTheme} options={[{ v: "system", label: "시스템" }, { v: "light", label: "라이트" }, { v: "dark", label: "다크" }]} />
          </div>
          <div className="field toggle">
            <div><span className="lbl">AI 연결</span><p className="desc">{ai ? `${ai}에 연결되어 있어요.` : "Gemini API 키가 없어 내장 예비 모드로 동작 중이에요. 미리 준비된 문제와 규칙 기반 채점을 써요."}</p></div>
          </div>
          <div className="field toggle">
            <div><span className="lbl">학습 데이터</span><p className="desc">진도, 복습 카드, 응답 기록을 JSON 파일로 저장해요.</p></div>
            <a className="btn btn-line" href="/api/export" download>내보내기</a>
          </div>
        </div>
      </div>
    </div>
  );
}
