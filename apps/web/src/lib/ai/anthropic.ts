import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      defaultHeaders: {
        "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
        "Helicone-Property-App": "careeros",
        "Helicone-Property-Provider": "anthropic",
      },
      baseURL: process.env.HELICONE_API_KEY
        ? "https://anthropic.helicone.ai"
        : undefined,
    });
  }
  return _client;
}

export const CLAUDE_MODEL = {
  SONNET: "claude-sonnet-4-6" as const,
  HAIKU: "claude-haiku-4-5-20251001" as const,
} as const;
