import { getLearner } from "@/lib/repo";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const learner = (await getLearner())!;
  const ai = process.env.GEMINI_API_KEY ? `Gemini (${process.env.GEMINI_MODEL || "gemini-3.8-flash"})` : null;
  return <SettingsForm initial={learner} ai={ai} />;
}
