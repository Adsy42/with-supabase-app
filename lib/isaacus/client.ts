/**
 * Isaacus API Client
 * Australian-first legal AI capabilities using Kanon-2 models
 * https://isaacus.com
 * API Reference: https://docs.isaacus.com/api-reference
 *
 * Models:
 * - kanon-2-embedder: 1792-dimension embeddings for legal text
 * - kanon-2-reranker: Cross-encoder reranking
 * - kanon-2-reader: Extractive question answering
 * - kanon-2-classifier: Zero-shot text classification
 * - kanon-universal-classifier: IQL-powered universal classification
 */

const ISAACUS_API_URL = "https://api.isaacus.com/v1";
const EMBEDDING_DIMENSIONS = 1792;

// Maximum batch size for embeddings API
const MAX_BATCH_SIZE = 32;

/**
 * Embedding task types for optimal retrieval
 * @see https://docs.isaacus.com/quickstart
 */
type EmbeddingTask = "retrieval/document" | "retrieval/query";

interface EmbeddingResult {
  embedding: number[];
  index: number;
}

interface EmbeddingResponse {
  embeddings: EmbeddingResult[];
  usage: {
    input_tokens: number;
    total_tokens?: number;
  };
}

/**
 * Legacy response format (for backwards compatibility)
 */
interface LegacyEmbeddingResponse {
  embeddings: number[][];
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

interface RerankResult {
  index: number;
  score: number;
}

interface RerankResponse {
  results: RerankResult[];
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

interface ExtractiveAnswer {
  answer: string;
  score: number;
  start: number;
  end: number;
}

interface ExtractiveResponse {
  answers: ExtractiveAnswer[];
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

interface ClassificationLabel {
  label: string;
  score: number;
}

interface ClassificationResponse {
  labels: ClassificationLabel[];
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

class IsaacusError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "IsaacusError";
  }
}

/**
 * Check if Isaacus API is configured
 */
export function isIsaacusConfigured(): boolean {
  return !!process.env.ISAACUS_API_KEY;
}

/**
 * Get API key or throw if not configured
 */
function getApiKey(): string {
  const apiKey = process.env.ISAACUS_API_KEY;
  if (!apiKey) {
    throw new IsaacusError(
      "ISAACUS_API_KEY environment variable is not configured"
    );
  }
  return apiKey;
}

/**
 * Make a request to the Isaacus API
 */
async function request<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  const apiKey = getApiKey();

  const response = await fetch(`${ISAACUS_API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new IsaacusError(
      `Isaacus API error: ${response.statusText}`,
      response.status,
      errorBody
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Embed documents for storage/retrieval
 * Uses task: "retrieval/document" for document embeddings
 * @see https://docs.isaacus.com/quickstart
 */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  // Process in batches to respect API limits
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);

    // Try official SDK format first, fall back to legacy
    try {
      const response = await request<EmbeddingResponse>("/embeddings", {
        model: "kanon-2-embedder",
        texts: batch,
        task: "retrieval/document" as EmbeddingTask,
      });

      // Handle new response format with EmbeddingResult objects
      const embeddings = response.embeddings.map((e) => 
        Array.isArray(e) ? e : e.embedding
      );
      allEmbeddings.push(...embeddings);
    } catch {
      // Fall back to legacy endpoint/format if new format fails
      const response = await request<LegacyEmbeddingResponse>("/embed", {
        model: "kanon-2-embedder",
        input: batch,
        task_type: "retrieval_document",
      });
      allEmbeddings.push(...response.embeddings);
    }
  }

  return allEmbeddings;
}

/**
 * Embed a query for retrieval
 * Uses task: "retrieval/query" for query embeddings
 * @see https://docs.isaacus.com/quickstart
 */
export async function embedQuery(query: string): Promise<number[]> {
  // Try official SDK format first, fall back to legacy
  try {
    const response = await request<EmbeddingResponse>("/embeddings", {
      model: "kanon-2-embedder",
      texts: [query],
      task: "retrieval/query" as EmbeddingTask,
    });

    // Handle new response format
    const firstEmbedding = response.embeddings[0];
    return Array.isArray(firstEmbedding) ? firstEmbedding : firstEmbedding.embedding;
  } catch {
    // Fall back to legacy endpoint/format
    const response = await request<LegacyEmbeddingResponse>("/embed", {
      model: "kanon-2-embedder",
      input: [query],
      task_type: "retrieval_query",
    });
    return response.embeddings[0];
  }
}

/**
 * Rerank search results using cross-encoder
 * Returns results sorted by relevance score
 */
export async function rerank(
  query: string,
  documents: string[],
  topK?: number
): Promise<RerankResult[]> {
  if (documents.length === 0) {
    return [];
  }

  const response = await request<RerankResponse>("/rerank", {
    model: "kanon-2-reranker",
    query,
    documents,
    top_k: topK ?? documents.length,
  });

  return response.results;
}

/**
 * Extract answers from context using extractive QA
 * Used for generating citations with exact quotes
 */
export async function extractAnswer(
  question: string,
  context: string
): Promise<ExtractiveAnswer[]> {
  const response = await request<ExtractiveResponse>("/extract", {
    model: "kanon-2-reader",
    question,
    context,
  });

  return response.answers;
}

/**
 * Classify text with zero-shot classification
 * Useful for document type detection, sentiment analysis, etc.
 */
export async function classify(
  text: string,
  labels: string[]
): Promise<ClassificationLabel[]> {
  const response = await request<ClassificationResponse>("/classify", {
    model: "kanon-2-classifier",
    text,
    labels,
  });

  return response.labels;
}

// Export constants
export { EMBEDDING_DIMENSIONS, IsaacusError };


