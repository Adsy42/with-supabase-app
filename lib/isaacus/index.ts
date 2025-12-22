/**
 * Isaacus API Integration
 * Full legal AI capabilities for Counsel
 *
 * @see https://docs.isaacus.com
 *
 * Capabilities:
 * - Embeddings: Legal document and query embeddings (kanon-2-embedder)
 * - Reranking: Cross-encoder relevance scoring (kanon-2-reranker)
 * - Extractive QA: Precise answer extraction (kanon-2-reader)
 * - Classification: Zero-shot text classification (kanon-2-classifier)
 * - IQL: Isaacus Query Language for clause detection (kanon-universal-classifier)
 */

// Core client functions
export {
  isIsaacusConfigured,
  embedDocuments,
  embedQuery,
  rerank,
  extractAnswer,
  classify,
  IsaacusError,
  EMBEDDING_DIMENSIONS,
} from "./client";

// IQL (Isaacus Query Language)
export {
  // Query execution
  executeIQL,
  scanWithIQL,
  scanContractClauses,
  scanHighRiskClauses,
  scanDueDiligenceClauses,
  hasClause,
  findBestMatch,
  // Query builder
  iql,
  IQLBuilder,
  // Templates
  IQL_TEMPLATES,
  IQL_TEMPLATE_GROUPS,
  // Types
  type IQLResult,
  type IQLScanResult,
} from "./iql";

// Document & Query Classification
export {
  // Query classification
  classifyQueryIntent,
  // Document classification
  classifyDocumentType,
  getRecommendedModeForDocument,
  // Clause classification
  classifyClauseRisk,
  classifyClauseMutuality,
  // Labels
  QUERY_INTENT_LABELS,
  DOCUMENT_TYPE_LABELS,
  JURISDICTION_LABELS,
  PRACTICE_AREA_LABELS,
  // Types
  type ClassificationResult,
  type QueryIntentResult,
  type DocumentTypeResult,
  type DocumentType,
} from "./document-classifier";

