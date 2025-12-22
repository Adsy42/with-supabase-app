/**
 * Deep Agent Harness
 *
 * Main orchestrator for the legal AI assistant using Deep Agents architecture.
 * Implements planning, subagent delegation, and persistent memory.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { SupabaseStore, SupabaseTodoStore } from './stores/supabase-store';
import {
  createSearchDocumentsTool,
  createGetDocumentInfoTool,
  createListDocumentsTool,
} from './tools/search';
import {
  rerankResultsTool,
  extractAnswerTool,
  classifyClausesTool,
  analyzeRiskTool,
} from './tools/isaacus';

/**
 * Main system prompt for the legal AI assistant
 */
export const LEGAL_AGENT_SYSTEM_PROMPT = `You are Orderly, an advanced legal AI assistant designed for Finnish legal professionals. You help with:

- **Legal Research**: Finding and analyzing relevant legal documents
- **Contract Analysis**: Reviewing agreements, identifying risks, classifying clauses
- **Document Q&A**: Answering specific questions from uploaded documents
- **Task Planning**: Breaking complex legal tasks into manageable steps

## Your Capabilities

You have access to specialized tools for:
1. **Searching documents** - Find relevant content using semantic search
2. **Reranking results** - Improve relevance of search results
3. **Extracting answers** - Find precise answers in document text
4. **Classifying clauses** - Identify clause types in contracts
5. **Analyzing risk** - Assess legal risks in provisions
6. **Planning tasks** - Break down complex research into steps

## For Complex Tasks

When facing a complex legal question:
1. Use the write_todos tool to plan your approach
2. Execute each step methodically
3. Delegate to specialized subagents when appropriate:
   - **legal-research**: For deep research across multiple documents
   - **contract-analysis**: For detailed contract review
   - **document-qa**: For precise question answering

## Response Guidelines

- Be precise and accurate - legal work requires exactness
- Always cite your sources with document names
- Acknowledge uncertainty when information is incomplete
- Use proper legal terminology
- Consider Finnish legal context when relevant
- Format responses clearly with headings and bullet points

## Important Notes

- You can only access documents the user has uploaded
- Always verify information against the source documents
- Don't make up legal information not in the documents
- Suggest consulting a lawyer for final legal decisions`;

/**
 * Create write todos tool for task planning
 */
