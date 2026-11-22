import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { getLearner } from "@/lib/repo";
import { all } from "@/lib/db";
import { localDate } from "@/lib/dates";
import { streakFrom } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const learner = await getLearner();
  if (!learner) redirect("/onboarding");
  const done = new Set((await all<{ date: string }>("SELECT DISTINCT date FROM lessons WHERE status = 'completed'")).map((r) => r.date));
  return (
    <Shell voiceRate={learner.voiceRate} streak={streakFrom(done, localDate())}>
      {children}
    </Shell>
  );
}
