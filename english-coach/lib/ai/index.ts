import { geminiProvider } from "./gemini";
import { offlineProvider } from "./offline";
import type { AIProvider } from "./provider";

export function getAI(): AIProvider {
  return process.env.GEMINI_API_KEY ? geminiProvider : offlineProvider;
}
