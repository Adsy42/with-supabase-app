/**
 * CopilotKit Tool Integration
 *
 * For MVP, tools are defined using AI SDK format in harness.ts.
 * AnthropicAdapter automatically handles tool calls from the model.
 * 
 * Note: Full tool integration with CopilotKit runtime will be added
 * in a future iteration when we fully integrate Deep Agents.
 */

import { createLegalAgentTools } from './harness';

/**
 * Get tools for the agent
 * 
 * Tools are returned in AI SDK format which AnthropicAdapter can use.
 * The tools will be automatically available to the model for function calling.
 */
export function getAgentTools(userId: string, conversationId?: string) {
  return createLegalAgentTools(userId, conversationId);
}

