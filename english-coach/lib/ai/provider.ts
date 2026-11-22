import type { Unit } from "../curriculum";
import type { ErrorTag, Evaluation, Item, ItemType, Learner, LessonSummary, Skill, StepId } from "../types";

export interface GenContext {
  learner: Learner;
  unit: Unit;
  step: StepId;
  type: ItemType;
  skill: Skill;
  index: number;
  reinforceTag?: ErrorTag;
  recentTags: ErrorTag[];
  avoid: string[];
}

export interface SummaryContext {
  learner: Learner;
  unit: Unit;
  attempts: { prompt: string; answer: string; correct: boolean; tags: ErrorTag[] }[];
  correct: number;
  wrong: number;
}

export interface TalkScenario {
  id: string;
  category: "daily" | "travel" | "work";
  title: string;
  roleAi: string;
  roleLearner: string;
  opener: string;
  openerKo: string;
  sample: string;
  script: string[];
}

export interface TalkFeedback {
  type: "grammar" | "expression" | "good";
  original?: string;
  suggestion?: string;
  noteKo: string;
}

export interface TalkTurn {
  reply: string;
  replyKo: string;
  feedback: TalkFeedback[];
  done: boolean;
}

export interface TalkReport {
  summaryKo: string;
  good: string[];
  fixes: { original: string; suggestion: string; noteKo: string }[];
}

export interface TalkContext {
  learner: Learner;
  scenario: TalkScenario;
  history: { role: "ai" | "me"; text: string }[];
  said: string;
}

export interface AIProvider {
  readonly name: "gemini" | "offline";
  generateItem(ctx: GenContext): Promise<Item>;
  evaluate(item: Item, answer: string, learner: Learner): Promise<Evaluation>;
  summarize(ctx: SummaryContext): Promise<LessonSummary>;
  talk(ctx: TalkContext): Promise<TalkTurn>;
  talkReport(ctx: Omit<TalkContext, "said">): Promise<TalkReport>;
}
