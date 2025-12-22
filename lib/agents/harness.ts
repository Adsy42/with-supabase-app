/**
 * Deep Agent Harness - Legacy Exports
 *
 * This file provides backward-compatible exports for the legal AI assistant.
 * The main Deep Agent implementation has moved to deep-agent.ts.
 *
 * @deprecated Use createLegalDeepAgent from './deep-agent' instead
 */

import { createLegalTools } from './tools';

/**
 * Main system prompt for the legal AI assistant
 *
 * @deprecated Use LEGAL_DEEP_AGENT_SYSTEM_PROMPT from './deep-agent' instead
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
6. **Planning tasks** - Break down complex research into steps (via write_todos)
7. **File system** - Store and retrieve context (via ls, read_file, write_file, edit_file)
8. **Subagents** - Delegate to specialized agents (via task)

## For Complex Tasks

When facing a complex legal question:
1. Use the write_todos tool to plan your approach
2. Execute each step methodically
3. Store intermediate findings in /workspace/
4. Delegate to specialized subagents when appropriate:
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
 * Create all tools for the legal AI agent with user and conversation context
 *
 * @deprecated The Deep Agent now includes built-in planning and file system tools.
 * Use createLegalDeepAgent() instead, which automatically includes all capabilities.
 */
export function createLegalAgentTools(userId: string, _conversationId?: string) {
  // Return only the domain-specific tools
  // The Deep Agent handles planning, file system, and subagent capabilities
  const legalTools = createLegalTools(userId, _conversationId);

  // Convert to a keyed object for backward compatibility
  return {
    searchDocuments: legalTools[0],
    getDocumentInfo: legalTools[1],
    listDocuments: legalTools[2],
    rerankResults: legalTools[3],
    extractAnswer: legalTools[4],
    classifyClauses: legalTools[5],
    analyzeRisk: legalTools[6],
  };
}

/**
 * Agent configuration
 *
 * @deprecated Use createLegalDeepAgent() with LegalDeepAgentConfig instead
 */
export const legalAgentConfig = {
  name: 'orderly-legal-agent',
  description: 'Advanced legal AI assistant with planning and memory',
  systemPrompt: LEGAL_AGENT_SYSTEM_PROMPT,
  model: 'anthropic/claude-sonnet-4-20250514',
  maxSteps: 15,
};
