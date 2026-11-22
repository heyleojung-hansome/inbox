export type StepId = "review" | "listen_read" | "speak" | "build" | "wrap";
export type Skill = "listening" | "speaking" | "reading" | "writing";
export type ItemType = "mcq" | "translate" | "shadowing" | "build";
export type Goal = "daily" | "travel" | "work";
export type Level = "PRE_A1" | "A1" | "A2" | "B1";

export const STEPS: { id: StepId; name: string; minutes: number; target: number }[] = [
  { id: "review", name: "복습", minutes: 5, target: 3 },
  { id: "listen_read", name: "듣기·읽기", minutes: 8, target: 4 },
  { id: "speak", name: "말하기", minutes: 8, target: 4 },
  { id: "build", name: "문장 만들기", minutes: 5, target: 3 },
  { id: "wrap", name: "정리", minutes: 4, target: 0 },
];

export const ERROR_TAGS = {
  article: "관사 a/an/the",
  tense: "시제",
  preposition: "전치사",
  plural: "복수형",
  subject_verb: "주어-동사 일치",
  word_order: "어순",
  vocabulary: "어휘 선택",
  spelling: "철자",
  missing_word: "빠진 단어",
  pronunciation: "발음",
  politeness: "공손한 표현",
  comprehension: "내용 이해",
} as const;
export type ErrorTag = keyof typeof ERROR_TAGS;
export const ERROR_TAG_KEYS = Object.keys(ERROR_TAGS) as ErrorTag[];

export interface DialogueLine {
  speaker: "A" | "B";
  en: string;
  ko?: string;
}

/** AI(또는 예비 모드)가 만든 문제 하나 */
export interface Item {
  id: string;
  step: StepId;
  type: ItemType;
  skill: Skill;
  instructionKo: string;
  promptKo?: string;
  promptEn?: string;
  audioText?: string;
  showDialogue?: boolean;
  dialogue?: DialogueLine[];
  choices?: string[];
  answerKey: string;
  acceptable?: string[];
  hint?: string;
  focusTag?: ErrorTag;
  cardId?: string;
  reinforce?: boolean;
}

export interface Evaluation {
  isCorrect: boolean;
  score: number;
  corrected: string;
  explanationKo: string;
  errorTags: ErrorTag[];
  encouragement: string;
}

export interface Skills {
  listening: number;
  speaking: number;
  reading: number;
  writing: number;
}

export interface Learner {
  id: number;
  name: string;
  level: Level;
  goal: Goal;
  dailyMinutes: number;
  koreanRatio: number;
  autoRatio: boolean;
  skills: Skills;
  unitIndex: number;
  difficulty: number;
  memory: string;
  voiceRate: number;
  tone: "coach" | "teacher";
  createdAt: string;
}

export type ChatKind = "text" | "item" | "answer" | "feedback" | "step" | "summary";

export interface ChatMessage {
  id: number;
  role: "teacher" | "learner";
  kind: ChatKind;
  payload: Record<string, unknown>;
}

export interface LessonState {
  step: number;
  stepCounts: number[];
  targets: number[];
  current: Item | null;
  reviewQueue: string[];
  tagCounts: Partial<Record<ErrorTag, number>>;
  reinforceTag?: ErrorTag;
  correct: number;
  wrong: number;
  usedPhrases: number[];
  lastActivity: number;
}

export interface LessonSummary {
  summaryKo: string;
  keyPhrases: { en: string; ko: string }[];
  nextFocus: string;
  memory: string;
}
