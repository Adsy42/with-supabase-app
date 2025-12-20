/**
 * AI Model Router
 * Selects appropriate model based on user preference or auto-optimization
 *
 * Supports:
 * - OpenAI: gpt-4o-mini, gpt-4o, gpt-4-turbo
 * - Anthropic: claude-3-5-haiku, claude-3-5-sonnet, claude-3-opus
 */

import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

// Model configuration with metadata
interface ModelConfig {
  id: string;
  provider: "openai" | "anthropic";
  tier: "fast" | "standard" | "powerful";
  contextWindow: number;
  description: string;
}

// Available models
export const MODELS: Record<string, ModelConfig> = {
  // OpenAI models
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    provider: "openai",
    tier: "fast",
    contextWindow: 128000,
    description: "Fast, cost-effective for simple tasks",
  },
  "gpt-4o": {
    id: "gpt-4o",
    provider: "openai",
    tier: "standard",
    contextWindow: 128000,
    description: "Balanced performance and cost",
  },
  "gpt-4-turbo": {
    id: "gpt-4-turbo",
    provider: "openai",
    tier: "powerful",
    contextWindow: 128000,
    description: "Most capable OpenAI model",
  },

  // Anthropic models
  "claude-3-5-haiku-latest": {
    id: "claude-3-5-haiku-latest",
    provider: "anthropic",
    tier: "fast",
    contextWindow: 200000,
    description: "Fast, efficient for simple tasks",
  },
  "claude-3-5-sonnet-latest": {
    id: "claude-3-5-sonnet-latest",
    provider: "anthropic",
    tier: "standard",
    contextWindow: 200000,
    description: "Balanced intelligence and speed",
  },
  "claude-3-opus-latest": {
    id: "claude-3-opus-latest",
    provider: "anthropic",
    tier: "powerful",
    contextWindow: 200000,
    description: "Most capable Anthropic model",
  },
};

// Model tiers for auto-optimization
const MODEL_TIERS: Record<"fast" | "standard" | "powerful", string[]> = {
  fast: ["gpt-4o-mini", "claude-3-5-haiku-latest"],
  standard: ["gpt-4o", "claude-3-5-sonnet-latest"],
  powerful: ["gpt-4-turbo", "claude-3-opus-latest"],
};

// Default models per tier (prefer OpenAI for availability)
// Can be used for future model selection features
export const DEFAULT_MODELS: Record<"fast" | "standard" | "powerful", string> = {
  fast: "gpt-4o-mini",
  standard: "gpt-4o",
  powerful: "gpt-4-turbo",
};

export type ModelMode = "auto_optimize" | "user_choice";
export type ModelTier = "fast" | "standard" | "powerful";

/**
 * Check if a provider is configured
 */
export function isProviderConfigured(provider: "openai" | "anthropic"): boolean {
  if (provider === "openai") {
    return !!process.env.OPENAI_API_KEY;
  }
  if (provider === "anthropic") {
    return !!process.env.ANTHROPIC_API_KEY;
  }
  return false;
}

/**
 * Get available models (only those with configured API keys)
 */
export function getAvailableModels(): ModelConfig[] {
  return Object.values(MODELS).filter((model) =>
    isProviderConfigured(model.provider)
  );
}

/**
 * Analyze prompt complexity to determine appropriate tier
 */
function analyzeComplexity(prompt: string): ModelTier {
  const wordCount = prompt.split(/\s+/).length;
  const hasLegalTerms = /\b(contract|agreement|clause|liability|indemnity|jurisdiction|statute|precedent|tort|negligence)\b/i.test(prompt);
  const hasAnalysisRequest = /\b(analyze|compare|evaluate|assess|review|examine|consider)\b/i.test(prompt);
  const hasDraftingRequest = /\b(draft|write|compose|prepare|create)\b/i.test(prompt);

  // Complex legal analysis or long documents need powerful models
  if ((hasLegalTerms && hasAnalysisRequest) || wordCount > 500) {
    return "powerful";
  }

  // Drafting or moderate complexity needs standard models
  if (hasDraftingRequest || (hasLegalTerms && wordCount > 100)) {
    return "standard";
  }

  // Simple questions use fast models
  return "fast";
}

/**
 * Get the appropriate model based on preference and mode
 */
export function getModel(
  userPreference: string | null,
  mode: ModelMode = "auto_optimize",
  prompt?: string
): LanguageModel {
  // User selected a specific model
  if (mode === "user_choice" && userPreference && MODELS[userPreference]) {
    const config = MODELS[userPreference];

    // Verify the provider is configured
    if (!isProviderConfigured(config.provider)) {
      throw new Error(
        `${config.provider} API key not configured for model ${userPreference}`
      );
    }

    return getLanguageModel(config.id, config.provider);
  }

  // Auto-optimize: select model based on prompt complexity
  const tier = prompt ? analyzeComplexity(prompt) : "standard";

  // Find first available model in the tier
  const tierModels = MODEL_TIERS[tier];
  for (const modelId of tierModels) {
    const config = MODELS[modelId];
    if (isProviderConfigured(config.provider)) {
      return getLanguageModel(config.id, config.provider);
    }
  }

  // Fallback: try any available model
  const available = getAvailableModels();
  if (available.length === 0) {
    throw new Error(
      "No AI providers configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY."
    );
  }

  const fallback = available[0];
  return getLanguageModel(fallback.id, fallback.provider);
}

/**
 * Get the LanguageModel instance for a specific model
 */
function getLanguageModel(
  modelId: string,
  provider: "openai" | "anthropic"
): LanguageModel {
  if (provider === "openai") {
    return openai(modelId);
  }
  if (provider === "anthropic") {
    return anthropic(modelId);
  }
  throw new Error(`Unknown provider: ${provider}`);
}

/**
 * Get model configuration by ID
 */
export function getModelConfig(modelId: string): ModelConfig | undefined {
  return MODELS[modelId];
}

