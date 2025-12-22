/**
 * LangGraph Agent State Definition
 *
 * Defines the state schema for the Deep Agent using LangGraph Annotations.
 * State flows through the graph and maintains context across tool calls.
 */

import { Annotation, MessagesAnnotation } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';

/**
 * Todo item for agent task planning
 */
export interface AgentTodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  parentId?: string;
  result?: string;
  orderIndex: number;
}

/**
 * Document reference from search results
 */
export interface DocumentReference {
  id: string;
  documentId: string;
  content: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

/**
 * Agent state annotation for LangGraph
 *
 * Extends MessagesAnnotation with additional context:
 * - userId: Scopes tools and data access
 * - conversationId: Links to conversation history
 * - todos: Task planning state
 * - memories: Retrieved long-term memories
 * - documents: Current document context from search
 */
export const AgentState = Annotation.Root({
  // Inherit message handling from LangGraph
  ...MessagesAnnotation.spec,

  /**
   * User ID for scoping data access and tools
   */
  userId: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),

  /**
   * Conversation ID for linking messages and todos
   */
  conversationId: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),

  /**
   * Current task list for multi-step planning
   */
  todos: Annotation<AgentTodoItem[]>({
    reducer: (current, next) => {
      // Merge todos by ID, allowing updates
      const todoMap = new Map(current.map((t) => [t.id, t]));
      for (const todo of next) {
        todoMap.set(todo.id, todo);
      }
      return Array.from(todoMap.values()).sort((a, b) => a.orderIndex - b.orderIndex);
    },
    default: () => [],
  }),

  /**
   * Retrieved long-term memories for context
   */
  memories: Annotation<Record<string, unknown>>({
    reducer: (current, next) => ({ ...current, ...next }),
    default: () => ({}),
  }),

  /**
   * Current document context from search results
   */
  documents: Annotation<DocumentReference[]>({
    reducer: (current, next) => {
      // Deduplicate by ID, prefer newer results
      const docMap = new Map(current.map((d) => [d.id, d]));
      for (const doc of next) {
        docMap.set(doc.id, doc);
      }
      return Array.from(docMap.values());
    },
    default: () => [],
  }),

  /**
   * Matter ID for scoping to specific legal matter
   */
  matterId: Annotation<string | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
});

/**
 * Type for the agent state
 */
export type AgentStateType = typeof AgentState.State;

/**
 * Input type for invoking the agent
 */
export interface AgentInput {
  messages: BaseMessage[];
  userId: string;
  conversationId: string;
  matterId?: string;
}

/**
 * Output type from agent invocation
 */
export interface AgentOutput {
  messages: BaseMessage[];
  todos: AgentTodoItem[];
  documents: DocumentReference[];
}

