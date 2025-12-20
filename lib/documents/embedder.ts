/**
 * Document embedding pipeline
 *
 * Generates vector embeddings for document chunks
 * using Isaacus Kanon 2 (1792 dimensions)
 */

import { embedDocuments } from "@/lib/isaacus/client";
import type { Chunk } from "./chunker";

export interface EmbeddedChunk extends Chunk {
  embedding: number[];
}

/**
 * Embed a batch of chunks
 * Processes in batches of 10 to stay within API limits
 */
export async function embedChunks(chunks: Chunk[]): Promise<EmbeddedChunk[]> {
  const BATCH_SIZE = 10;
  const results: EmbeddedChunk[] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.content);

    try {
      const embeddings = await embedDocuments(texts);

      for (let j = 0; j < batch.length; j++) {
        results.push({
          ...batch[j],
          embedding: embeddings[j],
        });
      }
    } catch (error) {
      console.error(`Error embedding batch ${i / BATCH_SIZE}:`, error);
      // Continue with other batches
    }
  }

  return results;
}

/**
 * Check if Isaacus API is configured
 */
export function isIsaacusConfigured(): boolean {
  return !!process.env.ISAACUS_API_KEY;
}

