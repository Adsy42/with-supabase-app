/**
 * CopilotKit LangGraph Adapter
 *
 * Bridges CopilotKit runtime with the LangGraph agent for legal AI assistance.
 * Uses the ChatAnthropic model with bound legal tools to provide:
 * - Document search and analysis
 * - Contract clause classification
 * - Risk assessment
 * - Task planning
 *
 * @see https://docs.copilotkit.ai/reference/classes/llm-adapters/LangChainAdapter
 * @see https://docs.langchain.com/oss/javascript/deepagents/overview
 */

import { LangChainAdapter } from '@copilotkit/runtime';
import type { BaseMessage } from '@langchain/core/messages';
import { SystemMessage } from '@langchain/core/messages';
import { ChatAnthropic } from '@langchain/anthropic';

import { LEGAL_DEEP_AGENT_SYSTEM_PROMPT } from './deep-agent';
import { createLegalTools } from './tools';

/**
 * Parameters passed to the chain function by CopilotKit
 */
interface ChainFnParameters {
  model: string;
  messages: BaseMessage[];
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
 * Prepare messages with system prompt
 */
function prepareMessages(messages: BaseMessage[]): BaseMessage[] {
  const hasSystemMessage = messages.some((m) => m._getType() === 'system');

  if (!hasSystemMessage) {
    return [new SystemMessage(LEGAL_DEEP_AGENT_SYSTEM_PROMPT), ...messages];
  }

  return messages;
}

/**
 * Create a CopilotKit-compatible adapter with legal AI tools
 *
 * This adapter:
 * 1. Receives messages from CopilotKit frontend
 * 2. Uses Claude with bound legal tools (search, rerank, classify, etc.)
 * 3. Streams the response back to CopilotKit
 *
 * The legal tools include:
 * - search_documents: Semantic search through legal documents
 * - rerank_results: Re-score search results for better relevance
 * - extract_answer: Find precise answers in document text
 * - classify_clauses: Identify clause types
 * - analyze_risk: Assess legal risks in contract provisions
 * - write_todos: Create task plans for complex work
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
  return new LangChainAdapter({
    chainFn: async (params: ChainFnParameters) => {
      const { messages } = params;

      // Create the LLM
      const llm = new ChatAnthropic({
        model: 'claude-sonnet-4-20250514',
        temperature: 0.7,
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      // Create legal tools with user context
      const tools = createLegalTools(config.userId, config.conversationId, config.matterId);

      // Bind tools to the model for tool calling
      const modelWithTools = llm.bindTools(tools);

      // Prepare messages with system prompt
      const preparedMessages = prepareMessages(messages);

      // Stream the response - this returns an IterableReadableStream
      const stream = await modelWithTools.stream(preparedMessages);

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
