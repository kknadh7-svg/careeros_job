import type OpenAI from "openai";
import { getOpenAIClient, MODEL } from "./openai";
import { getAnthropicClient, CLAUDE_MODEL } from "./anthropic";
import { logger } from "@/lib/logger";

export interface CascadeOptions {
  maxRetries?: number;
  timeoutMs?: number;
  feature?: string;
  userId?: string;
}

export interface CascadeResult {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  provider: "openai" | "anthropic" | "groq";
}

/**
 * Calls AI models in cascade: GPT-4o → Claude Sonnet → Groq Llama3
 * Falls back to next provider on error or timeout.
 */
export async function cascadeCompletion(
  messages: Array<{ role: "user" | "system" | "assistant"; content: string }>,
  options: CascadeOptions = {}
): Promise<CascadeResult> {
  const { feature = "unknown", userId } = options;

  const allProviders = [
    { name: "openai" as const, fn: () => callOpenAI(messages), key: process.env.OPENAI_API_KEY },
    { name: "anthropic" as const, fn: () => callAnthropic(messages), key: process.env.ANTHROPIC_API_KEY },
    { name: "groq" as const, fn: () => callGroq(messages), key: process.env.GROQ_API_KEY },
  ];

  const available = allProviders.filter((p) => !!p.key);
  if (available.length === 0) throw new Error("No AI providers configured — set at least OPENAI_API_KEY");

  const providers = available.map((p) => p.fn);
  const providerNames = available.map((p) => p.name);

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    const providerName = providerNames[i];
    if (!provider) continue;

    try {
      const result = await Promise.race([
        provider(),
        timeout(options.timeoutMs ?? 30_000),
      ]);

      logger.info({
        msg: "AI cascade success",
        provider: providerName,
        feature,
        userId,
        model: (result as CascadeResult).model,
      });

      return result as CascadeResult;
    } catch (err) {
      logger.warn({
        msg: `AI provider ${providerName} failed`,
        provider: providerName,
        feature,
        userId,
        error: err instanceof Error ? err.message : String(err),
        attemptIndex: i,
      });

      if (i === providers.length - 1) {
        throw new Error(
          `All AI providers failed for feature: ${feature}. Last error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  throw new Error("Unreachable");
}

async function callOpenAI(
  messages: Array<{ role: "user" | "system" | "assistant"; content: string }>
): Promise<CascadeResult> {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: MODEL.GPT4O,
    messages: messages as OpenAI.ChatCompletionMessageParam[],
    temperature: 0.7,
  });

  const choice = response.choices[0];
  if (!choice?.message.content) throw new Error("OpenAI returned empty content");

  return {
    content: choice.message.content,
    model: MODEL.GPT4O,
    promptTokens: response.usage?.prompt_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
    provider: "openai",
  };
}

async function callAnthropic(
  messages: Array<{ role: "user" | "system" | "assistant"; content: string }>
): Promise<CascadeResult> {
  const client = getAnthropicClient();

  const systemMessage = messages.find((m) => m.role === "system")?.content;
  const userMessages = messages.filter((m) => m.role !== "system");

  const response = await client.messages.create({
    model: CLAUDE_MODEL.SONNET,
    max_tokens: 4096,
    system: systemMessage,
    messages: userMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  const content = response.content[0];
  if (content?.type !== "text") throw new Error("Anthropic returned non-text content");

  return {
    content: content.text,
    model: CLAUDE_MODEL.SONNET,
    promptTokens: response.usage.input_tokens,
    completionTokens: response.usage.output_tokens,
    provider: "anthropic",
  };
}

async function callGroq(
  messages: Array<{ role: "user" | "system" | "assistant"; content: string }>
): Promise<CascadeResult> {
  const { default: Groq } = await import("groq-sdk");
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages,
    temperature: 0.7,
    max_tokens: 4096,
  });

  const choice = response.choices[0];
  if (!choice?.message.content) throw new Error("Groq returned empty content");

  return {
    content: choice.message.content,
    model: "llama-3.3-70b-versatile",
    promptTokens: response.usage?.prompt_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
    provider: "groq",
  };
}

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`AI request timed out after ${ms}ms`)), ms)
  );
}
