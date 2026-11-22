import { handle } from "@/lib/api";
import { startToday } from "@/lib/engine/lesson";

export async function POST() {
  return handle(startToday);
}
