import { NextResponse } from "next/server";
import { all } from "@/lib/db";
import { getLearner } from "@/lib/repo";
import { localDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = {
    exportedAt: new Date().toISOString(),
    learner: await getLearner(),
    lessons: await all("SELECT id, date, unit_index, status, summary, active_secs, started_at, ended_at FROM lessons"),
    attempts: await all("SELECT * FROM attempts"),
    cards: await all("SELECT * FROM cards"),
    conversations: await all("SELECT * FROM conversations"),
    activity: await all("SELECT * FROM activity"),
  };
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="english-coach-${localDate()}.json"`,
    },
  });
}
