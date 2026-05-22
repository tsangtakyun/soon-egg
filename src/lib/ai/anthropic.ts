import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropic() {
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
