/**
 * LangGraph Deep Agent Definition
 *
 * Creates a StateGraph-based agent with:
 * - Agent node for LLM reasoning
 * - Tool node for executing tools
 * - Conditional routing based on tool calls
 *
 * @see https://docs.langchain.com/oss/javascript/langgraph
 */

import { StateGraph, END } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ChatAnthropic } from '@langchain/anthropic';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';

import { AgentState, type AgentInput, type AgentOutput } from './state';
import { createLegalTools } from './tools';
import { LEGAL_AGENT_SYSTEM_PROMPT } from './harness';

/**
 * Configuration for creating the legal agent graph
 */
export interface LegalAgentConfig {
  /**
   * User ID for scoping tools and data access
   */
  userId: string;

  /**
   * Conversation ID for message and todo persistence
   */
  conversationId: string;

  /**
   * Optional matter ID to scope document searches
   */
  matterId?: string;

  /**
   * Model to use (default: claude-sonnet-4-20250514)
   */
  model?: string;

  /**
   * Maximum number of tool execution steps
   */
  maxSteps?: number;

  /**
   * Temperature for model responses (default: 0.7)
   */
  temperature?: number;
}

/**
 * Determine if the agent should continue to tools or end
 */
function shouldContinue(state: typeof AgentState.State): 'tools' | typeof END {
  const lastMessage = state.messages[state.messages.length - 1];

  // Check if the last message has tool calls
  if (
    lastMessage &&
    'tool_calls' in lastMessage &&
    Array.isArray(lastMessage.tool_calls) &&
    lastMessage.tool_calls.length > 0
  ) {
    return 'tools';
  }

  return END;
}

/**
 * Create a compiled LangGraph agent for legal AI
 *
 * @example
 * ```typescript
 * const graph = createLegalAgentGraph({
 *   userId: user.id,
 *   conversationId: conversation.id,
 * });
 *
 * const result = await graph.invoke({
 *   messages: [new HumanMessage("Find indemnification clauses")],
 *   userId: user.id,
 *   conversationId: conversation.id,
 * });
 * ```
 */
export function createLegalAgentGraph(config: LegalAgentConfig) {
  const {
    userId,
    conversationId,
    matterId,
    model = 'claude-sonnet-4-20250514',
    temperature = 0.7,
  } = config;

  // Create the model
  const llm = new ChatAnthropic({
    model,
    temperature,
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Create tools with user context
  const tools = createLegalTools(userId, conversationId, matterId);

  // Bind tools to the model
  const modelWithTools = llm.bindTools(tools);

  // Agent node: runs the LLM with tools
  async function agentNode(
    state: typeof AgentState.State
  ): Promise<Partial<typeof AgentState.State>> {
    // Build messages with system prompt
    const systemMessage = new SystemMessage(LEGAL_AGENT_SYSTEM_PROMPT);
    const allMessages = [systemMessage, ...state.messages];

    // Invoke the model
    const response = await modelWithTools.invoke(allMessages);

    // Return updated state
    return {
      messages: [response],
    };
  }

  // Build the graph
  const graph = new StateGraph(AgentState)
    // Add the agent node
    .addNode('agent', agentNode)
    // Add the tool node
    .addNode('tools', new ToolNode(tools))
    // Set entry point
    .addEdge('__start__', 'agent')
    // Add conditional edge from agent
    .addConditionalEdges('agent', shouldContinue, {
      tools: 'tools',
      [END]: END,
    })
    // Tools always return to agent
    .addEdge('tools', 'agent');

  // Compile and return
  return graph.compile();
}

/**
 * Type for the compiled graph
 */
export type LegalAgentGraph = ReturnType<typeof createLegalAgentGraph>;

/**
 * Invoke the legal agent with a message
 */
export async function invokeLegalAgent(
  config: LegalAgentConfig,
  input: AgentInput
): Promise<AgentOutput> {
  const graph = createLegalAgentGraph(config);

  const result = await graph.invoke({
    messages: input.messages,
    userId: input.userId,
    conversationId: input.conversationId,
    matterId: input.matterId,
    todos: [],
    memories: {},
    documents: [],
  });

  return {
    messages: result.messages,
    todos: result.todos,
    documents: result.documents,
  };
}

/**
 * Stream the legal agent's response
 */
export async function* streamLegalAgent(
  config: LegalAgentConfig,
  input: AgentInput
): AsyncGenerator<{
  type: 'message' | 'tool_call' | 'tool_result' | 'done';
  content: unknown;
}> {
  const graph = createLegalAgentGraph(config);

  const stream = await graph.stream(
    {
      messages: input.messages,
      userId: input.userId,
      conversationId: input.conversationId,
      matterId: input.matterId,
      todos: [],
      memories: {},
      documents: [],
    },
    {
      streamMode: 'values',
    }
  );

  for await (const chunk of stream) {
    const lastMessage = chunk.messages[chunk.messages.length - 1] as BaseMessage;

    if (!lastMessage) continue;

    // Check message type
    if (lastMessage instanceof AIMessage) {
      // Check for tool calls
      if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
        for (const toolCall of lastMessage.tool_calls) {
          yield {
            type: 'tool_call',
            content: {
              name: toolCall.name,
              args: toolCall.args,
              id: toolCall.id,
            },
          };
        }
      } else if (lastMessage.content) {
        yield {
          type: 'message',
          content: lastMessage.content,
        };
      }
    } else if (lastMessage._getType() === 'tool') {
      yield {
        type: 'tool_result',
        content: lastMessage.content,
      };
    }
  }

  yield { type: 'done', content: null };
}

/**
 * Create an agent with message history support
 */
export async function createAgentWithHistory(
  config: LegalAgentConfig,
  previousMessages: BaseMessage[]
): Promise<{
  sendMessage: (content: string) => Promise<AgentOutput>;
  streamMessage: (content: string) => AsyncGenerator<{
    type: 'message' | 'tool_call' | 'tool_result' | 'done';
    content: unknown;
  }>;
}> {
  const messageHistory = [...previousMessages];

  return {
    async sendMessage(content: string): Promise<AgentOutput> {
      const userMessage = new HumanMessage(content);
      messageHistory.push(userMessage);

      const result = await invokeLegalAgent(config, {
        messages: messageHistory,
        userId: config.userId,
        conversationId: config.conversationId,
        matterId: config.matterId,
      });

      // Add assistant response to history
      messageHistory.push(...result.messages);

      return result;
    },

    async *streamMessage(content: string) {
      const userMessage = new HumanMessage(content);
      messageHistory.push(userMessage);

      const generator = streamLegalAgent(config, {
        messages: messageHistory,
        userId: config.userId,
        conversationId: config.conversationId,
        matterId: config.matterId,
      });

      let lastAssistantMessage: AIMessage | null = null;

      for await (const chunk of generator) {
        yield chunk;

        if (chunk.type === 'message' && typeof chunk.content === 'string') {
          lastAssistantMessage = new AIMessage(chunk.content);
        }
      }

      // Add final assistant message to history
      if (lastAssistantMessage) {
        messageHistory.push(lastAssistantMessage);
      }
    },
  };
}

