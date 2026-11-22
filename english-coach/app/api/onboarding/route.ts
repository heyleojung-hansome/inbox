import { z } from "zod";
import { handle } from "@/lib/api";
import { DIAGNOSTIC, scoreDiagnostic } from "@/lib/diagnostic";
import { getLearner, saveLearner } from "@/lib/repo";
import type { Learner } from "@/lib/types";

export async function GET() {
  return handle(async () => ({
    done: !!(await getLearner()),
    items: DIAGNOSTIC.map(({ answer: _a, ...rest }) => rest),
  }));
}

const Body = z.object({
  name: z.string().trim().min(1).max(20),
  goal: z.enum(["daily", "travel", "work"]),
  dailyMinutes: z.number().int().min(10).max(90),
  answers: z.record(z.string(), z.string()),
});

export async function POST(req: Request) {
  return handle(async () => {
    const body = Body.parse(await req.json());
    const result = scoreDiagnostic(body.answers);
    const prev = await getLearner();
    const learner: Learner = {
      id: 1,
      name: body.name,
      goal: body.goal,
      dailyMinutes: body.dailyMinutes,
      level: result.level,
      skills: result.skills,
      unitIndex: prev ? Math.max(prev.unitIndex, result.unitIndex) : result.unitIndex,
      difficulty: { PRE_A1: 1, A1: 2, A2: 3, B1: 4 }[result.level],
      koreanRatio: prev?.koreanRatio ?? (result.level === "B1" ? 0.6 : 0.8),
      autoRatio: prev?.autoRatio ?? true,
      memory: prev?.memory ?? "",
      voiceRate: prev?.voiceRate ?? 0.9,
      tone: prev?.tone ?? "coach",
      createdAt: prev?.createdAt ?? new Date().toISOString(),
    };
    await saveLearner(learner);
    return { level: result.level, correct: result.correct, total: DIAGNOSTIC.length, skills: result.skills };
  });
}
