/**
 * CopilotKit LangGraph Adapter
 *
 * Bridges CopilotKit runtime with our LangGraph Deep Agent.
 * Uses CopilotKit's LangChainAdapter with a custom chainFn that
 * invokes the LangGraph agent and returns responses.
 */

import { LangChainAdapter } from '@copilotkit/runtime';
import { AIMessage, SystemMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import type { DynamicStructuredTool } from '@langchain/core/tools';

import { createLegalAgentGraph, type LegalAgentConfig } from './graph';
import { LEGAL_AGENT_SYSTEM_PROMPT } from './harness';

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
 * Configuration for creating the LangGraph adapter
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
 * Create a CopilotKit-compatible adapter that uses our LangGraph agent
 *
 * This adapter:
 * 1. Receives messages from CopilotKit frontend
 * 2. Converts them to LangGraph format
 * 3. Invokes the Deep Agent with full tool access
 * 4. Returns the response to CopilotKit
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
export function createLangGraphAdapter(config: LangGraphAdapterConfig): LangChainAdapter {
  const { userId, conversationId, matterId } = config;

  return new LangChainAdapter({
    chainFn: async (params: ChainFnParameters): Promise<AIMessage> => {
      const { messages, threadId } = params;

      // Use threadId as conversation ID if provided, otherwise use config
      const activeConversationId = threadId || conversationId;

      // Create the agent graph with context
      const agentConfig: LegalAgentConfig = {
        userId,
        conversationId: activeConversationId,
        matterId,
        model: 'claude-sonnet-4-20250514',
        temperature: 0.7,
      };

      const graph = createLegalAgentGraph(agentConfig);

      // Convert CopilotKit messages to include system prompt if not present
      const hasSystemMessage = messages.some((m) => m._getType() === 'system');

      const graphMessages: BaseMessage[] = hasSystemMessage
        ? messages
        : [new SystemMessage(LEGAL_AGENT_SYSTEM_PROMPT), ...messages];

      // Invoke the graph and get final state
      const result = await graph.invoke({
        messages: graphMessages,
        userId,
        conversationId: activeConversationId,
        matterId,
        todos: [],
        memories: {},
        documents: [],
      });

      // Find the last AI message in the result
      const resultMessages = result.messages;
      for (let i = resultMessages.length - 1; i >= 0; i--) {
        const msg = resultMessages[i];
        if (msg instanceof AIMessage) {
          return msg;
        }
      }

      // Fallback: create an AI message from the last message content
      const lastMessage = resultMessages[resultMessages.length - 1];
      const content =
        typeof lastMessage.content === 'string'
          ? lastMessage.content
          : JSON.stringify(lastMessage.content);

      return new AIMessage(content);
    },
  });
}

/**
 * Extract conversation ID from CopilotKit request properties
 */
export function extractConversationId(properties?: Record<string, unknown>): string | undefined {
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
export function extractMatterId(properties?: Record<string, unknown>): string | undefined {
  if (!properties) return undefined;

  if (typeof properties.matterId === 'string') {
    return properties.matterId;
  }

  return undefined;
}
