/**
 * AI Model Router
 *
 * Provides model selection with:
 * - User choice mode (select specific model)
 * - Auto-optimize mode (analyze query and pick best model for cost/quality)
 */

import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

export type ModelTier = "fast" | "standard" | "powerful";
export type Provider = "openai" | "anthropic";
export type ModelMode = "user_choice" | "auto_optimize";

export interface ModelConfig {
  id: string;
  name: string;
  provider: Provider;
  tier: ModelTier;
  contextWindow: number;
  description: string;
}

// Available models configuration
export const MODELS: Record<string, ModelConfig> = {
  // OpenAI models
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    tier: "fast",
    contextWindow: 128000,
    description: "Fast and efficient for simple tasks",
  },
  "gpt-4o": {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    tier: "standard",
    contextWindow: 128000,
    description: "Balanced performance and quality",
  },
  // Anthropic models
  "claude-3-haiku-20240307": {
    id: "claude-3-haiku-20240307",
    name: "Claude 3 Haiku",
    provider: "anthropic",
    tier: "fast",
    contextWindow: 200000,
    description: "Fast and cost-effective",
  },
  "claude-sonnet-4-20250514": {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    provider: "anthropic",
    tier: "standard",
    contextWindow: 200000,
    description: "Best balance of speed and intelligence",
  },
};

// Models grouped by tier
const MODEL_TIERS: Record<ModelTier, Record<Provider, string>> = {
  fast: {
    openai: "gpt-4o-mini",
    anthropic: "claude-3-haiku-20240307",
  },
  standard: {
    openai: "gpt-4o",
    anthropic: "claude-sonnet-4-20250514",
  },
  powerful: {
    openai: "gpt-4o",
    anthropic: "claude-sonnet-4-20250514",
  },
};

/**
 * Get the model instance for a given model ID
 */
function getModelInstance(modelId: string): LanguageModel {
  const config = MODELS[modelId];

  if (!config) {
    // Default to GPT-4o-mini
    return openai("gpt-4o-mini");
  }

  switch (config.provider) {
    case "anthropic":
      return anthropic(modelId);
    case "openai":
    default:
      return openai(modelId);
  }
}

/**
 * Analyze query complexity to determine appropriate model tier
 */
function analyzeComplexity(prompt?: string): ModelTier {
  if (!prompt) return "standard";

  const lowercasePrompt = prompt.toLowerCase();

  // Simple queries - use fast tier
  const simplePatterns = [
    /^what is/,
    /^define/,
    /^list/,
    /^summarize/,
    /^explain briefly/,
    /simple|quick|short/,
  ];

  if (simplePatterns.some((p) => p.test(lowercasePrompt))) {
    return "fast";
  }

  // Complex queries - use powerful tier
  const complexPatterns = [
    /compare.*contrast/,
    /analyze.*detail/,
    /draft.*contract/,
    /review.*agreement/,
    /legal.*analysis/,
    /multiple.*document/,
    /comprehensive/,
  ];

  if (complexPatterns.some((p) => p.test(lowercasePrompt))) {
    return "powerful";
  }

  return "standard";
}

/**
 * Get the appropriate model based on user preference and mode
 */
export function getModel(
  userPreference: string | null,
  mode: ModelMode = "auto_optimize",
  prompt?: string
): LanguageModel {
  // User choice mode - use the specified model
  if (mode === "user_choice" && userPreference && MODELS[userPreference]) {
    return getModelInstance(userPreference);
  }

  // Auto-optimize mode - analyze prompt and pick best model
  const tier = analyzeComplexity(prompt);

  // Determine preferred provider from user preference or default to OpenAI
  let provider: Provider = "openai";
  if (userPreference?.includes("claude") || userPreference?.includes("anthropic")) {
    provider = "anthropic";
  }

  const modelId = MODEL_TIERS[tier][provider];
  return getModelInstance(modelId);
}

/**
 * Get all available models for UI display
 */
export function getAvailableModels(): ModelConfig[] {
  return Object.values(MODELS);
}

/**
 * Check if a provider is configured
 */
export function isProviderConfigured(provider: Provider): boolean {
  switch (provider) {
    case "openai":
      return !!process.env.OPENAI_API_KEY;
    case "anthropic":
      return !!process.env.ANTHROPIC_API_KEY;
    default:
      return false;
  }
}



