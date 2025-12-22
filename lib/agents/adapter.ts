/**
 * CopilotKit LangChain Adapter
 *
 * Bridges CopilotKit runtime with our legal AI tools.
 *
 * Current Implementation:
 * Uses ChatAnthropic with bound legal tools, which CopilotKit can stream properly.
 *
 * Future Path to Full Deep Agent:
 * The `deepagents` library provides planning, file system, and subagent capabilities.
 * To fully leverage Deep Agents with CopilotKit, you would need:
 * 1. Deploy the Deep Agent to LangGraph Platform
 * 2. Use CopilotKit's `useCoAgent` hook with the deployed agent
 * 3. Or use CopilotKit's `LangGraphAgent` adapter for remote agents
 *
 * @see https://docs.copilotkit.ai/reference/classes/llm-adapters/LangChainAdapter
 * @see https://docs.langchain.com/oss/javascript/deepagents/overview
 */

import { LangChainAdapter } from '@copilotkit/runtime';
import { ChatAnthropic } from '@langchain/anthropic';
import { SystemMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import type { DynamicStructuredTool } from '@langchain/core/tools';

import { createLegalTools } from './tools';
import { LEGAL_DEEP_AGENT_SYSTEM_PROMPT } from './deep-agent';

/**
 * Parameters passed to the chain function by CopilotKit
 */
interface ChainFnParameters {
  model: string;
  messages: BaseMessage[];
  tools: DynamicStructuredTool[];
  threadId?: string;
  runId?: string;
}

/**
 * Configuration for creating the adapter
 */
export interface LangGraphAdapterConfig {
  /**
   * User ID for scoping tools and data access
   */
  userId: string;

  /**
   * Conversation ID for message persistence
   */
  conversationId: string;

  /**
   * Optional matter ID for document scoping
   */
  matterId?: string;
}

/**
 * Create a CopilotKit-compatible adapter using ChatAnthropic with legal tools
 *
 * This adapter:
 * 1. Receives messages from CopilotKit frontend
 * 2. Adds the system prompt if not present
 * 3. Uses ChatAnthropic with bound legal tools
 * 4. Streams the response back to CopilotKit
 *
 * Legal tools included:
 * - Document search (Isaacus embeddings + Supabase vector)
 * - Reranking and extractive QA (Isaacus)
 * - Clause classification and risk analysis (Isaacus)
 * - Task planning (todos) when conversationId is provided
 * - Long-term memory storage
 *
 * @example
 * ```typescript
 * const adapter = createLangGraphAdapter({
 *   userId: user.id,
 *   conversationId: conversationId,
 * });
 *
 * const endpoint = copilotRuntimeNextJSAppRouterEndpoint({
 *   runtime: new CopilotRuntime(),
 *   serviceAdapter: adapter,
 *   endpoint: '/api/copilotkit',
 * });
 * ```
 */
export function createLangGraphAdapter(
  config: LangGraphAdapterConfig
): LangChainAdapter {
  const { userId, conversationId, matterId } = config;

  // Create the model
  const model = new ChatAnthropic({
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Create our legal tools with user context
  // This includes Isaacus-powered search, analysis, and planning tools
  const tools = createLegalTools(userId, conversationId, matterId);

  // Bind tools to the model
  const modelWithTools = model.bindTools(tools);

  return new LangChainAdapter({
    chainFn: async (params: ChainFnParameters) => {
      const { messages } = params;

      // Add system prompt if not present
      const hasSystemMessage = messages.some((m) => m._getType() === 'system');
      const allMessages: BaseMessage[] = hasSystemMessage
        ? messages
        : [new SystemMessage(LEGAL_DEEP_AGENT_SYSTEM_PROMPT), ...messages];

      // Stream the response from the model
      // The LangChainAdapter can handle the stream from ChatAnthropic
      const stream = await modelWithTools.stream(allMessages);

      return stream;
    },
  });
}

/**
 * Extract conversation ID from CopilotKit request properties
 */
export function extractConversationId(
  properties?: Record<string, unknown>
): string | undefined {
  if (!properties) return undefined;

  if (typeof properties.conversationId === 'string') {
    return properties.conversationId;
  }

  if (typeof properties.threadId === 'string') {
    return properties.threadId;
  }

  return undefined;
}

/**
 * Extract matter ID from CopilotKit request properties
 */
export function extractMatterId(
  properties?: Record<string, unknown>
): string | undefined {
  if (!properties) return undefined;

  if (typeof properties.matterId === 'string') {
    return properties.matterId;
  }

  return undefined;
}
