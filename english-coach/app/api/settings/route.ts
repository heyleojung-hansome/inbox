import { z } from "zod";
import { handle } from "@/lib/api";
import { requireLearner, saveLearner } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => ({
    learner: await requireLearner(),
    ai: process.env.GEMINI_API_KEY ? { mode: "gemini", model: process.env.GEMINI_MODEL || "gemini-3.8-flash" } : { mode: "offline" },
  }));
}

const Patch = z.object({
  name: z.string().trim().min(1).max(20).optional(),
  goal: z.enum(["daily", "travel", "work"]).optional(),
  dailyMinutes: z.number().int().min(10).max(90).optional(),
  koreanRatio: z.number().min(0.3).max(1).optional(),
  autoRatio: z.boolean().optional(),
  voiceRate: z.number().min(0.6).max(1.4).optional(),
  tone: z.enum(["coach", "teacher"]).optional(),
});

export async function PATCH(req: Request) {
  return handle(async () => {
    const patch = Patch.parse(await req.json());
    const learner = { ...(await requireLearner()), ...patch };
    await saveLearner(learner);
    return { learner };
  });
}
