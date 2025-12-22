/**
 * Deep Agent Module Exports
 *
 * Central export point for the LangGraph Deep Agent architecture.
 * Import from here for all agent-related functionality.
 *
 * @example
 * ```typescript
 * import {
 *   createLegalAgentGraph,
 *   createLangGraphAdapter,
 *   createLegalTools,
 *   LEGAL_AGENT_SYSTEM_PROMPT,
 * } from '@/lib/agents';
 * ```
 */

// Core graph
export {
  createLegalAgentGraph,
  invokeLegalAgent,
  streamLegalAgent,
  createAgentWithHistory,
  type LegalAgentConfig,
  type LegalAgentGraph,
} from './graph';

// Agent state
export {
  AgentState,
  type AgentStateType,
  type AgentInput,
  type AgentOutput,
  type AgentTodoItem,
  type DocumentReference,
} from './state';

// CopilotKit adapter
export {
  createLangGraphAdapter,
  extractConversationId,
  extractMatterId,
  type LangGraphAdapterConfig,
} from './adapter';

// Tools
export { createLegalTools } from './tools';
export {
  rerankTool,
  extractTool,
  classifyTool,
  riskTool,
} from './tools';

// System prompt
export { LEGAL_AGENT_SYSTEM_PROMPT } from './harness';

// Legacy exports (for backward compatibility)
export { createLegalAgentTools, legalAgentConfig } from './harness';

