/**
 * CopilotKit CoAgent Integration
 *
 * Creates an AbstractAgent wrapper around the Deep Agent that CopilotKit can use.
 * This enables the full Deep Agent architecture (planning, file system, subagents)
 * to work with CopilotKit's runtime.
 *
 * @see https://docs.langchain.com/oss/javascript/deepagents/overview
 */

import { AbstractAgent, BaseEvent, EventType, RunAgentInput } from '@ag-ui/client';
import { Observable, Subscriber } from 'rxjs';
import { createLegalDeepAgent, type LegalDeepAgentConfig } from './deep-agent';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration for creating the Legal CoAgent
 */
export interface LegalCoAgentConfig {
  /**
   * User ID for scoping tools and data access
   */
  userId: string;

  /**
   * Conversation ID for message persistence
   */
  conversationId?: string;

  /**
   * Optional matter ID for document scoping
   */
  matterId?: string;
}

/**
 * AbstractAgent implementation that wraps the Deep Agent
 *
 * This allows CopilotKit to run the Deep Agent with full capabilities:
 * - Planning (write_todos)
 * - File system tools (ls, read_file, write_file, edit_file)
 * - Subagent spawning (task tool)
 * - Persistent memory (/memories/ path)
 * - Legal tools (search, rerank, classify, risk)
 */
export class LegalCoAgent extends AbstractAgent {
  private agentConfig: LegalCoAgentConfig;

  constructor(config: LegalCoAgentConfig) {
    super({
      agentId: 'orderly-legal-agent',
      description:
        'Orderly Legal AI Assistant - helps with legal research, contract analysis, and document Q&A',
    });
    this.agentConfig = config;
  }

  /**
   * Run the Deep Agent with the given input
   */
  run(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable((subscriber: Subscriber<BaseEvent>) => {
      this.executeAgent(input, subscriber).catch((error) => {
        subscriber.error(error);
      });
    });
  }

  /**
   * Execute the Deep Agent and emit events
   */
  private async executeAgent(
    input: RunAgentInput,
    subscriber: Subscriber<BaseEvent>
  ): Promise<void> {
    const runId = input.runId || uuidv4();
    const threadId = input.threadId || uuidv4();

    try {
      // Create the Deep Agent with context
      const deepAgentConfig: LegalDeepAgentConfig = {
        userId: this.agentConfig.userId,
        conversationId: this.agentConfig.conversationId || threadId,
        matterId: this.agentConfig.matterId,
      };

      const agent = createLegalDeepAgent(deepAgentConfig);

      // Emit run started event
      subscriber.next({
        type: EventType.RUN_STARTED,
        runId,
        threadId,
        timestamp: Date.now(),
      } as BaseEvent);

      // Convert CopilotKit messages to Deep Agent format
      const agentMessages = input.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      }));

      // Generate a unique message ID for the response
      const messageId = uuidv4();

      // Emit text message start
      subscriber.next({
        type: EventType.TEXT_MESSAGE_START,
        messageId,
        role: 'assistant',
        timestamp: Date.now(),
      } as BaseEvent);

      // Stream the Deep Agent response
      const stream = await agent.stream({
        messages: agentMessages,
      });

      let fullContent = '';

      for await (const chunk of stream) {
        // Deep Agent emits various events - extract text content
        if (chunk.messages && chunk.messages.length > 0) {
          const lastMessage = chunk.messages[chunk.messages.length - 1];
          if (lastMessage && typeof lastMessage.content === 'string') {
            const newContent = lastMessage.content.slice(fullContent.length);
            if (newContent) {
              fullContent = lastMessage.content;
              subscriber.next({
                type: EventType.TEXT_MESSAGE_CONTENT,
                messageId,
                delta: newContent,
                timestamp: Date.now(),
              } as BaseEvent);
            }
          }
        }

        // Handle tool calls from the agent
        if (chunk.toolCalls && chunk.toolCalls.length > 0) {
          for (const toolCall of chunk.toolCalls) {
            const toolCallId = toolCall.id || uuidv4();

            subscriber.next({
              type: EventType.TOOL_CALL_START,
              toolCallId,
              toolCallName: toolCall.name,
              timestamp: Date.now(),
            } as BaseEvent);

            subscriber.next({
              type: EventType.TOOL_CALL_ARGS,
              toolCallId,
              delta: JSON.stringify(toolCall.args || {}),
              timestamp: Date.now(),
            } as BaseEvent);

            subscriber.next({
              type: EventType.TOOL_CALL_END,
              toolCallId,
              timestamp: Date.now(),
            } as BaseEvent);
          }
        }
      }

      // Emit text message end
      subscriber.next({
        type: EventType.TEXT_MESSAGE_END,
        messageId,
        timestamp: Date.now(),
      } as BaseEvent);

      // Emit run finished event
      subscriber.next({
        type: EventType.RUN_FINISHED,
        runId,
        threadId,
        timestamp: Date.now(),
      } as BaseEvent);

      subscriber.complete();
    } catch (error) {
      subscriber.next({
        type: EventType.RUN_ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      } as BaseEvent);
      subscriber.error(error);
    }
  }
}

/**
 * Create a factory function for generating LegalCoAgent instances
 * This is used when the config needs to be determined at request time
 */
export function createLegalCoAgentFactory() {
  // Default agent with placeholder config - will be overridden per request
  return new LegalCoAgent({
    userId: 'anonymous',
    conversationId: undefined,
    matterId: undefined,
  });
}

