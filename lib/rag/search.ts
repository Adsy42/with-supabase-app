/**
 * RAG Search Pipeline
 *
 * Retrieval-Augmented Generation for document search:
 * 1. Embed query with Isaacus
 * 2. Vector search in pgvector
 * 3. Rerank results with Isaacus
 * 4. Build context for LLM
 */

import { createClient } from "@/lib/supabase/server";
import { embedQuery, rerank } from "@/lib/isaacus/client";

export interface SearchResult {
  id: string;
  documentId: string;
  documentName: string;
  content: string;
  score: number;
  chunkIndex: number;
}

export interface SearchContext {
  chunks: SearchResult[];
  documents: string[];
  matterTitle?: string;
}

/**
 * Search documents for relevant content
 */
export async function searchDocuments(
  query: string,
  matterId: string,
  userId: string,
  topK = 10
): Promise<SearchContext> {
  const supabase = await createClient();

  // Get matter info
  const { data: matter } = await supabase
    .from("matters")
    .select("title")
    .eq("id", matterId)
    .single();

  // Check if Isaacus is configured
  const hasIsaacus = !!process.env.ISAACUS_API_KEY;

  let results: SearchResult[] = [];

  if (hasIsaacus) {
    // Embed the query
    const queryEmbedding = await embedQuery(query);

    // Vector search using pgvector
    const { data: chunks, error } = await supabase.rpc("match_document_chunks", {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: topK * 2, // Get more for reranking
      p_matter_id: matterId,
    });

    if (error) {
      console.error("Vector search error:", error);
    }

    if (chunks && chunks.length > 0) {
      // Rerank with Isaacus
      const chunkContents = chunks.map((c: { content: string }) => c.content);
      const reranked = await rerank(query, chunkContents, topK);

      results = reranked.map((r) => ({
        id: chunks[r.index].id,
        documentId: chunks[r.index].document_id,
        documentName: chunks[r.index].document_name || "Unknown",
        content: r.document,
        score: r.relevance_score,
        chunkIndex: chunks[r.index].chunk_index,
      }));
    }
  } else {
    // Fallback: Full-text search without embeddings
    const { data: chunks } = await supabase
      .from("document_chunks")
      .select(
        `
        id,
        content,
        chunk_index,
        document:documents!inner(id, name, matter_id)
      `
      )
      .eq("document.matter_id", matterId)
      .textSearch("content", query)
      .limit(topK);

    if (chunks) {
      results = chunks.map((c, i) => {
        // Handle both array and single object responses from Supabase
        const docData = c.document as { id: string; name: string; matter_id: string }[] | { id: string; name: string; matter_id: string } | null;
        const doc = Array.isArray(docData) ? docData[0] : docData;
        return {
          id: c.id,
          documentId: doc?.id || "",
          documentName: doc?.name || "Unknown",
          content: c.content,
          score: 1 - i * 0.1, // Decreasing score
          chunkIndex: c.chunk_index,
        };
      });
    }
  }

  // Build context strings
  const documents = results.map(
    (r) =>
      `[Source: ${r.documentName}, Section ${r.chunkIndex + 1}]\n${r.content}`
  );

  return {
    chunks: results,
    documents,
    matterTitle: matter?.title,
  };
}

/**
 * Build context for LLM prompt
 */
export function buildContext(searchContext: SearchContext): string {
  if (searchContext.documents.length === 0) {
    return "";
  }

  return `## Relevant Document Excerpts\n\n${searchContext.documents.join("\n\n---\n\n")}`;
}

