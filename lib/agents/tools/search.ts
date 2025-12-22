/**
 * Document Search Tools for Legal AI Agent
 *
 * Vector search over legal documents stored in Supabase.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getIsaacusClient } from '@/lib/isaacus/client';

export interface SearchResult {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  similarity: number;
  metadata: Record<string, unknown>;
}

export interface SearchOptions {
  userId: string;
  matterId?: string;
  limit?: number;
  threshold?: number;
}

/**
 * Search documents by semantic similarity
 */
export async function searchDocuments(
  query: string,
  options: SearchOptions
): Promise<SearchResult[]> {
  const { userId, matterId, limit = 10, threshold = 0.5 } = options;

  // Generate embedding for the query
  const isaacus = getIsaacusClient();
  const queryEmbedding = await isaacus.embedSingle(query);

  // Search in Supabase using the vector function
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: queryEmbedding,
    match_count: limit,
    filter_user_id: userId,
    filter_matter_id: matterId || null,
    similarity_threshold: threshold,
  });

  if (error) {
    throw error;
  }

  return (
    data?.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      documentId: row.document_id as string,
      content: row.content as string,
      chunkIndex: row.chunk_index as number,
      similarity: row.similarity as number,
      metadata: (row.metadata as Record<string, unknown>) || {},
    })) ?? []
  );
}

/**
 * Create search documents tool with user context
 */
export function createSearchDocumentsTool(userId: string) {
  return tool({
    description: `Search through legal documents using semantic similarity. 
Use this to find relevant document sections that may answer the user's question.
Returns the most relevant text chunks with their source documents.`,

    inputSchema: z.object({
      query: z
        .string()
        .describe('The search query - describe what you are looking for'),
      matterId: z
        .string()
        .optional()
        .describe('Optional matter ID to limit search to a specific matter'),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe('Maximum number of results to return'),
    }),

    execute: async ({ query, matterId, limit }) => {
      try {
        const results = await searchDocuments(query, {
          userId,
          matterId,
          limit,
        });

        return {
          query,
          resultCount: results.length,
          results: results.map((r) => ({
            content: r.content,
            documentId: r.documentId,
            chunkIndex: r.chunkIndex,
            relevanceScore: Math.round(r.similarity * 100),
            metadata: r.metadata,
          })),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          error: `Search failed: ${message}`,
          results: [],
        };
      }
    },
  });
}

/**
 * Get document metadata
 */
export async function getDocumentInfo(
  documentId: string,
  userId: string
): Promise<Record<string, unknown> | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data;
}

/**
 * Create get document info tool with user context
 */
export function createGetDocumentInfoTool(userId: string) {
  return tool({
    description: `Get detailed information about a specific document.
Use this to find out more about a document's metadata, type, and status.`,

    inputSchema: z.object({
      documentId: z.string().describe('The ID of the document to get info for'),
    }),

    execute: async ({ documentId }) => {
      try {
        const doc = await getDocumentInfo(documentId, userId);

        if (!doc) {
          return { error: 'Document not found' };
        }

        return {
          id: doc.id,
          name: doc.name,
          fileType: doc.file_type,
          status: doc.status,
          chunkCount: doc.chunk_count,
          documentType: doc.document_type,
          jurisdiction: doc.jurisdiction,
          practiceArea: doc.practice_area,
          createdAt: doc.created_at,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { error: `Failed to get document: ${message}` };
      }
    },
  });
}

/**
 * Create list documents tool with user context
 */
export function createListDocumentsTool(userId: string) {
  return tool({
    description: `List all documents available to the user.
Optionally filter by matter or status.`,

    inputSchema: z.object({
      matterId: z
        .string()
        .optional()
        .describe('Optional matter ID to filter documents'),
      status: z
        .enum(['processing', 'ready', 'error'])
        .optional()
        .describe('Optional status filter'),
      limit: z.number().optional().default(50).describe('Maximum documents to return'),
    }),

    execute: async ({ matterId, status, limit }) => {
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

        return {
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
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { error: `Failed to list documents: ${message}`, documents: [] };
      }
    },
  });
}

// Legacy exports for compatibility
export const searchDocumentsTool = createSearchDocumentsTool('');
export const getDocumentInfoTool = createGetDocumentInfoTool('');
export const listDocumentsTool = createListDocumentsTool('');
