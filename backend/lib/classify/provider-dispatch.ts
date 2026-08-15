import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

export type LlmProvider = "openai" | "gemini" | "anthropic";

export function resolveProvider(provider: LlmProvider | null): LlmProvider {
  if (provider === "openai" || provider === "gemini" || provider === "anthropic") {
    return provider;
  }
  return "anthropic";
}

export function buildModelForProvider(provider: LlmProvider, api_key: string) {
  if (provider === "openai") {
    const openai = createOpenAI({ apiKey: api_key });
    return openai(process.env.OPENAI_MODEL ?? "gpt-4.1-mini");
  }

  if (provider === "gemini") {
    const google = createGoogleGenerativeAI({ apiKey: api_key });
    return google(process.env.GEMINI_MODEL ?? "gemini-2.5-flash");
  }

  const anthropic = createAnthropic({ apiKey: api_key });
  return anthropic(process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5");
}
