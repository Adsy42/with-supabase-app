/**
 * Deep Agent Integration for Legal AI
 *
 * Uses the `deepagents` library for the full Deep Agent architecture:
 * - Built-in planning (write_todos)
 * - File system tools for context management
 * - Subagent spawning capability
 * - Persistent storage via CompositeBackend with StoreBackend for /memories/
 *
 * @see https://docs.langchain.com/oss/javascript/deepagents/overview
 */

import {
  createDeepAgent,
  StateBackend,
  StoreBackend,
  CompositeBackend,
  type SubAgent,
} from 'deepagents';
import { ChatAnthropic } from '@langchain/anthropic';
import { InMemoryStore } from '@langchain/langgraph-checkpoint';
import type { StructuredTool } from '@langchain/core/tools';

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
Use file system tools (ls, read_file, write_file, edit_file) to:
- Store intermediate research findings in /workspace/
- Save important memories to /memories/ for cross-conversation persistence
- Manage large document excerpts
- Keep notes during complex analysis

### Subagent Delegation
Use the task tool to spawn focused subagents for:
- "legal-research": Deep-dive research on specific legal topics
- "contract-analysis": Isolated contract clause analysis
- "document-qa": Precise question answering from documents

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
2. For complex research: Create a todo plan, execute step by step, store findings in /workspace/
3. For contract review: Plan the analysis, classify clauses, assess risks, summarize
4. For deep research: Spawn subagents for parallel investigation
5. For user preferences: Store in /memories/ for future reference

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
 * Subagent configurations for specialized legal tasks
 */
const LEGAL_SUBAGENTS: SubAgent[] = [
  {
    name: 'legal-research',
    description:
      'Specialized agent for comprehensive legal research. Searches documents, reranks results, and synthesizes findings. Use for deep-dive research on specific legal topics.',
    systemPrompt: `You are a specialized legal research assistant. Your role is to:
1. Search and Retrieve: Find relevant legal documents and provisions
2. Analyze and Synthesize: Combine information from multiple sources
3. Cite Sources: Always reference which documents your answers come from
4. Be Thorough: Consider multiple angles and related concepts

Always cite your sources with document names and relevant quotes.`,
  },
  {
    name: 'contract-analysis',
    description:
      'Specialized agent for contract review and analysis. Classifies clauses, identifies risks, and provides detailed contract insights. Use for focused contract review tasks.',
    systemPrompt: `You are a specialized contract analysis assistant. Your role is to:
1. Classify Clauses: Identify clause types (indemnification, limitation of liability, etc.)
2. Assess Risks: Evaluate potential legal risks in provisions
3. Compare: Note unusual or non-standard terms
4. Summarize: Provide clear executive summaries

Focus on practical implications and actionable insights.`,
  },
  {
    name: 'document-qa',
    description:
      'Specialized agent for precise question answering from legal documents. Extracts exact answers with citations. Use when you need specific information from documents.',
    systemPrompt: `You are a specialized document Q&A assistant. Your role is to:
1. Find Answers: Locate precise answers to specific questions
2. Extract: Use extractive QA to find exact text spans
3. Cite: Always provide the source document and relevant quotes
4. Verify: Cross-reference information when possible

Be precise and avoid speculation. If the answer isn't in the documents, say so.`,
  },
];

// Shared in-memory store for persistent memories across conversations
// In production, this should be replaced with a persistent store (e.g., Supabase-backed)
let sharedStore: InMemoryStore | null = null;

function getSharedStore(): InMemoryStore {
  if (!sharedStore) {
    sharedStore = new InMemoryStore();
  }
  return sharedStore;
}

/**
 * Create a Deep Agent instance for legal AI assistance
 *
 * This creates a proper Deep Agent with:
 * - Built-in planning capabilities (write_todos)
 * - File system tools for context management (ls, read_file, write_file, edit_file)
 * - Subagent spawning (task tool) for legal-research, contract-analysis, document-qa
 * - CompositeBackend for persistent /memories/ storage
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

  // Create our legal tools
  const legalTools: StructuredTool[] = [
    // Document search (Isaacus embeddings + Supabase vector)
    createSearchDocumentsTool(userId, matterId),
    createGetDocumentInfoTool(userId),
    createListDocumentsTool(userId),

    // Isaacus-powered analysis
    rerankResultsTool,
    extractAnswerTool,
    classifyClausesTool,
    analyzeRiskTool,
  ] as StructuredTool[];

  // Get the shared store for persistent memories
  const store = getSharedStore();

  // Create the Deep Agent with our legal tools
  // The Deep Agent automatically includes:
  // - write_todos for planning
  // - File system tools (ls, read_file, write_file, edit_file)
  // - task tool for subagent spawning
  const agent = createDeepAgent({
    model: llm,
    tools: legalTools,
    systemPrompt: LEGAL_DEEP_AGENT_SYSTEM_PROMPT,
    subagents: LEGAL_SUBAGENTS,
    store,
    // CompositeBackend: ephemeral StateBackend for /workspace/, persistent StoreBackend for /memories/
    backend: (stateAndStore) =>
      new CompositeBackend(new StateBackend(stateAndStore), {
        '/memories/': new StoreBackend(stateAndStore),
      }),
    name: 'orderly-legal-agent',
  });

  return agent;
}

