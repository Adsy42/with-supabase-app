/**
 * Isaacus API Client
 *
 * Australian-first legal AI capabilities:
 * - Kanon 2 Embeddings (1792 dimensions)
 * - Legal reranking
 * - Extractive QA for citations
 * - Document classification
 *
 * @see https://docs.isaacus.com
 */

const ISAACUS_API_URL = "https://api.isaacus.com";

export interface EmbeddingResponse {
  embeddings: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    total_tokens: number;
  };
}

export interface RerankResponse {
  results: Array<{
    index: number;
    relevance_score: number;
    document: string;
  }>;
  model: string;
}

export interface ExtractiveQAResponse {
  answers: Array<{
    text: string;
    score: number;
    start: number;
    end: number;
  }>;
  model: string;
}

export interface ClassificationResponse {
  classifications: Array<{
    label: string;
    score: number;
  }>;
  model: string;
}

class IsaacusClient {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ISAACUS_API_KEY || "";
  }

  private async request<T>(
    endpoint: string,
    body: Record<string, unknown>
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error(
        "ISAACUS_API_KEY is not configured. Please add it to your environment variables."
      );
    }

    const response = await fetch(`${ISAACUS_API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Isaacus API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Generate embeddings for documents
   * Uses Kanon 2 Embedder - 1792 dimensions, optimized for legal text
   */
  async embedDocuments(texts: string[]): Promise<number[][]> {
    const response = await this.request<EmbeddingResponse>("/embeddings", {
      model: "kanon-2-embedder",
      texts,
      task: "retrieval/document",
    });

    return response.embeddings.map((e) => e.embedding);
  }

  /**
   * Generate embedding for a query
   * Uses query-optimized task type for better retrieval
   */
  async embedQuery(query: string): Promise<number[]> {
    const response = await this.request<EmbeddingResponse>("/embeddings", {
      model: "kanon-2-embedder",
      texts: [query],
      task: "retrieval/query",
    });

    return response.embeddings[0].embedding;
  }

  /**
   * Rerank search results for better relevance
   * Returns documents sorted by relevance to query
   */
  async rerank(
    query: string,
    documents: string[],
    topK = 10
  ): Promise<RerankResponse["results"]> {
    const response = await this.request<RerankResponse>("/rerank", {
      model: "kanon-2-reranker",
      query,
      documents,
      top_k: topK,
    });

    return response.results;
  }

  /**
   * Extract exact answers from context
   * Returns spans with confidence scores for citations
   */
  async extractAnswer(
    question: string,
    context: string
  ): Promise<ExtractiveQAResponse["answers"]> {
    const response = await this.request<ExtractiveQAResponse>("/extractive-qa", {
      model: "kanon-2-reader",
      question,
      context,
    });

    return response.answers;
  }

  /**
   * Classify text into categories
   * Useful for document type detection
   */
  async classify(
    text: string,
    labels: string[]
  ): Promise<ClassificationResponse["classifications"]> {
    const response = await this.request<ClassificationResponse>("/classification", {
      model: "kanon-2-classifier",
      text,
      labels,
    });

    return response.classifications;
  }
}

// Singleton instance
export const isaacus = new IsaacusClient();

// Convenience exports
export const embedDocuments = (texts: string[]) =>
  isaacus.embedDocuments(texts);
export const embedQuery = (query: string) => isaacus.embedQuery(query);
export const rerank = (query: string, documents: string[], topK?: number) =>
  isaacus.rerank(query, documents, topK);
export const extractAnswer = (question: string, context: string) =>
  isaacus.extractAnswer(question, context);
export const classify = (text: string, labels: string[]) =>
  isaacus.classify(text, labels);
