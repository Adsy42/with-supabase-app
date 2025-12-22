/**
 * Deep Agent Module Exports
 *
 * Central export point for the LangGraph Deep Agent architecture.
 * Import from here for all agent-related functionality.
 *
 * @example
 * ```typescript
 * import {
 *   createLegalDeepAgent,
 *   LegalCoAgent,
 *   createLegalTools,
 *   LEGAL_DEEP_AGENT_SYSTEM_PROMPT,
 * } from '@/lib/agents';
 * ```
 */

// Deep Agent (primary)
export {
  createLegalDeepAgent,
  LEGAL_DEEP_AGENT_SYSTEM_PROMPT,
  type LegalDeepAgentConfig,
} from './deep-agent';

// CopilotKit CoAgent integration
export {
  LegalCoAgent,
  createLegalCoAgentFactory,
  type LegalCoAgentConfig,
} from './coagent';

// CopilotKit adapter (for LangChainAdapter approach)
export {
  createLangGraphAdapter,
  extractConversationId,
  extractMatterId,
  type LangGraphAdapterConfig,
} from './adapter';

// Domain-specific tools
export { createLegalTools } from './tools';
export {
  rerankTool,
  extractTool,
  classifyTool,
  riskTool,
} from './tools';

// Legacy exports for backward compatibility
// (LangGraph StateGraph-based agent)
export {
  createLegalAgentGraph,
  invokeLegalAgent,
  streamLegalAgent,
  createAgentWithHistory,
  type LegalAgentConfig,
  type LegalAgentGraph,
} from './graph';

// Legacy state (for StateGraph-based agent)
export {
  AgentState,
  type AgentStateType,
  type AgentInput,
  type AgentOutput,
  type AgentTodoItem,
  type DocumentReference,
} from './state';

// Legacy exports from harness (deprecated)
export {
  LEGAL_AGENT_SYSTEM_PROMPT,
  createLegalAgentTools,
  legalAgentConfig,
} from './harness';
