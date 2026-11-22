import type { Level, Skill, Skills } from "./types";

export interface DiagItem {
  id: string;
  level: 1 | 2 | 3 | 4;
  skill: Skill;
  instructionKo: string;
  prompt: string;
  audio?: boolean;
  choices: string[];
  answer: string;
}

/** 수준 진단 10문항 (AI 호출 없이 바로 채점) */
export const DIAGNOSTIC: DiagItem[] = [
  { id: "d1", level: 1, skill: "reading", instructionKo: "알맞은 뜻을 고르세요.", prompt: "Nice to meet you.", choices: ["만나서 반가워요.", "다음에 봐요.", "괜찮아요.", "고마워요."], answer: "만나서 반가워요." },
  { id: "d2", level: 1, skill: "writing", instructionKo: "빈칸에 들어갈 말을 고르세요.", prompt: "I ___ a student.", choices: ["am", "is", "are", "be"], answer: "am" },
  { id: "d3", level: 1, skill: "listening", instructionKo: "듣고 들은 문장을 고르세요.", prompt: "Where are you from?", audio: true, choices: ["Where are you from?", "What do you do?", "How are you?", "Who are you?"], answer: "Where are you from?" },
  { id: "d4", level: 2, skill: "writing", instructionKo: "빈칸에 들어갈 말을 고르세요.", prompt: "Can I get ___ iced tea, please?", choices: ["a", "an", "the", "(없음)"], answer: "an" },
  { id: "d5", level: 2, skill: "reading", instructionKo: "자연스러운 대답을 고르세요.", prompt: "A: For here or to go?  B: ___", choices: ["To go, please.", "I'm fine, thanks.", "Nice to meet you.", "It's Monday."], answer: "To go, please." },
  { id: "d6", level: 2, skill: "writing", instructionKo: "빈칸에 들어갈 말을 고르세요.", prompt: "Yesterday, I ___ to the park.", choices: ["go", "goes", "went", "going"], answer: "went" },
  { id: "d7", level: 3, skill: "listening", instructionKo: "듣고 질문에 답하세요: 회의는 언제인가요?", prompt: "Let's meet on Thursday at three.", audio: true, choices: ["화요일 3시", "목요일 3시", "목요일 2시", "토요일 3시"], answer: "목요일 3시" },
  { id: "d8", level: 3, skill: "reading", instructionKo: "가장 공손한 표현을 고르세요.", prompt: "식당에서 물을 부탁할 때", choices: ["Give me water.", "Water.", "Could I have some water?", "I want water now."], answer: "Could I have some water?" },
  { id: "d9", level: 4, skill: "writing", instructionKo: "빈칸에 들어갈 말을 고르세요.", prompt: "I have lived here ___ 2019.", choices: ["for", "since", "from", "at"], answer: "since" },
  { id: "d10", level: 4, skill: "reading", instructionKo: "문장의 뜻을 고르세요.", prompt: "Could we push the meeting back an hour?", choices: ["회의를 한 시간 미룰 수 있을까요?", "회의를 한 시간 당길 수 있을까요?", "회의를 취소할까요?", "회의가 한 시간 걸리나요?"], answer: "회의를 한 시간 미룰 수 있을까요?" },
];

export interface DiagResult {
  level: Level;
  skills: Skills;
  unitIndex: number;
  correct: number;
}

export function scoreDiagnostic(answers: Record<string, string>): DiagResult {
  let points = 0;
  let correct = 0;
  const per: Record<Skill, { got: number; total: number }> = {
    listening: { got: 0, total: 0 },
    speaking: { got: 0, total: 0 },
    reading: { got: 0, total: 0 },
    writing: { got: 0, total: 0 },
  };
  for (const item of DIAGNOSTIC) {
    per[item.skill].total += item.level;
    if (answers[item.id] === item.answer) {
      points += item.level;
      correct += 1;
      per[item.skill].got += item.level;
    }
  }
  const max = DIAGNOSTIC.reduce((s, i) => s + i.level, 0);
  const ratio = points / max;
  const level: Level = ratio < 0.25 ? "PRE_A1" : ratio < 0.55 ? "A1" : ratio < 0.8 ? "A2" : "B1";
  const pct = (s: Skill) => Math.round(15 + 60 * (per[s].total ? per[s].got / per[s].total : ratio));
  const skills: Skills = {
    listening: pct("listening"),
    reading: pct("reading"),
    writing: pct("writing"),
    // 말하기는 진단 문항이 없어 전체 비율로 낮게 추정
    speaking: Math.round(10 + 50 * ratio),
  };
  const unitIndex = { PRE_A1: 0, A1: 0, A2: 2, B1: 4 }[level];
  return { level, skills, unitIndex, correct };
}
