/**
 * Deep Agent Integration for Legal AI
 *
 * This module provides Deep Agent capabilities for the legal AI assistant.
 * For MVP, we're using a simplified approach that integrates with existing tools.
 * Future enhancements will add full Deep Agent middleware (planning, file system, subagents).
 */

import { createDeepAgent } from 'deepagents';
import { ChatAnthropic } from '@langchain/anthropic';
import { LEGAL_AGENT_SYSTEM_PROMPT } from './harness';

/**
 * Create a Deep Agent instance for legal AI assistance
 * 
 * Note: For MVP, this is a placeholder that will be enhanced with:
 * - Full tool integration
 * - Supabase backend for persistent memory
 * - Subagent middleware
 * - File system middleware
 * 
 * @param userId - User ID for scoping tools and memory (will be used in future)
 * @param conversationId - Conversation ID for context (will be used in future)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function createLegalDeepAgent(userId: string, conversationId?: string) {
  // Get the model
  const model = new ChatAnthropic({
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Create the deep agent with basic configuration
  // TODO: Add tool integration, Supabase backend, and middleware
  const agent = createDeepAgent({
    model,
    systemPrompt: LEGAL_AGENT_SYSTEM_PROMPT,
    // Tools will be added in future iteration
    // Backend will use Supabase store for persistent memory
  });

  return agent;
}

