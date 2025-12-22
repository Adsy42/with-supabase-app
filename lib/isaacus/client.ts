/**
 * Isaacus API Client
 *
 * Finnish legal AI API for embeddings, reranking, extractive QA, and classification.
 * API Documentation: https://isaacus.com/docs
 */

// Types for Isaacus API responses
export interface IsaacusEmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface IsaacusRerankResult {
  index: number;
  relevance_score: number;
  document: string;
}

export interface IsaacusRerankResponse {
  results: IsaacusRerankResult[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface IsaacusExtractiveQAAnswer {
  text: string;
  score: number;
  start: number;
  end: number;
  context: string;
}

export interface IsaacusExtractiveQAResponse {
  answers: IsaacusExtractiveQAAnswer[];
  model: string;
}

export interface IsaacusClassifyResult {
  label: string;
  score: number;
}

export interface IsaacusClassifyResponse {
  classifications: IsaacusClassifyResult[][];
  model: string;
}

// Configuration
interface IsaacusClientConfig {
  apiKey: string;
  baseUrl?: string;
}

/**
 * Isaacus API Client for Finnish legal document intelligence
 */
export class IsaacusClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config?: IsaacusClientConfig) {
    this.apiKey = config?.apiKey || process.env.ISAACUS_API_KEY || '';
    this.baseUrl = config?.baseUrl || 'https://api.isaacus.com/v1';

    if (!this.apiKey) {
      console.warn(
        'IsaacusClient: No API key provided. Set ISAACUS_API_KEY environment variable.'
      );
    }
  }

  /**
   * Generate embeddings for text(s)
   * Returns 1024-dimensional vectors optimized for Finnish legal content
   */
  async embed(
    texts: string | string[],
    model: string = 'isaacus-embed-1'
  ): Promise<IsaacusEmbeddingResponse> {
    const input = Array.isArray(texts) ? texts : [texts];

    const response = await this.request<IsaacusEmbeddingResponse>(
      '/embeddings',
      {
        input,
        model,
      }
    );

    return response;
  }

  /**
   * Embed a single text and return just the vector
   */
  async embedSingle(
    text: string,
    model: string = 'isaacus-embed-1'
  ): Promise<number[]> {
    const response = await this.embed(text, model);
    return response.embeddings[0];
  }

  /**
   * Rerank documents by relevance to a query
   * Returns documents sorted by relevance score
   */
  async rerank(
    query: string,
    documents: string[],
    options: {
      model?: string;
      top_n?: number;
      return_documents?: boolean;
    } = {}
  ): Promise<IsaacusRerankResponse> {
    const response = await this.request<IsaacusRerankResponse>('/rerank', {
      query,
      documents,
      model: options.model || 'isaacus-rerank-1',
      top_n: options.top_n,
      return_documents: options.return_documents ?? true,
    });

    return response;
  }

  /**
   * Extract answers from context using extractive QA
   * Returns precise text spans that answer the question
   */
  async extractiveQA(
    question: string,
    context: string,
    options: {
      model?: string;
      top_k?: number;
      max_answer_length?: number;
    } = {}
  ): Promise<IsaacusExtractiveQAResponse> {
    const response = await this.request<IsaacusExtractiveQAResponse>(
      '/extractive-qa',
      {
        question,
        context,
        model: options.model || 'isaacus-qa-1',
        top_k: options.top_k || 3,
        max_answer_length: options.max_answer_length || 512,
      }
    );

    return response;
  }

  /**
   * Classify text into predefined categories
   * Useful for legal clause classification, document type detection
   */
  async classify(
    texts: string | string[],
    labels: string[],
    options: {
      model?: string;
      multi_label?: boolean;
    } = {}
  ): Promise<IsaacusClassifyResponse> {
    const input = Array.isArray(texts) ? texts : [texts];

    const response = await this.request<IsaacusClassifyResponse>('/classify', {
      texts: input,
      labels,
      model: options.model || 'isaacus-classify-1',
      multi_label: options.multi_label ?? false,
    });

    return response;
  }

  /**
   * Classify a single text and return the top label
   */
  async classifySingle(
    text: string,
    labels: string[],
    options: {
      model?: string;
      multi_label?: boolean;
    } = {}
  ): Promise<{ label: string; score: number }> {
    const response = await this.classify(text, labels, options);
    const results = response.classifications[0];

    if (!results || results.length === 0) {
      return { label: 'unknown', score: 0 };
    }

    // Sort by score and return the top one
    const sorted = [...results].sort((a, b) => b.score - a.score);
    return sorted[0];
  }

  /**
   * Make an authenticated request to the Isaacus API
   */
  private async request<T>(endpoint: string, body: object): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new IsaacusAPIError(
        `Isaacus API error (${response.status}): ${errorText}`,
        response.status,
        errorText
      );
    }

    return response.json() as Promise<T>;
  }
}

/**
 * Custom error class for Isaacus API errors
 */
export class IsaacusAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody: string
  ) {
    super(message);
    this.name = 'IsaacusAPIError';
  }
}

// Singleton instance for convenience
let defaultClient: IsaacusClient | null = null;

/**
 * Get the default Isaacus client (singleton)
 */
export function getIsaacusClient(): IsaacusClient {
  if (!defaultClient) {
    defaultClient = new IsaacusClient();
  }
  return defaultClient;
}

/**
 * Create a new Isaacus client with custom configuration
 */
export function createIsaacusClient(config: IsaacusClientConfig): IsaacusClient {
  return new IsaacusClient(config);
}

