/**
 * LangChain Embeddings implementation using Isaacus API
 *
 * Provides a standard LangChain Embeddings interface for use with
 * LangChain/LangGraph document processing and vector stores.
 */

import { Embeddings, type EmbeddingsParams } from '@langchain/core/embeddings';
import { IsaacusClient, getIsaacusClient } from './client';

export interface IsaacusEmbeddingsParams extends EmbeddingsParams {
  /**
   * The Isaacus model to use for embeddings
   * @default "isaacus-embed-1"
   */
  model?: string;

  /**
   * Maximum number of texts to embed in a single batch
   * @default 100
   */
  batchSize?: number;

  /**
   * Custom Isaacus client instance
   */
  client?: IsaacusClient;

  /**
   * Isaacus API key (optional if ISAACUS_API_KEY env var is set)
   */
  apiKey?: string;
}

/**
 * LangChain Embeddings class using Isaacus API
 *
 * @example
 * ```typescript
 * import { IsaacusEmbeddings } from '@/lib/isaacus/embeddings';
 *
 * const embeddings = new IsaacusEmbeddings();
 *
 * // Embed a single query
 * const queryVector = await embeddings.embedQuery("What is contract law?");
 *
 * // Embed multiple documents
 * const docVectors = await embeddings.embedDocuments([
 *   "Document 1 content...",
 *   "Document 2 content..."
 * ]);
 * ```
 */
export class IsaacusEmbeddings extends Embeddings {
  private readonly client: IsaacusClient;
  private readonly model: string;
  private readonly batchSize: number;

  constructor(params: IsaacusEmbeddingsParams = {}) {
    super(params);

    this.model = params.model || 'isaacus-embed-1';
    this.batchSize = params.batchSize || 100;

    // Use provided client or create/get one
    if (params.client) {
      this.client = params.client;
    } else if (params.apiKey) {
      this.client = new IsaacusClient({ apiKey: params.apiKey });
    } else {
      this.client = getIsaacusClient();
    }
  }

  /**
   * Embed a query string for similarity search
   * Returns a 1024-dimensional vector
   */
  async embedQuery(text: string): Promise<number[]> {
    return this.caller.call(async () => {
      const vector = await this.client.embedSingle(text, this.model);
      return vector;
    });
  }

  /**
   * Embed multiple documents
   * Automatically batches requests for efficiency
   */
  async embedDocuments(documents: string[]): Promise<number[][]> {
    if (documents.length === 0) {
      return [];
    }

    const batches: string[][] = [];
    for (let i = 0; i < documents.length; i += this.batchSize) {
      batches.push(documents.slice(i, i + this.batchSize));
    }

    const allEmbeddings: number[][] = [];

    for (const batch of batches) {
      const result = await this.caller.call(async () => {
        const response = await this.client.embed(batch, this.model);
        return response.embeddings;
      });
      allEmbeddings.push(...result);
    }

    return allEmbeddings;
  }
}

/**
 * Create an Isaacus embeddings instance with default configuration
 */
export function createIsaacusEmbeddings(
  params?: IsaacusEmbeddingsParams
): IsaacusEmbeddings {
  return new IsaacusEmbeddings(params);
}

