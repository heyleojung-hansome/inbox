import { handle } from "@/lib/api";
import { statsData } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const range = new URL(req.url).searchParams.get("range") === "month" ? "month" : "week";
  return handle(() => statsData(range));
}
