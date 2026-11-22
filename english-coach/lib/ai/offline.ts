import { UNITS } from "../curriculum";
import { normalize, similarity, tokens } from "../text";
import type { ErrorTag, Evaluation, Item } from "../types";
import type { AIProvider, GenContext, SummaryContext, TalkContext, TalkReport, TalkTurn } from "./provider";

/**
 * Gemini 키가 없을 때 쓰는 예비 모드.
 * 커리큘럼에 미리 써둔 문제와 규칙 기반 채점으로 동작하므로 비용과 네트워크가 필요 없습니다.
 */

const uid = () => Math.random().toString(36).slice(2, 10);
const ARTICLES = new Set(["a", "an", "the"]);
const PREPS = new Set(["in", "on", "at", "to", "for", "from", "next", "across", "under"]);

function guessTags(answer: string, key: string): ErrorTag[] {
  const a = tokens(answer);
  const k = tokens(key);
  // 문장 자체가 많이 다르면 세부 문법 태그를 붙이지 않습니다 (약점 통계 왜곡 방지)
  if (similarity(answer, key) < 0.5) return ["vocabulary"];
  const missing = k.filter((w) => !a.includes(w));
  const extra = a.filter((w) => !k.includes(w));
  const tags = new Set<ErrorTag>();
  if ([...missing, ...extra].some((w) => ARTICLES.has(w))) tags.add("article");
  if ([...missing, ...extra].some((w) => PREPS.has(w))) tags.add("preposition");
  if (missing.some((w) => /ed$/.test(w) || ["went", "ate", "met", "had", "saw"].includes(w))) tags.add("tense");
  if (extra.some((w) => /^(goed|eated|meeted|haved)$/.test(w))) tags.add("tense");
  if (!tags.size && a.length && k.length && a.join(" ") !== k.join(" ") && new Set(a).size === new Set(k).size && a.every((w) => k.includes(w))) tags.add("word_order");
  if (!tags.size && missing.length) tags.add(missing.length > 2 ? "vocabulary" : "missing_word");
  return [...tags];
}

const TAG_TIPS: Partial<Record<ErrorTag, string>> = {
  article: "셀 수 있는 것 하나를 말할 때는 a/an, 모음 소리로 시작하면 an을 써요.",
  preposition: "위치나 시간을 나타내는 전치사(in, on, at, next to 등)를 확인해 보세요.",
  tense: "지난 일은 과거형으로 말해요. go → went, eat → ate 처럼 불규칙 동사는 따로 외워요.",
  word_order: "영어는 '주어 + 동사 + 나머지' 순서가 기본이에요.",
  missing_word: "빠진 단어가 있어요. 정답 문장과 비교해 보세요.",
  vocabulary: "핵심 단어가 달라요. 정답 문장의 단어를 소리 내어 읽어 보세요.",
};

function pickUnitBuild(tag: ErrorTag | undefined, fallbackIndex: number) {
  const pool = UNITS.filter((u) => tag && u.grammar.tag === tag).flatMap((u) => u.build);
  const all = pool.length ? pool : UNITS.flatMap((u) => u.build);
  return all[fallbackIndex % all.length];
}

