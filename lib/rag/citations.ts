/**
 * Citation Builder Module
 * Uses Isaacus Extractive QA to generate verified citations with exact quotes
 * https://docs.isaacus.com/capabilities/extractive-question-answering
 */

import { extractAnswer, isIsaacusConfigured } from "@/lib/isaacus/client";
import type { SearchResult } from "./search";

// ============================================================================
// TYPES
// ============================================================================

/**
 * A verified citation with exact quote from source document
 */
export interface VerifiedCitation {
  /** Source document name */
  documentName: string;
  /** Document chunk ID for reference */
  chunkId: string;
  /** Chunk index within the document */
  chunkIndex: number;
  /** Exact quote extracted by Isaacus Reader */
  exactQuote: string;
  /** Character start position in the chunk */
  startChar: number;
  /** Character end position in the chunk */
  endChar: number;
  /** Confidence score from extractive QA (0-1) */
  confidence: number;
  /** Relevance score from reranking (0-1) */
  relevanceScore: number;
  /** The full chunk content for context */
  fullContext: string;
}

/**
 * Result from citation extraction
 */
export interface CitationResult {
  /** Successfully extracted citations */
  citations: VerifiedCitation[];
  /** Whether extractive QA was used (vs fallback) */
  verified: boolean;
  /** Total documents processed */
  documentsProcessed: number;
}

// ============================================================================
// CITATION EXTRACTION
// ============================================================================

/**
 * Extract verified citations from search results using Isaacus Reader
 * 
 * @param query - The user's question
 * @param results - Search results to extract citations from
 * @param maxCitations - Maximum number of citations to return (default 5)
 * @returns CitationResult with verified quotes
 */
export async function extractCitations(
  query: string,
  results: SearchResult[],
  maxCitations: number = 5
): Promise<CitationResult> {
  if (results.length === 0) {
    return {
      citations: [],
      verified: false,
      documentsProcessed: 0,
    };
  }

  // If Isaacus not configured, return basic citations without verification
  if (!isIsaacusConfigured()) {
    return createFallbackCitations(results, maxCitations);
  }

  const citations: VerifiedCitation[] = [];

  // Process top results
  const toProcess = results.slice(0, maxCitations);

  for (const result of toProcess) {
    try {
      // Use extractive QA to find the exact answer in this chunk
      const answers = await extractAnswer(query, result.content);

      if (answers.length > 0) {
        // Take the best answer (highest score)
        const bestAnswer = answers.reduce((best, current) =>
          current.score > best.score ? current : best
        );

        citations.push({
          documentName: result.documentName,
          chunkId: result.id,
          chunkIndex: result.chunkIndex,
          exactQuote: bestAnswer.answer,
          startChar: bestAnswer.start,
          endChar: bestAnswer.end,
          confidence: bestAnswer.score,
          relevanceScore: result.rerankScore ?? result.similarity,
          fullContext: result.content,
        });
      }
    } catch (error) {
      console.error(`Citation extraction failed for ${result.id}:`, error);
      // Continue with other results
    }
  }

  // Sort by confidence score
  citations.sort((a, b) => b.confidence - a.confidence);

  return {
    citations,
    verified: true,
    documentsProcessed: toProcess.length,
  };
}

/**
 * Create fallback citations when Isaacus is not available
 * Uses the first sentence/paragraph as the "quote"
 */
function createFallbackCitations(
  results: SearchResult[],
  maxCitations: number
): CitationResult {
  const citations: VerifiedCitation[] = results
    .slice(0, maxCitations)
    .map((result) => {
      // Extract first meaningful sentence as quote
      const quote = extractFirstSentence(result.content);

      return {
        documentName: result.documentName,
        chunkId: result.id,
        chunkIndex: result.chunkIndex,
        exactQuote: quote,
        startChar: 0,
        endChar: quote.length,
        confidence: 0.5, // Lower confidence for fallback
        relevanceScore: result.rerankScore ?? result.similarity,
        fullContext: result.content,
      };
    });

  return {
    citations,
    verified: false,
    documentsProcessed: results.length,
  };
}

/**
 * Extract the first meaningful sentence from text
 */
function extractFirstSentence(text: string): string {
  // Clean the text
  const cleaned = text.trim();

  // Try to find first sentence ending
  const sentenceEnd = cleaned.search(/[.!?]\s/);

  if (sentenceEnd > 0 && sentenceEnd < 300) {
    return cleaned.substring(0, sentenceEnd + 1);
  }

  // If no sentence found, take first 200 chars
  if (cleaned.length <= 200) {
    return cleaned;
  }

  // Find a good break point
  const breakPoint = cleaned.lastIndexOf(" ", 200);
  return cleaned.substring(0, breakPoint > 100 ? breakPoint : 200) + "...";
}

// ============================================================================
// CITATION FORMATTING
// ============================================================================

/**
 * Format citations for LLM context
 * Creates a structured citation block for the system prompt
 */
export function formatCitationsForLLM(citations: VerifiedCitation[]): string {
  if (citations.length === 0) {
    return "";
  }

  const formatted = citations.map((citation, index) => {
    const confidence = Math.round(citation.confidence * 100);
    return `[Citation ${index + 1}]
Source: ${citation.documentName}
Quote: "${citation.exactQuote}"
Confidence: ${confidence}%`;
  });

  return `## Verified Citations

The following exact quotes were extracted from the source documents:

${formatted.join("\n\n")}

When referencing these sources, use the exact quotes provided above.`;
}

/**
 * Format citations for display in UI
 */
export function formatCitationsForUI(
  citations: VerifiedCitation[]
): Array<{
  id: string;
  document: string;
  quote: string;
  confidence: number;
  relevance: number;
}> {
  return citations.map((citation) => ({
    id: citation.chunkId,
    document: citation.documentName,
    quote: citation.exactQuote,
    confidence: Math.round(citation.confidence * 100),
    relevance: Math.round(citation.relevanceScore * 100),
  }));
}

/**
 * Build context with embedded citations
 * Marks citation locations in the document text
 */
export function buildContextWithCitations(
  results: SearchResult[],
  citations: VerifiedCitation[]
): string {
  if (results.length === 0) {
    return "";
  }

  // Create a map of chunk ID to citations
  const citationMap = new Map<string, VerifiedCitation[]>();
  for (const citation of citations) {
    const existing = citationMap.get(citation.chunkId) || [];
    existing.push(citation);
    citationMap.set(citation.chunkId, existing);
  }

  return results
    .map((result, index) => {
      const score = result.rerankScore ?? result.similarity;
      const scoreStr = score > 0 ? ` (relevance: ${(score * 100).toFixed(0)}%)` : "";

      // Check if this result has citations
      const chunkCitations = citationMap.get(result.id) || [];
      let citationMarker = "";
      if (chunkCitations.length > 0) {
        const citationNums = chunkCitations
          .map((_, i) => `[${index + 1}.${i + 1}]`)
          .join(" ");
        citationMarker = ` ${citationNums}`;
      }

      return `[Document ${index + 1}: ${result.documentName}${scoreStr}]${citationMarker}
${result.content}`;
    })
    .join("\n\n---\n\n");
}

