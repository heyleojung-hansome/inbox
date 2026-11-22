import { z } from "zod";
import { getAI } from "@/lib/ai";
import { handle } from "@/lib/api";
import { all, one, run } from "@/lib/db";
import { addActivity, addAttempt, HttpError, requireLearner, saveLearner, upsertCard } from "@/lib/repo";
import { updateSkill } from "@/lib/engine/adapt";
import { SCENARIOS, scenarioById } from "@/lib/scenarios";
import type { TalkFeedback } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

interface Line {
  role: "ai" | "me";
  text: string;
  ko?: string;
  feedback?: TalkFeedback[];
}

export async function GET() {
  return handle(async () => {
    const recent = await all<{ id: number; scenario: string; created_at: string; report: string | null }>(
      "SELECT id, scenario, created_at, report FROM conversations ORDER BY id DESC LIMIT 5",
    );
    return {
      scenarios: SCENARIOS.map(({ script: _s, ...s }) => s),
      recent: recent.map((r) => ({ id: Number(r.id), scenario: r.scenario, createdAt: r.created_at, ended: !!r.report })),
    };
  });
}

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), scenario: z.string() }),
  z.object({ action: z.literal("say"), id: z.number().int(), text: z.string().trim().min(1).max(400), secs: z.number().min(0).max(300).default(0) }),
  z.object({ action: z.literal("end"), id: z.number().int() }),
]);

async function load(id: number) {
  const row = await one<{ scenario: string; history: string; report: string | null }>("SELECT * FROM conversations WHERE id = ?", [id]);
  if (!row) throw new HttpError(404, "대화를 찾을 수 없어요.");
  const scenario = scenarioById(row.scenario);
  if (!scenario) throw new HttpError(404, "상황을 찾을 수 없어요.");
  return { scenario, history: JSON.parse(row.history) as Line[], report: row.report ? JSON.parse(row.report) : null };
}

export async function POST(req: Request) {
  return handle(async () => {
    const body = Body.parse(await req.json());
    let learner = await requireLearner();

    if (body.action === "start") {
      const scenario = scenarioById(body.scenario);
      if (!scenario) throw new HttpError(404, "상황을 찾을 수 없어요.");
      const history: Line[] = [{ role: "ai", text: scenario.opener, ko: scenario.openerKo }];
      const id = await run("INSERT INTO conversations (scenario, history, created_at) VALUES (?, ?, ?)", [
        scenario.id, JSON.stringify(history), new Date().toISOString(),
      ]);
      return { id, history, done: false };
    }

    const { scenario, history, report } = await load(body.id);
    if (report) throw new HttpError(409, "이미 끝난 대화예요.");

    if (body.action === "say") {
      const turn = await getAI().talk({
        learner, scenario, said: body.text,
        history: history.map((h) => ({ role: h.role, text: h.text })),
      });
      history.push({ role: "me", text: body.text, feedback: turn.feedback });
      history.push({ role: "ai", text: turn.reply, ko: turn.replyKo });
      await run("UPDATE conversations SET history = ? WHERE id = ?", [JSON.stringify(history), body.id]);
      await addActivity(body.secs);
      const hasError = turn.feedback.some((f) => f.type === "grammar");
      const score = hasError ? 60 : turn.feedback.some((f) => f.type === "expression") ? 80 : 100;
      await addAttempt({
        lessonId: null, step: "talk", skill: "speaking", itemType: "talk", prompt: scenario.title, answer: body.text,
        correct: !hasError, score, tags: hasError ? ["vocabulary"] : [],
      });
      learner = { ...learner, skills: updateSkill(learner.skills, "speaking", score) };
      await saveLearner(learner);
      return { history, done: turn.done };
    }

    const result = await getAI().talkReport({ learner, scenario, history: history.map((h) => ({ role: h.role, text: h.text })) });
    const inline = history.flatMap((h) => (h.feedback ?? []).filter((f) => f.type !== "good" && f.original && f.suggestion));
    const fixes = result.fixes.length
      ? result.fixes
      : inline.slice(0, 3).map((f) => ({ original: f.original!, suggestion: f.suggestion!, noteKo: f.noteKo }));
    for (const f of fixes) await upsertCard("mistake", `더 자연스럽게 고쳐 말해보세요: "${f.original}"`, f.suggestion, f.noteKo);
    const full = { ...result, fixes };
    await run("UPDATE conversations SET report = ? WHERE id = ?", [JSON.stringify(full), body.id]);
    return { report: full };
  });
}
