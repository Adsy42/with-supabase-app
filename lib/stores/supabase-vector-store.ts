/**
 * Supabase Vector Store with Isaacus Embeddings
 *
 * Provides LangChain-compatible vector store using:
 * - Supabase pgvector for storage and similarity search
 * - Isaacus API for 1024-dimension legal embeddings
 *
 * @see https://supabase.com/docs/guides/ai/langchain
 * @see https://docs.isaacus.com/capabilities/embedding
 */

import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Document } from '@langchain/core/documents';
import { IsaacusEmbeddings } from '@/lib/isaacus/embeddings';

export interface LegalVectorStoreConfig {
  /**
   * Supabase client instance
   */
  client: SupabaseClient;

  /**
   * User ID to scope document access
   */
  userId: string;

  /**
   * Optional matter ID to further filter documents
   */
  matterId?: string;

  /**
   * Table name for document chunks (default: 'document_chunks')
   */
  tableName?: string;

  /**
   * RPC function name for similarity search (default: 'match_document_chunks')
   */
  queryName?: string;
}

/**
 * Create a LangChain-compatible vector store for legal documents
 *
 * Uses Isaacus embeddings (optimized for Finnish legal text) and
 * Supabase pgvector for storage and retrieval.
 *
 * @example
 * ```typescript
 * const supabase = await createClient();
 * const vectorStore = createLegalVectorStore({
 *   client: supabase,
 *   userId: user.id,
 * });
 *
 * // Search for relevant documents
 * const results = await vectorStore.similaritySearch("contract termination", 5);
 * ```
 */
export function createLegalVectorStore(config: LegalVectorStoreConfig): SupabaseVectorStore {
  const {
    client,
    userId,
    matterId,
    tableName = 'document_chunks',
    queryName = 'match_document_chunks',
  } = config;

  // Create Isaacus embeddings instance
  const embeddings = new IsaacusEmbeddings();

  // Build filter for RLS-like scoping
  const filter: Record<string, unknown> = {
    user_id: userId,
  };

  if (matterId) {
    filter.matter_id = matterId;
  }

  // Create and return the vector store
  return new SupabaseVectorStore(embeddings, {
    client,
    tableName,
    queryName,
    filter,
  });
}

/**
 * Extended vector store with additional legal-specific methods
 */
export class LegalVectorStore {
  private readonly vectorStore: SupabaseVectorStore;
  private readonly client: SupabaseClient;
  private readonly userId: string;
  private readonly matterId?: string;

  constructor(config: LegalVectorStoreConfig) {
    this.client = config.client;
    this.userId = config.userId;
    this.matterId = config.matterId;
    this.vectorStore = createLegalVectorStore(config);
  }

  /**
   * Search for similar documents with optional reranking
   *
   * @param query - Search query
   * @param k - Number of results to return
   * @returns Array of documents with similarity scores
   */
  async similaritySearch(query: string, k = 10): Promise<Document[]> {
    return this.vectorStore.similaritySearch(query, k);
  }

  /**
   * Search with similarity scores included
   *
   * @param query - Search query
   * @param k - Number of results to return
   * @returns Array of [document, score] tuples
   */
  async similaritySearchWithScore(
    query: string,
    k = 10
  ): Promise<[Document, number][]> {
    return this.vectorStore.similaritySearchWithScore(query, k);
  }

  /**
   * Add documents to the vector store
   *
   * @param documents - Documents to add
   * @param options - Options including document IDs
   */
  async addDocuments(
    documents: Document[],
    options?: { ids?: string[] }
  ): Promise<void> {
    // Inject user_id into metadata for RLS
    const docsWithUser = documents.map((doc) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        user_id: this.userId,
        matter_id: this.matterId,
      },
    }));

    await this.vectorStore.addDocuments(docsWithUser, options);
  }

  /**
   * Delete documents by IDs
   *
   * @param ids - Document IDs to delete
   */
  async deleteDocuments(ids: string[]): Promise<void> {
    // Use Supabase client directly for deletion with RLS
    const { error } = await this.client
      .from('document_chunks')
      .delete()
      .in('id', ids)
      .eq('user_id', this.userId);

    if (error) {
      throw new Error(`Failed to delete documents: ${error.message}`);
    }
  }

  /**
   * Get the underlying SupabaseVectorStore for advanced operations
   */
  getVectorStore(): SupabaseVectorStore {
    return this.vectorStore;
  }

  /**
   * Search documents using the custom RPC function
   * This provides more control over filtering and results
   *
   * @param query - Search query
   * @param options - Search options
   */
  async searchWithRPC(
    query: string,
    options: {
      limit?: number;
      threshold?: number;
    } = {}
  ): Promise<Array<{
    id: string;
    documentId: string;
    content: string;
    chunkIndex: number;
    similarity: number;
    metadata: Record<string, unknown>;
  }>> {
    const { limit = 10, threshold = 0.5 } = options;

    // Generate embedding for the query
    const embeddings = new IsaacusEmbeddings();
    const queryEmbedding = await embeddings.embedQuery(query);

    // Call the RPC function
    const { data, error } = await this.client.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_count: limit,
      filter_user_id: this.userId,
      filter_matter_id: this.matterId || null,
      similarity_threshold: threshold,
    });

    if (error) {
      throw new Error(`Search failed: ${error.message}`);
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
}

/**
 * Create an instance of the extended LegalVectorStore
 */
export function createExtendedLegalVectorStore(
  config: LegalVectorStoreConfig
): LegalVectorStore {
  return new LegalVectorStore(config);
}

