import Anthropic from "@anthropic-ai/sdk";
import { isTrialPreviewBlocked } from "@/lib/credits/preview-admission";

let client: Anthropic | null = null;

export function getAnthropic() {
  // Defense in depth for background repair and nested analysis calls. Routes
  // reject generation explicitly; read paths can still return stored content.
  if (isTrialPreviewBlocked()) return null;
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }

  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  return client;
}

export function parseJsonFromText<T>(text: string, fallback: T): T {
  try {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    const json = jsonStart >= 0 && jsonEnd >= 0 ? text.slice(jsonStart, jsonEnd + 1) : text;
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}
