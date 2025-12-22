/**
 * Isaacus-powered Tools for Legal AI Agent
 *
 * Advanced legal AI capabilities using the Isaacus API:
 * - Reranking for improved relevance
 * - Extractive QA for precise answers
 * - Legal clause classification
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getIsaacusClient } from '@/lib/isaacus/client';

/**
 * Rerank search results for better relevance
 */
export const rerankResultsTool = tool({
  description: `Rerank a list of document chunks to find the most relevant ones for a query.
Use this after initial search to improve result quality.
Returns the documents sorted by relevance with scores.`,

  inputSchema: z.object({
    query: z.string().describe('The query to rank documents against'),
    documents: z
      .array(z.string())
      .describe('Array of document text chunks to rerank'),
    topN: z
      .number()
      .optional()
      .default(5)
      .describe('Number of top results to return'),
  }),

  execute: async ({ query, documents, topN }) => {
    if (documents.length === 0) {
      return { results: [], message: 'No documents to rerank' };
    }

    try {
      const isaacus = getIsaacusClient();
      const response = await isaacus.rerank(query, documents, {
        top_n: topN,
        return_documents: true,
      });

      return {
        results: response.results.map((r) => ({
          text: r.document,
          relevanceScore: Math.round(r.relevance_score * 100),
          originalIndex: r.index,
        })),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { error: `Reranking failed: ${message}`, results: [] };
    }
  },
});

/**
 * Extract precise answers from context
 */
export const extractAnswerTool = tool({
  description: `Extract a precise answer from a document context.
Use this when you need to find a specific piece of information within a longer text.
Returns the exact text span that answers the question with confidence score.`,

  inputSchema: z.object({
    question: z.string().describe('The question to answer'),
    context: z
      .string()
      .describe('The document text to search for the answer'),
    topK: z
      .number()
      .optional()
      .default(3)
      .describe('Number of potential answers to return'),
  }),

  execute: async ({ question, context, topK }) => {
    if (!context || context.trim().length === 0) {
      return { error: 'No context provided', answers: [] };
    }

    try {
      const isaacus = getIsaacusClient();
      const response = await isaacus.extractiveQA(question, context, {
        top_k: topK,
      });

      if (response.answers.length === 0) {
        return {
          message: 'No answer found in the provided context',
          answers: [],
        };
      }

      return {
        answers: response.answers.map((a) => ({
          text: a.text,
          confidence: Math.round(a.score * 100),
          position: { start: a.start, end: a.end },
          surroundingContext: a.context,
        })),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { error: `Answer extraction failed: ${message}`, answers: [] };
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
 * Classify legal clauses
 */
export const classifyClausesTool = tool({
  description: `Classify a legal clause or text segment into common contract clause types.
Use this to understand what type of legal provision a text represents.
Common clause types include: indemnification, limitation of liability, termination,
confidentiality, intellectual property, warranty, force majeure, etc.`,

  inputSchema: z.object({
    text: z.string().describe('The legal text to classify'),
    customLabels: z
      .array(z.string())
      .optional()
      .describe('Optional custom labels to classify against'),
  }),

  execute: async ({ text, customLabels }) => {
    if (!text || text.trim().length === 0) {
      return { error: 'No text provided', classification: null };
    }

    try {
      const isaacus = getIsaacusClient();
      const labels = customLabels || [...LEGAL_CLAUSE_LABELS];

      const response = await isaacus.classify(text, labels, {
        multi_label: true,
      });

      const results = response.classifications[0];

      if (!results || results.length === 0) {
        return {
          message: 'Could not classify the text',
          classification: null,
        };
      }

      // Sort by score and get top results
      const sorted = [...results].sort((a, b) => b.score - a.score);
      const topLabels = sorted.filter((r) => r.score > 0.3).slice(0, 3);

      return {
        primaryType: topLabels[0]?.label || 'other',
        confidence: Math.round((topLabels[0]?.score || 0) * 100),
        allLabels: topLabels.map((l) => ({
          type: l.label,
          confidence: Math.round(l.score * 100),
        })),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { error: `Classification failed: ${message}`, classification: null };
    }
  },
});

/**
 * Analyze document for risk
 */
export const analyzeRiskTool = tool({
  description: `Analyze a legal text for potential risks or issues.
Use this to identify problematic clauses, missing provisions, or areas of concern.`,

  inputSchema: z.object({
    text: z.string().describe('The legal text to analyze'),
    documentType: z
      .string()
      .optional()
      .describe('Type of document (e.g., contract, agreement, policy)'),
  }),

  execute: async ({ text, documentType }) => {
    if (!text || text.trim().length === 0) {
      return { error: 'No text provided', analysis: null };
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

      return {
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
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { error: `Risk analysis failed: ${message}`, analysis: null };
    }
  },
});

// Export all Isaacus tools as an array for convenience
export const isaacusTools = [
  rerankResultsTool,
  extractAnswerTool,
  classifyClausesTool,
  analyzeRiskTool,
];
