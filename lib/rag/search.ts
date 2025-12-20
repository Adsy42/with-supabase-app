/**
 * RAG Search Pipeline
 * Vector search + Isaacus reranking for document retrieval
 */

import { createClient } from "@/lib/supabase/server";
import {
  embedQuery,
  rerank,
  isIsaacusConfigured,
} from "@/lib/isaacus/client";

export interface SearchResult {
  id: string;
  documentName: string;
  chunkIndex: number;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
  rerankScore?: number;
}

export interface SearchContext {
  documents: string;
  results: SearchResult[];
  query: string;
}

/**
 * Search documents using RAG pipeline:
 * 1. Embed query with Isaacus
 * 2. Vector search in pgvector
 * 3. Rerank with Isaacus cross-encoder
 * 4. Build context for LLM
 */
export async function searchDocuments(
  query: string,
  userId: string,
  matterId?: string,
  options?: {
    topK?: number;
    threshold?: number;
    rerankTopK?: number;
  }
): Promise<SearchContext> {
  const {
    topK = 20, // Retrieve more for reranking
    threshold = 0.5,
    rerankTopK = 5, // Final number after reranking
  } = options ?? {};

  // If Isaacus is not configured, fall back to basic search
  if (!isIsaacusConfigured()) {
    return fallbackSearch(query, userId, matterId, rerankTopK);
  }

  try {
    // Step 1: Embed the query
    const queryEmbedding = await embedQuery(query);

    // Step 2: Vector search in Supabase
    const supabase = await createClient();

    const { data: vectorResults, error } = await supabase.rpc(
      "match_document_chunks",
      {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: topK,
        filter_user_id: userId,
        filter_matter_id: matterId ?? null,
      }
    );

    if (error) {
      console.error("Vector search error:", error);
      return fallbackSearch(query, userId, matterId, rerankTopK);
    }

    if (!vectorResults || vectorResults.length === 0) {
      return {
        documents: "",
        results: [],
        query,
      };
    }

    // Map results to SearchResult type
    let results: SearchResult[] = vectorResults.map(
      (r: {
        id: string;
        document_name: string;
        chunk_index: number;
        content: string;
        metadata: Record<string, unknown>;
        similarity: number;
      }) => ({
        id: r.id,
        documentName: r.document_name,
        chunkIndex: r.chunk_index,
        content: r.content,
        metadata: r.metadata ?? {},
        similarity: r.similarity,
      })
    );

    // Step 3: Rerank with Isaacus cross-encoder
    try {
      const contents = results.map((r) => r.content);
      const rerankResults = await rerank(query, contents, rerankTopK);

      // Reorder results based on rerank scores
      results = rerankResults.map((rr) => ({
        ...results[rr.index],
        rerankScore: rr.score,
      }));
    } catch (rerankError) {
      console.error("Rerank error, using vector similarity:", rerankError);
      // Fall back to vector similarity ordering
      results = results.slice(0, rerankTopK);
    }

    // Step 4: Build context string
    const documents = buildContext(results);

    return {
      documents,
      results,
      query,
    };
  } catch (error) {
    console.error("RAG search error:", error);
    return fallbackSearch(query, userId, matterId, rerankTopK);
  }
}

/**
 * Fallback search using Supabase full-text search
 * Used when Isaacus is not configured or vector search fails
 */
async function fallbackSearch(
  query: string,
  userId: string,
  matterId?: string,
  limit: number = 5
): Promise<SearchContext> {
  const supabase = await createClient();

  // Build query with text search
  let queryBuilder = supabase
    .from("document_chunks")
    .select("id, document_name, chunk_index, content, metadata")
    .eq("user_id", userId)
    .textSearch("content", query, {
      type: "websearch",
      config: "english",
    })
    .limit(limit);

  if (matterId) {
    queryBuilder = queryBuilder.eq("matter_id", matterId);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error("Fallback search error:", error);
    return { documents: "", results: [], query };
  }

  const results: SearchResult[] = (data ?? []).map((r) => ({
    id: r.id,
    documentName: r.document_name,
    chunkIndex: r.chunk_index,
    content: r.content,
    metadata: r.metadata ?? {},
    similarity: 0, // No similarity score in fallback
  }));

  const documents = buildContext(results);

  return {
    documents,
    results,
    query,
  };
}

/**
 * Build context string from search results
 * Formats results for LLM consumption
 */
function buildContext(results: SearchResult[]): string {
  if (results.length === 0) {
    return "";
  }

  return results
    .map((result, index) => {
      const score = result.rerankScore ?? result.similarity;
      const scoreStr = score > 0 ? ` (relevance: ${(score * 100).toFixed(0)}%)` : "";

      return `[Document ${index + 1}: ${result.documentName}${scoreStr}]
${result.content}`;
    })
    .join("\n\n---\n\n");
}

/**
 * Check if user has any documents for RAG
 */
export async function hasDocuments(
  userId: string,
  matterId?: string
): Promise<boolean> {
  const supabase = await createClient();

  let queryBuilder = supabase
    .from("document_chunks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (matterId) {
    queryBuilder = queryBuilder.eq("matter_id", matterId);
  }

  const { count, error } = await queryBuilder;

  if (error) {
    console.error("Error checking documents:", error);
    return false;
  }

  return (count ?? 0) > 0;
}


