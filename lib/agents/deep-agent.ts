/**
 * Deep Agent Integration for Legal AI
 *
 * This module provides the main entry point for creating Deep Agent instances.
 * The implementation uses LangGraph for the agent architecture with:
 * - Isaacus-powered tools for legal document analysis
 * - Supabase for persistent storage and vector search
 * - CopilotKit for the frontend chat interface
 *
 * @see https://docs.langchain.com/oss/javascript/langgraph
 * @see https://docs.isaacus.com/capabilities/introduction
 */

import { createLegalAgentGraph, type LegalAgentConfig } from './graph';
import { LEGAL_AGENT_SYSTEM_PROMPT } from './harness';

/**
 * Create a Deep Agent instance for legal AI assistance
 *
 * This creates a LangGraph-based agent with full tool integration for:
 * - Document search (Isaacus embeddings + Supabase vector store)
 * - Reranking and extractive QA (Isaacus)
 * - Clause classification and risk analysis (Isaacus)
 * - Task planning (todos)
 * - Long-term memory storage
 *
 * @param userId - User ID for scoping tools and memory
 * @param conversationId - Conversation ID for message and todo context
 * @param matterId - Optional matter ID for document scoping
 *
 * @example
 * ```typescript
 * const agent = createLegalDeepAgent(
 *   user.id,
 *   conversationId,
 *   matterId
 * );
 *
 * const result = await agent.invoke({
 *   messages: [new HumanMessage("Find indemnification clauses")],
 *   userId: user.id,
 *   conversationId,
 * });
 * ```
 */
export function createLegalDeepAgent(
  userId: string,
  conversationId: string,
  matterId?: string
) {
  const config: LegalAgentConfig = {
    userId,
    conversationId,
    matterId,
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
  };

  return createLegalAgentGraph(config);
}

/**
 * Re-export the system prompt for use in other modules
 */
export { LEGAL_AGENT_SYSTEM_PROMPT };

/**
 * Re-export types for convenience
 */
export type { LegalAgentConfig } from './graph';
