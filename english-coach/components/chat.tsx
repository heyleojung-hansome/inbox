"use client";

import { wordDiff } from "@/lib/text";
import { ERROR_TAGS, type ErrorTag, type Evaluation } from "@/lib/types";
import { Icon } from "./Icon";
import { speak } from "@/lib/speech";

export function TeacherMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="msg">
      <div className="av">T</div>
      {children}
    </div>
  );
}

export function LearnerMsg({ text, muted }: { text: string; muted?: boolean }) {
  return (
    <div className="msg me">
      <div className="bubble"><p className={muted ? "muted" : "en"}>{text}</p></div>
    </div>
  );
}

export function Typing() {
  return (
    <TeacherMsg>
      <div className="bubble typing" aria-label="선생님이 답을 확인하는 중"><i /><i /><i /></div>
    </TeacherMsg>
  );
}

export function SayButton({ text, rate, label }: { text: string; rate: number; label?: string }) {
  return (
    <button type="button" className="play-sm" aria-label={label ?? "듣기"} onClick={() => speak(text, rate)}>
      <Icon name="volume" size={15} />
    </button>
  );
}

export function Diff({ answer, corrected }: { answer: string; corrected: string }) {
  const ops = wordDiff(answer, corrected);
  return (
    <div className="diff">
      {ops.map((o, i) => (
        <span key={i}>
          {o.op === "same" ? o.text : o.op === "del" ? <del>{o.text}</del> : <ins>{o.text}</ins>}{" "}
        </span>
      ))}
    </div>
  );
}

export function FeedbackCard({ ev, answer, itemType, rate }: { ev: Evaluation; answer: string; itemType: string; rate: number }) {
  const showDiff = !ev.isCorrect && answer && itemType !== "mcq";
  return (
    <TeacherMsg>
      <div className={`fb ${ev.isCorrect ? "right" : "wrong"}`}>
        <div className="fb-head">
          <Icon name={ev.isCorrect ? "check" : "x"} size={18} />
          {ev.isCorrect ? ev.encouragement || "정답이에요!" : ev.score >= 70 ? "거의 맞았어요! 조금만 고쳐볼까요?" : "괜찮아요, 같이 고쳐봐요"}
        </div>
        {showDiff ? (
          <Diff answer={answer} corrected={ev.corrected} />
        ) : (
          !ev.isCorrect && itemType !== "mcq" && <div className="diff"><ins>{ev.corrected}</ins></div>
        )}
        {itemType !== "mcq" && (
          <div className="say"><SayButton text={ev.corrected} rate={rate} label="정답 문장 듣기" /><span className="small muted">정답 문장 듣기</span></div>
        )}
        <div className="why">{ev.explanationKo}</div>
        {(ev.errorTags.length > 0 || !ev.isCorrect) && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {ev.errorTags.map((t) => <span key={t} className="chip r">{ERROR_TAGS[t as ErrorTag] ?? t}</span>)}
            {!ev.isCorrect && itemType !== "mcq" && <span className="chip">복습 카드에 저장됨</span>}
          </div>
        )}
        {!ev.isCorrect && ev.encouragement && <p className="small muted">{ev.encouragement}</p>}
      </div>
    </TeacherMsg>
  );
}
