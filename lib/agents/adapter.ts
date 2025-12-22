/**
 * CopilotKit LangGraph Adapter
 *
 * Bridges CopilotKit runtime with the Deep Agent for legal AI assistance.
 *
 * Uses the Deep Agent which provides:
 * - Built-in planning (write_todos)
 * - File system tools for context management
 * - Subagent spawning capability
 * - Our custom Isaacus-powered legal tools
 *
 * @see https://docs.copilotkit.ai/reference/classes/llm-adapters/LangChainAdapter
 * @see https://docs.langchain.com/oss/javascript/deepagents/overview
 */

import { LangChainAdapter } from '@copilotkit/runtime';
import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, SystemMessage } from '@langchain/core/messages';

import { createLegalDeepAgent, LEGAL_DEEP_AGENT_SYSTEM_PROMPT } from './deep-agent';

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
 * Convert CopilotKit messages to the format expected by Deep Agent
 */
function prepareMessages(messages: BaseMessage[]): BaseMessage[] {
  // Check if system message already exists
  const hasSystemMessage = messages.some((m) => m._getType() === 'system');

  // Add system prompt if not present
  if (!hasSystemMessage) {
    return [new SystemMessage(LEGAL_DEEP_AGENT_SYSTEM_PROMPT), ...messages];
  }

  return messages;
}

/**
 * Extract text content from an AIMessage that may have complex content
 */
function extractTextContent(message: AIMessage): string {
  const content = message.content;

  if (typeof content === 'string') {
    return content;
  }

  // Handle array content (e.g., from Anthropic)
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === 'string') {
          return block;
        }
        if (block && typeof block === 'object' && 'text' in block) {
          return (block as { text: string }).text;
        }
        return '';
      })
      .join('');
  }

  return String(content);
}

/**
 * Create a CopilotKit-compatible adapter using the Deep Agent
 *
 * This adapter:
 * 1. Receives messages from CopilotKit frontend
 * 2. Creates a Deep Agent with full capabilities
 * 3. Returns the response to CopilotKit
 *
 * Deep Agent capabilities:
 * - Planning with write_todos
 * - File system tools (ls, read_file, write_file, edit_file)
 * - Subagent spawning with task tool
 * - Legal AI tools (search, rerank, extract, classify, analyze)
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

  return new LangChainAdapter({
    chainFn: async (params: ChainFnParameters) => {
      const { messages, threadId } = params;

      // Create the Deep Agent with user context
      // The Deep Agent includes all capabilities:
      // - write_todos for planning
      // - File system tools
      // - task tool for subagents
      // - Our legal AI tools
      const agent = createLegalDeepAgent({
        userId,
        conversationId,
        matterId,
      });

      // Prepare messages with system prompt
      const preparedMessages = prepareMessages(messages);

      try {
        // Invoke the Deep Agent
        // The agent returns the final state with all messages
        const result = await agent.invoke(
          { messages: preparedMessages },
          {
            configurable: {
              thread_id: threadId || conversationId,
            },
          }
        );

        // Extract the last AI message from the result
        const resultMessages = result.messages as BaseMessage[];
        const lastMessage = resultMessages[resultMessages.length - 1];

        if (lastMessage && lastMessage._getType() === 'ai') {
          const aiMessage = lastMessage as AIMessage;
          const textContent = extractTextContent(aiMessage);

          // Return an AIMessage that CopilotKit can handle
          return new AIMessage({
            content: textContent,
            tool_calls: aiMessage.tool_calls,
          });
        }

        // Fallback if no AI message found
        return new AIMessage({
          content:
            'I apologize, but I was unable to generate a response. Please try again.',
        });
      } catch (error) {
        console.error('Deep Agent error:', error);

        // Return error message
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        return new AIMessage({
          content: `I encountered an error while processing your request: ${errorMessage}. Please try again.`,
        });
      }
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