export function createWriteTodosTool(conversationId: string) {
  return tool({
    description: `Create a task plan for complex legal work.
Use this when you need to break down a complex question into steps.
Creates tracked todo items that you can complete one by one.`,

    inputSchema: z.object({
      todos: z
        .array(
          z.object({
            content: z.string().describe('Description of the task'),
            parentId: z
              .string()
              .optional()
              .describe('ID of parent todo for subtasks'),
          })
        )
        .describe('List of todo items to create'),
    }),

    execute: async ({ todos }) => {
      if (!conversationId) {
        return { error: 'No conversation context', todos: [] };
      }

      try {
        const todoStore = new SupabaseTodoStore(conversationId);
        const created = [];

        for (const todo of todos) {
          const item = await todoStore.add(todo.content, todo.parentId);
          created.push({
            id: item.id,
            content: item.content,
            status: item.status,
          });
        }

        return {
          message: `Created ${created.length} task(s)`,
          todos: created,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { error: `Failed to create todos: ${message}`, todos: [] };
      }
    },
  });
}

/**
 * Create update todo status tool
 */
export function createUpdateTodoTool(conversationId: string) {
  return tool({
    description: `Update the status of a task in your plan.
Use this to mark tasks as in_progress, completed, or cancelled.`,

    inputSchema: z.object({
      todoId: z.string().describe('The ID of the todo to update'),
      status: z
        .enum(['pending', 'in_progress', 'completed', 'cancelled'])
        .describe('New status for the todo'),
      result: z.string().optional().describe('Result or notes for completed tasks'),
    }),

    execute: async ({ todoId, status, result }) => {
      if (!conversationId) {
        return { error: 'No conversation context' };
      }

      try {
        const todoStore = new SupabaseTodoStore(conversationId);
        await todoStore.updateStatus(todoId, status, result);

        return {
          message: `Updated task ${todoId} to ${status}`,
          todoId,
          status,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { error: `Failed to update todo: ${message}` };
      }
    },
  });
}

/**
 * Create get current todos tool
 */
export function createGetTodosTool(conversationId: string) {
  return tool({
    description: `Get the current task plan and progress.
Use this to see what tasks are pending or in progress.`,

    inputSchema: z.object({
      includeCompleted: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include completed tasks'),
    }),

    execute: async ({ includeCompleted }) => {
      if (!conversationId) {
        return { error: 'No conversation context', todos: [] };
      }

      try {
        const todoStore = new SupabaseTodoStore(conversationId);
        const todos = includeCompleted
          ? await todoStore.getAll()
          : await todoStore.getPending();

        return {
          count: todos.length,
          todos: todos.map((t) => ({
            id: t.id,
            content: t.content,
            status: t.status,
            result: t.result,
          })),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { error: `Failed to get todos: ${message}`, todos: [] };
      }
    },
  });
}

/**
 * Delegate to subagent tool
 */
export const delegateTaskTool = tool({
  description: `Delegate a specialized task to a subagent.
Use this when you need deep expertise in a specific area:
- legal-research: For comprehensive research across documents
- contract-analysis: For detailed contract review and risk assessment
- document-qa: For precise question answering with citations`,

  inputSchema: z.object({
    subagent: z
      .enum(['legal-research', 'contract-analysis', 'document-qa'])
      .describe('Which specialized agent to use'),
    task: z.string().describe('The task or question for the subagent'),
    context: z
      .string()
      .optional()
      .describe('Additional context to provide to the subagent'),
  }),

  execute: async ({ subagent, task, context }) => {
    // In a full implementation, this would spawn a subagent
    return {
      message: `Task delegated to ${subagent}`,
      subagent,
      task,
      context,
      note: 'Subagent delegation will be fully implemented in the next iteration',
    };
  },
});

/**
 * Create store memory tool
 */
export function createStoreMemoryTool(userId: string) {
  return tool({
    description: `Store information for future reference.
Use this to remember important details, preferences, or learned patterns.`,

    inputSchema: z.object({
      key: z.string().describe('Unique key to store the memory under'),
      value: z.unknown().describe('The information to store'),
      namespace: z
        .string()
        .optional()
        .default('default')
        .describe('Category for the memory'),
    }),

    execute: async ({ key, value, namespace }) => {
      try {
        const store = new SupabaseStore({ userId });
        await store.set(key, value, namespace);

        return {
          message: `Stored memory: ${key}`,
          key,
          namespace,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { error: `Failed to store memory: ${message}` };
      }
    },
  });
}

/**
 * Create recall memory tool
 */
export function createRecallMemoryTool(userId: string) {
  return tool({
    description: `Recall previously stored information.
Use this to retrieve memories, preferences, or context from past conversations.`,

    inputSchema: z.object({
      key: z.string().describe('The key to recall'),
      namespace: z
        .string()
        .optional()
        .default('default')
        .describe('Category to search in'),
    }),

    execute: async ({ key, namespace }) => {
      try {
        const store = new SupabaseStore({ userId });
        const value = await store.get(key, namespace);

        if (value === null) {
          return {
            message: `No memory found for key: ${key}`,
            key,
            value: null,
          };
        }

        return {
          message: `Recalled memory: ${key}`,
          key,
          value,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { error: `Failed to recall memory: ${message}`, value: null };
      }
    },
  });
}

/**
 * Create all tools for the legal AI agent with user and conversation context
 */
export function createLegalAgentTools(userId: string, conversationId?: string) {
  return {
    // Document tools
    searchDocuments: createSearchDocumentsTool(userId),
    getDocumentInfo: createGetDocumentInfoTool(userId),
    listDocuments: createListDocumentsTool(userId),

    // Isaacus tools (no user context needed)
    rerankResults: rerankResultsTool,
    extractAnswer: extractAnswerTool,
    classifyClauses: classifyClausesTool,
    analyzeRisk: analyzeRiskTool,

    // Planning tools (need conversation context)
    ...(conversationId
      ? {
          writeTodos: createWriteTodosTool(conversationId),
          updateTodo: createUpdateTodoTool(conversationId),
          getTodos: createGetTodosTool(conversationId),
        }
      : {}),

    // Delegation
    delegateTask: delegateTaskTool,

    // Memory
    storeMemory: createStoreMemoryTool(userId),
    recallMemory: createRecallMemoryTool(userId),
  };
}

/**
 * Agent configuration
 */
export const legalAgentConfig = {
  name: 'orderly-legal-agent',
  description: 'Advanced legal AI assistant with planning and memory',
  systemPrompt: LEGAL_AGENT_SYSTEM_PROMPT,
  model: 'anthropic/claude-sonnet-4-20250514',
  maxSteps: 15,
};
