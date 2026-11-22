import { z } from "zod";
import { handle } from "@/lib/api";
import { all } from "@/lib/db";
import { addActivity, dueCards, rateCard, type Card } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const filter = new URL(req.url).searchParams.get("filter") ?? "all";
    const due = await dueCards(100);
    const where = ["word", "sentence", "mistake"].includes(filter) ? "WHERE kind = ?" : "";
    const list = await all<Card>(`SELECT * FROM cards ${where} ORDER BY created_at DESC LIMIT 60`, where ? [filter] : []);
    const total = (await all<{ n: number }>("SELECT COUNT(*) AS n FROM cards"))[0]?.n ?? 0;
    return { due, list, total: Number(total) };
  });
}

const Body = z.object({ id: z.number().int(), rating: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]), secs: z.number().min(0).max(300).default(0) });

export async function POST(req: Request) {
  return handle(async () => {
    const b = Body.parse(await req.json());
    await addActivity(b.secs);
    return { card: await rateCard(b.id, b.rating) };
  });
}
