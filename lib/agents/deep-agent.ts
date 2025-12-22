/**
 * Deep Agent Integration for Legal AI
 *
 * Uses the `deepagents` library for the full Deep Agent architecture:
 * - Built-in planning (write_todos)
 * - File system tools for context management
 * - Subagent spawning capability
 * - Persistent storage via custom Supabase backend
 *
 * @see https://docs.langchain.com/oss/javascript/deepagents/overview
 */

import { createDeepAgent, StateBackend } from 'deepagents';
import { ChatAnthropic } from '@langchain/anthropic';
import type { DynamicStructuredTool } from '@langchain/core/tools';

import {
  createSearchDocumentsTool,
  createGetDocumentInfoTool,
  createListDocumentsTool,
  rerankResultsTool,
  extractAnswerTool,
  classifyClausesTool,
  analyzeRiskTool,
} from './tools';

/**
 * System prompt for the legal Deep Agent
 * Includes instructions for using built-in Deep Agent capabilities
 */
export const LEGAL_DEEP_AGENT_SYSTEM_PROMPT = `You are Orderly, an advanced legal AI assistant designed for Finnish legal professionals.

## Your Role
You help with legal research, contract analysis, document Q&A, and complex legal tasks.

## Your Deep Agent Capabilities

### Planning with write_todos
For complex tasks, use the built-in write_todos tool to:
- Break down multi-step legal research into discrete tasks
- Track progress through complex document reviews
- Plan and execute contract analysis workflows

### File System for Context
Use file system tools (ls, read_file, write_file) to:
- Store intermediate research findings
- Manage large document excerpts
- Keep notes during complex analysis

### Subagent Delegation
Use the task tool to spawn focused subagents for:
- Deep-dive research on specific legal topics
- Isolated contract clause analysis
- Parallel document review tasks

## Your Legal AI Tools

1. **search_documents** - Semantic search through legal documents using Isaacus embeddings
2. **rerank_results** - Re-score search results for better relevance
3. **extract_answer** - Find precise answers in document text with extractive QA
4. **classify_clauses** - Identify clause types (indemnification, termination, etc.)
5. **analyze_risk** - Assess legal risks in contract provisions
6. **get_document_info** - Get metadata about a specific document
7. **list_documents** - List all available documents

## Workflow Guidelines

1. For simple questions: Search documents, extract answers, respond directly
2. For complex research: Create a todo plan, execute step by step, store findings
3. For contract review: Plan the analysis, classify clauses, assess risks, summarize
4. For deep research: Spawn subagents for parallel investigation

## Response Guidelines

- Be precise and accurate - legal work requires exactness
- Always cite your sources with document names and quotes
- Acknowledge uncertainty when information is incomplete
- Use proper legal terminology
- Consider Finnish legal context when relevant
- Format responses clearly with headings and bullet points
- Don't make up legal information not in the documents
- Suggest consulting a lawyer for final legal decisions`;

/**
 * Configuration for creating a legal Deep Agent
 */
export interface LegalDeepAgentConfig {
  /**
   * User ID for scoping tools and data access
   */
  userId: string;

  /**
   * Conversation ID for message and todo context
   */
  conversationId?: string;

  /**
   * Optional matter ID for document scoping
   */
  matterId?: string;

  /**
   * Model to use (default: claude-sonnet-4-20250514)
   */
  model?: string;

  /**
   * Temperature for model responses (default: 0.7)
   */
  temperature?: number;
}

/**
 * Create a Deep Agent instance for legal AI assistance
 *
 * This creates a proper Deep Agent with:
 * - Built-in planning capabilities (write_todos)
 * - File system tools for context management
 * - Subagent spawning
 * - Our custom Isaacus-powered legal tools
 *
 * @example
 * ```typescript
 * const agent = createLegalDeepAgent({
 *   userId: user.id,
 *   conversationId: conversationId,
 *   matterId: matterId,
 * });
 *
 * // Stream responses
 * const stream = await agent.stream({
 *   messages: [{ role: 'user', content: 'Find indemnification clauses' }],
 * });
 *
 * for await (const chunk of stream) {
 *   console.log(chunk);
 * }
 * ```
 */
export function createLegalDeepAgent(config: LegalDeepAgentConfig) {
  const {
    userId,
    matterId,
    model = 'claude-sonnet-4-20250514',
    temperature = 0.7,
  } = config;

  // Create the LLM
  const llm = new ChatAnthropic({
    model,
    temperature,
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Create our legal tools (type assertion needed for compatibility)
  const legalTools: DynamicStructuredTool[] = [
    // Document search (Isaacus embeddings + Supabase vector)
    createSearchDocumentsTool(userId, matterId),
    createGetDocumentInfoTool(userId),
    createListDocumentsTool(userId),

    // Isaacus-powered analysis
    rerankResultsTool,
    extractAnswerTool,
    classifyClausesTool,
    analyzeRiskTool,
  ];

  // Create the Deep Agent with our legal tools
  // The Deep Agent automatically includes:
  // - write_todos for planning
  // - File system tools (ls, read_file, write_file, edit_file)
  // - task tool for subagent spawning
  const agent = createDeepAgent({
    model: llm,
    tools: legalTools,
    systemPrompt: LEGAL_DEEP_AGENT_SYSTEM_PROMPT,
    // Use StateBackend by default (ephemeral per thread)
    // TODO: Implement custom Supabase backend for cross-thread persistence
    backend: (rt) => new StateBackend(rt),
  });

  return agent;
}

// LegalDeepAgentConfig is exported via the interface declaration above
