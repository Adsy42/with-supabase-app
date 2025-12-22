/**
 * Legal AI Tools Registry
 *
 * Consolidates domain-specific tools available to the Deep Agent:
 * - Document search (Isaacus embeddings + Supabase vector)
 * - Isaacus-powered analysis (rerank, extract, classify, risk)
 *
 * NOTE: Planning (write_todos) and file system tools (ls, read_file, write_file, edit_file)
 * are now built into the Deep Agent via the deepagents library.
 * Memory is handled via the /memories/ path in the Deep Agent's CompositeBackend.
 *
 * @see https://docs.isaacus.com/capabilities/introduction
 * @see https://docs.langchain.com/oss/javascript/deepagents/overview
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getIsaacusClient } from '@/lib/isaacus/client';
import { LegalVectorStore } from '@/lib/stores/supabase-vector-store';

// ============================================================================
// DOCUMENT SEARCH TOOLS
// ============================================================================

/**
 * Search documents using vector similarity with Isaacus embeddings
 */
export function createSearchDocumentsTool(userId: string, matterId?: string) {
  return new DynamicStructuredTool({
    name: 'search_documents',
    description: `Search through legal documents using semantic similarity.
Use this to find relevant document sections that may answer the user's question.
Returns the most relevant text chunks with their source documents and similarity scores.`,
    schema: z.object({
      query: z.string().describe('The search query - describe what you are looking for'),
      limit: z.number().optional().default(10).describe('Maximum number of results (default: 10)'),
      threshold: z.number().optional().default(0.5).describe('Minimum similarity threshold (0-1)'),
    }),
    func: async ({ query, limit, threshold }) => {
      try {
        const supabase = await createClient();
        const vectorStore = new LegalVectorStore({
          client: supabase,
          userId,
          matterId,
        });

        const results = await vectorStore.searchWithRPC(query, { limit, threshold });

        return JSON.stringify({
          query,
          resultCount: results.length,
          results: results.map((r) => ({
            content: r.content,
            documentId: r.documentId,
            chunkIndex: r.chunkIndex,
            relevanceScore: Math.round(r.similarity * 100),
            metadata: r.metadata,
          })),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({ error: `Search failed: ${message}`, results: [] });
      }
    },
  });
}

/**
 * Get detailed information about a specific document
 */
export function createGetDocumentInfoTool(userId: string) {
  return new DynamicStructuredTool({
    name: 'get_document_info',
    description: `Get detailed information about a specific document.
Use this to find out more about a document's metadata, type, and processing status.`,
    schema: z.object({
      documentId: z.string().describe('The ID of the document to get info for'),
    }),
    func: async ({ documentId }) => {
      try {
        const supabase = await createClient();

        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('id', documentId)
          .eq('user_id', userId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return JSON.stringify({ error: 'Document not found' });
          }
          throw error;
        }

        return JSON.stringify({
          id: data.id,
          name: data.name,
          fileType: data.file_type,
          status: data.status,
          chunkCount: data.chunk_count,
          documentType: data.document_type,
          jurisdiction: data.jurisdiction,
          practiceArea: data.practice_area,
          createdAt: data.created_at,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({ error: `Failed to get document: ${message}` });
      }
    },
  });
}

/**
 * List all documents available to the user
 */
export function createListDocumentsTool(userId: string) {
  return new DynamicStructuredTool({
    name: 'list_documents',
    description: `List all documents available to the user.
Optionally filter by matter or status.`,
    schema: z.object({
      matterId: z.string().optional().describe('Optional matter ID to filter documents'),
      status: z
        .enum(['processing', 'ready', 'error'])
        .optional()
        .describe('Optional status filter'),
      limit: z.number().optional().default(50).describe('Maximum documents to return'),
    }),
    func: async ({ matterId, status, limit }) => {
      try {
        const supabase = await createClient();

        let query = supabase
          .from('documents')
          .select('id, name, file_type, status, chunk_count, document_type, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (matterId) {
          query = query.eq('matter_id', matterId);
        }

        if (status) {
          query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        return JSON.stringify({
          count: data?.length ?? 0,
          documents:
            data?.map((doc) => ({
              id: doc.id,
              name: doc.name,
              fileType: doc.file_type,
              status: doc.status,
              chunkCount: doc.chunk_count,
              type: doc.document_type,
              createdAt: doc.created_at,
            })) ?? [],
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({ error: `Failed to list documents: ${message}`, documents: [] });
      }
    },
  });
}

// ============================================================================
// ISAACUS-POWERED ANALYSIS TOOLS
// ============================================================================

/**
 * Rerank search results for better relevance
 * @see https://docs.isaacus.com/capabilities/reranking
 */
export const rerankResultsTool = new DynamicStructuredTool({
  name: 'rerank_results',
  description: `Rerank a list of document chunks to find the most relevant ones for a query.
Use this after initial search to improve result quality. Powered by Isaacus reranking.
Returns the documents sorted by relevance with scores.`,
  schema: z.object({
    query: z.string().describe('The query to rank documents against'),
    documents: z.array(z.string()).describe('Array of document text chunks to rerank'),
    topN: z.number().optional().default(5).describe('Number of top results to return'),
  }),
  func: async ({ query, documents, topN }) => {
    if (documents.length === 0) {
      return JSON.stringify({ results: [], message: 'No documents to rerank' });
    }

    try {
      const isaacus = getIsaacusClient();
      const response = await isaacus.rerank(query, documents, {
        top_n: topN,
        return_documents: true,
      });

      return JSON.stringify({
        results: response.results.map((r) => ({
          text: r.document,
          relevanceScore: Math.round(r.relevance_score * 100),
          originalIndex: r.index,
        })),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return JSON.stringify({ error: `Reranking failed: ${message}`, results: [] });
    }
  },
});

/**
 * Extract precise answers from context using Isaacus extractive QA
 * @see https://docs.isaacus.com/capabilities/extractive-question-answering
 */
export const extractAnswerTool = new DynamicStructuredTool({
  name: 'extract_answer',
  description: `Extract a precise answer from a document context using Isaacus extractive QA.
Use this when you need to find a specific piece of information within a longer text.
Returns the exact text span that answers the question with confidence score.`,
  schema: z.object({
    question: z.string().describe('The question to answer'),
    context: z.string().describe('The document text to search for the answer'),
    topK: z.number().optional().default(3).describe('Number of potential answers to return'),
  }),
  func: async ({ question, context, topK }) => {
    if (!context || context.trim().length === 0) {
      return JSON.stringify({ error: 'No context provided', answers: [] });
    }

    try {
      const isaacus = getIsaacusClient();
      const response = await isaacus.extractiveQA(question, context, {
        top_k: topK,
      });

      if (response.answers.length === 0) {
        return JSON.stringify({
          message: 'No answer found in the provided context',
          answers: [],
        });
      }

      return JSON.stringify({
        answers: response.answers.map((a) => ({
          text: a.text,
          confidence: Math.round(a.score * 100),
          position: { start: a.start, end: a.end },
          surroundingContext: a.context,
        })),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return JSON.stringify({ error: `Answer extraction failed: ${message}`, answers: [] });
    }
  },
});

/**
 * Legal clause classification labels
 */
const LEGAL_CLAUSE_LABELS = [
  'indemnification',
  'limitation_of_liability',
  'termination',
  'confidentiality',
  'intellectual_property',
  'warranty',
  'force_majeure',
  'dispute_resolution',
  'governing_law',
  'assignment',
  'notices',
  'amendments',
  'entire_agreement',
  'severability',
  'waiver',
  'payment_terms',
  'delivery',
  'insurance',
  'compliance',
  'data_protection',
  'other',
] as const;

/**
 * Classify legal clauses using Isaacus universal classification
 * @see https://docs.isaacus.com/capabilities/universal-classification
 */
export const classifyClausesTool = new DynamicStructuredTool({
  name: 'classify_clauses',
  description: `Classify a legal clause or text segment into common contract clause types.
Use this to understand what type of legal provision a text represents.
Powered by Isaacus universal classification - no prior examples needed.
Common clause types: indemnification, limitation of liability, termination, confidentiality, IP, warranty, force majeure, dispute resolution, etc.`,
  schema: z.object({
    text: z.string().describe('The legal text to classify'),
    customLabels: z
      .array(z.string())
      .optional()
      .describe('Optional custom labels to classify against (overrides defaults)'),
  }),
  func: async ({ text, customLabels }) => {
    if (!text || text.trim().length === 0) {
      return JSON.stringify({ error: 'No text provided', classification: null });
    }

    try {
      const isaacus = getIsaacusClient();
      const labels = customLabels || [...LEGAL_CLAUSE_LABELS];

      const response = await isaacus.classify(text, labels, {
        multi_label: true,
      });

      const results = response.classifications[0];

      if (!results || results.length === 0) {
        return JSON.stringify({
          message: 'Could not classify the text',
          classification: null,
        });
      }

      // Sort by score and get top results
      const sorted = [...results].sort((a, b) => b.score - a.score);
      const topLabels = sorted.filter((r) => r.score > 0.3).slice(0, 3);

      return JSON.stringify({
        primaryType: topLabels[0]?.label || 'other',
        confidence: Math.round((topLabels[0]?.score || 0) * 100),
        allLabels: topLabels.map((l) => ({
          type: l.label,
          confidence: Math.round(l.score * 100),
        })),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return JSON.stringify({ error: `Classification failed: ${message}`, classification: null });
    }
  },
});

/**
 * Analyze document for risk using Isaacus classification
 */
export const analyzeRiskTool = new DynamicStructuredTool({
  name: 'analyze_risk',
  description: `Analyze a legal text for potential risks or issues.
Use this to identify problematic clauses, missing provisions, or areas of concern.
Powered by Isaacus classification for legal risk assessment.`,
  schema: z.object({
    text: z.string().describe('The legal text to analyze'),
    documentType: z
      .string()
      .optional()
      .describe('Type of document (e.g., contract, agreement, policy)'),
  }),
  func: async ({ text, documentType }) => {
    if (!text || text.trim().length === 0) {
      return JSON.stringify({ error: 'No text provided', analysis: null });
    }

    try {
      const isaacus = getIsaacusClient();

      // Risk-related labels for classification
      const riskLabels = [
        'high_risk',
        'medium_risk',
        'low_risk',
        'one_sided',
        'ambiguous',
        'missing_protection',
        'unusual_terms',
        'standard',
      ];

      const response = await isaacus.classify(text, riskLabels, {
        multi_label: true,
      });

      const results = response.classifications[0];
      const sorted = [...(results || [])].sort((a, b) => b.score - a.score);

      // Determine overall risk level
      const highRisk = sorted.find((r) => r.label === 'high_risk');
      const mediumRisk = sorted.find((r) => r.label === 'medium_risk');

      let riskLevel = 'low';
      if (highRisk && highRisk.score > 0.5) {
        riskLevel = 'high';
      } else if (mediumRisk && mediumRisk.score > 0.5) {
        riskLevel = 'medium';
      }

      return JSON.stringify({
        riskLevel,
        documentType: documentType || 'unknown',
        indicators: sorted
          .filter((r) => r.score > 0.3)
          .map((r) => ({
            factor: r.label,
            confidence: Math.round(r.score * 100),
          })),
        recommendation:
          riskLevel === 'high'
            ? 'This text contains potentially high-risk terms. Legal review recommended.'
            : riskLevel === 'medium'
              ? 'Some terms may warrant further review.'
              : 'Text appears to be standard legal language.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return JSON.stringify({ error: `Risk analysis failed: ${message}`, analysis: null });
    }
  },
});

// ============================================================================
// TOOL REGISTRY
// ============================================================================

/**
 * Create domain-specific legal AI tools
 *
 * NOTE: This does NOT include planning or memory tools anymore.
 * The Deep Agent provides those capabilities via its built-in middleware:
 * - write_todos for planning
 * - File system tools (ls, read_file, write_file, edit_file) for context management
 * - /memories/ path routes to persistent StoreBackend
 */
export function createLegalTools(
  userId: string,
  _conversationId?: string,
  matterId?: string
): DynamicStructuredTool[] {
  return [
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
}

/**
 * Export individual tools for selective use
 */
export {
  // Static Isaacus tools
  rerankResultsTool as rerankTool,
  extractAnswerTool as extractTool,
  classifyClausesTool as classifyTool,
  analyzeRiskTool as riskTool,
};