export const offlineProvider: AIProvider = {
  name: "offline",

  async generateItem(ctx: GenContext): Promise<Item> {
    const { unit, step, type, skill, index } = ctx;
    if (ctx.reinforceTag) {
      const b = pickUnitBuild(ctx.reinforceTag, index + 1);
      return {
        id: uid(), step, type: "build", skill: "writing", reinforce: true, focusTag: ctx.reinforceTag,
        instructionKo: "비슷한 문제로 한 번 더 연습해요. 영어로 말하거나 써보세요.",
        promptKo: b.ko, answerKey: b.en, acceptable: b.acceptable,
        hint: TAG_TIPS[ctx.reinforceTag],
      };
    }
    if (type === "mcq") {
      const q = unit.questions[index % unit.questions.length];
      const listening = skill === "listening";
      return {
        id: uid(), step, type, skill,
        instructionKo: listening ? "대화를 듣고 질문에 답하세요." : "대화를 읽고 질문에 답하세요.",
        promptEn: q.q,
        dialogue: unit.dialogue,
        showDialogue: !listening,
        audioText: unit.dialogue.map((l) => l.en).join(" "),
        choices: q.choices, answerKey: q.answer,
        hint: listening ? "대화를 한 번 더 들어보세요." : undefined,
      };
    }
    const b = unit.build[index % unit.build.length];
    return {
      id: uid(), step, type: "build", skill: "writing",
      instructionKo: `배운 표현을 응용해 영어로 써보세요.`,
      promptKo: b.ko, answerKey: b.en, acceptable: b.acceptable,
      hint: `이번 단원의 핵심 문장: ${unit.keySentence}`,
    };
  },

  async evaluate(item: Item, answer: string): Promise<Evaluation> {
    const candidates = [item.answerKey, ...(item.acceptable ?? [])];
    const best = candidates
      .map((c) => ({ c, s: similarity(answer, c) }))
      .sort((x, y) => y.s - x.s)[0];
    const exact = candidates.some((c) => normalize(c) === normalize(answer));
    const threshold = item.type === "shadowing" ? 0.8 : 1;
    const ok = exact || best.s >= threshold;
    const score = exact ? 100 : Math.round(best.s * 100);
    if (ok) {
      return {
        isCorrect: true, score, corrected: exact ? answer : best.c, errorTags: [],
        explanationKo: item.type === "shadowing" && !exact ? "거의 정확하게 따라 말했어요. 음성 인식이 조금 다르게 들었을 수 있어요." : "정확해요!",
        encouragement: "좋아요, 이 흐름 그대로 가요!",
      };
    }
    const tags = item.type === "shadowing" ? (["pronunciation"] as ErrorTag[]) : guessTags(answer, best.c);
    const tip = tags.map((t) => TAG_TIPS[t]).filter(Boolean)[0];
    return {
      isCorrect: false, score, corrected: best.c, errorTags: tags,
      explanationKo: item.type === "shadowing"
        ? "몇 단어가 다르게 인식됐어요. 천천히 또박또박 다시 말해 보세요."
        : (tip ?? "정답 문장과 비교해서 다른 부분을 확인해 보세요."),
      encouragement: score >= 70 ? "거의 맞았어요!" : "괜찮아요, 틀리면서 배우는 거예요.",
    };
  },

  async summarize(ctx: SummaryContext) {
    const total = ctx.correct + ctx.wrong;
    const acc = total ? Math.round((ctx.correct / total) * 100) : 0;
    const tagCount = new Map<ErrorTag, number>();
    ctx.attempts.forEach((a) => a.tags.forEach((t) => tagCount.set(t, (tagCount.get(t) ?? 0) + 1)));
    const top = [...tagCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const focus = top ? `다음 수업에서는 ${tagLabel(top)} 부분을 조금 더 연습해요.` : "다음 단원으로 넘어갈 준비가 됐어요.";
    return {
      summaryKo: `오늘 '${ctx.unit.title}' 수업에서 ${total}문제 중 ${ctx.correct}문제를 맞혔어요 (정답률 ${acc}%).`,
      keyPhrases: ctx.unit.phrases.map((p) => ({ en: p.en, ko: p.ko })),
      nextFocus: focus,
      memory: `${ctx.learner.memory ? ctx.learner.memory.split("\n").slice(-3).join("\n") + "\n" : ""}${ctx.unit.title}: 정답률 ${acc}%${top ? `, 자주 틀린 것 ${tagLabel(top)}` : ""}`,
    };
  },

  async talk(ctx: TalkContext): Promise<TalkTurn> {
    const turn = ctx.history.filter((h) => h.role === "me").length; // 방금 말한 것 포함 전 횟수
    const line = ctx.scenario.script[Math.min(turn, ctx.scenario.script.length - 1)];
    const feedback: TalkTurn["feedback"] = [];
    const said = ctx.said.trim();
    if (/\bi\b/.test(said)) feedback.push({ type: "grammar", original: "i", suggestion: "I", noteKo: "'나'를 뜻하는 I는 항상 대문자로 써요." });
    const m = said.match(/\b(have|get|want|need) (reservation|table|latte|coffee|ticket|room|question)\b/i);
    if (m) feedback.push({ type: "grammar", original: m[0], suggestion: `${m[1]} a ${m[2]}`, noteKo: "셀 수 있는 것 하나를 말할 때는 a를 붙여요." });
    if (/\bi want\b/i.test(said)) feedback.push({ type: "expression", original: "I want", suggestion: "I'd like", noteKo: "I'd like가 더 공손하게 들려요." });
    if (!feedback.length && tokens(said).length >= 3) feedback.push({ type: "good", noteKo: "자연스럽게 잘 말했어요!" });
    return { reply: line, replyKo: "", feedback, done: turn >= ctx.scenario.script.length };
  },

  async talkReport(ctx): Promise<TalkReport> {
    const mine = ctx.history.filter((h) => h.role === "me").map((h) => h.text);
    const good = mine.filter((t) => tokens(t).length >= 3).slice(0, 3);
    return {
      summaryKo: `${ctx.scenario.title} 대화에서 ${mine.length}번 말했어요. 끝까지 대화를 이어간 것 자체가 큰 연습이에요.`,
      good,
      fixes: [],
    };
  },
};

function tagLabel(t: string) {
  const map: Record<string, string> = { article: "관사", preposition: "전치사", tense: "시제", word_order: "어순", missing_word: "빠진 단어", vocabulary: "어휘", pronunciation: "발음" };
  return map[t] ?? t;
}
