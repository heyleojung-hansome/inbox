import { z } from "zod";
import { handle } from "@/lib/api";
import { submitAnswer } from "@/lib/engine/lesson";

const Body = z.object({
  lessonId: z.number().int(),
  answer: z.string().max(500).default(""),
  skipped: z.boolean().default(false),
});

export async function POST(req: Request) {
  return handle(async () => {
    const b = Body.parse(await req.json());
    return submitAnswer(b.lessonId, b.answer, b.skipped);
  });
}
