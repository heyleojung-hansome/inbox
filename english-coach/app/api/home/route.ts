import { handle } from "@/lib/api";
import { homeData } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(homeData);
}
