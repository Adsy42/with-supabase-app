/**
 * Document & Query Classifier
 * Uses Isaacus Universal Classifier for intelligent routing and tagging
 * https://docs.isaacus.com/capabilities/universal-classification
 */

import { classify, isIsaacusConfigured } from "./client";
import type { CounselMode } from "@/lib/ai/modes";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Classification result with confidence scores
 */
export interface ClassificationResult {
  /** Best matching label */
  label: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** All labels with scores */
  allScores: Array<{ label: string; score: number }>;
}

/**
 * Query intent classification result
 */
export interface QueryIntentResult {
  /** Suggested counsel mode */
  mode: CounselMode;
  /** Confidence in the classification (0-1) */
  confidence: number;
  /** Whether AI classification was used */
  aiClassified: boolean;
}

/**
 * Document type classification result
 */
export interface DocumentTypeResult {
  /** Primary document type */
  type: DocumentType;
  /** Confidence score (0-1) */
  confidence: number;
  /** Secondary type if hybrid document */
  secondaryType?: DocumentType;
  /** Detected jurisdiction if applicable */
  jurisdiction?: string;
  /** Legal practice area */
  practiceArea?: string;
}

// ============================================================================
// CLASSIFICATION LABELS
// ============================================================================

/**
 * Query intent labels mapped to counsel modes
 */
export const QUERY_INTENT_LABELS = {
  contract_review: "contract_analysis",
  clause_analysis: "contract_analysis",
  risk_assessment: "contract_analysis",
  legal_research: "legal_research",
  case_law_search: "legal_research",
  statutory_interpretation: "legal_research",
  document_drafting: "document_drafting",
  template_creation: "document_drafting",
  due_diligence: "due_diligence",
  transaction_review: "due_diligence",
  compliance_check: "compliance",
  regulatory_analysis: "compliance",
  litigation_support: "litigation",
  dispute_analysis: "litigation",
  general_question: "general",
} as const;

/**
 * Document types for classification
 */
export type DocumentType =
  | "commercial_agreement"
  | "employment_contract"
  | "nda"
  | "lease"
  | "shareholders_agreement"
  | "terms_of_service"
  | "privacy_policy"
  | "pleading"
  | "affidavit"
  | "legislation"
  | "case_law"
  | "legal_opinion"
  | "memorandum"
  | "correspondence"
  | "other";

/**
 * Labels for document type classification
 */
export const DOCUMENT_TYPE_LABELS: DocumentType[] = [
  "commercial_agreement",
  "employment_contract",
  "nda",
  "lease",
  "shareholders_agreement",
  "terms_of_service",
  "privacy_policy",
  "pleading",
  "affidavit",
  "legislation",
  "case_law",
  "legal_opinion",
  "memorandum",
  "correspondence",
  "other",
];

/**
 * Jurisdiction labels for detection
 */
export const JURISDICTION_LABELS = [
  "Australian (Federal)",
  "Australian (NSW)",
  "Australian (VIC)",
  "Australian (QLD)",
  "Australian (WA)",
  "Australian (SA)",
  "Australian (TAS)",
  "Australian (ACT)",
  "Australian (NT)",
  "United States",
  "United Kingdom",
  "European Union",
  "International",
  "Other",
];

/**
 * Practice area labels
 */
export const PRACTICE_AREA_LABELS = [
  "Corporate/Commercial",
  "Mergers & Acquisitions",
  "Employment",
  "Intellectual Property",
  "Real Estate/Property",
  "Banking & Finance",
  "Litigation & Dispute Resolution",
  "Regulatory & Compliance",
  "Privacy & Data Protection",
  "Technology",
  "Construction",
  "Insolvency",
  "Tax",
  "Family",
  "Criminal",
  "General",
];

// ============================================================================
// QUERY CLASSIFICATION
// ============================================================================

/**
 * Classify user query to determine appropriate counsel mode
 * Uses Isaacus classifier with fallback to keyword matching
 * 
 * @param query - User's query text
 * @returns QueryIntentResult with suggested mode and confidence
 */
export async function classifyQueryIntent(
  query: string
): Promise<QueryIntentResult> {
  // If Isaacus not configured or query too short, use fallback
  if (!isIsaacusConfigured() || query.length < 10) {
    return fallbackQueryClassification(query);
  }

  try {
    const labels = Object.keys(QUERY_INTENT_LABELS);
    const results = await classify(query, labels);

    if (results.length === 0) {
      return fallbackQueryClassification(query);
    }

    // Find best match
    const best = results.reduce((max, curr) =>
      curr.score > max.score ? curr : max
    );

    // Map intent label to counsel mode
    const intentLabel = best.label as keyof typeof QUERY_INTENT_LABELS;
    const mode = QUERY_INTENT_LABELS[intentLabel] || "general";

    return {
      mode: mode as CounselMode,
      confidence: best.score,
      aiClassified: true,
    };
  } catch (error) {
    console.error("Query classification error:", error);
    return fallbackQueryClassification(query);
  }
}

/**
 * Fallback query classification using keyword matching
 * Used when Isaacus is not available
 */
function fallbackQueryClassification(query: string): QueryIntentResult {
  const lowerQuery = query.toLowerCase();

  // Simple keyword matching (existing logic)
  const keywordModes: Array<{ mode: CounselMode; keywords: string[] }> = [
    {
      mode: "contract_analysis",
      keywords: ["contract", "clause", "agreement", "terms", "indemnity", "liability"],
    },
    {
      mode: "legal_research",
      keywords: ["case", "precedent", "statute", "legislation", "law", "authority"],
    },
    {
      mode: "document_drafting",
      keywords: ["draft", "write", "prepare", "create", "template"],
    },
    {
      mode: "due_diligence",
      keywords: ["due diligence", "m&a", "merger", "acquisition", "transaction"],
    },
    {
      mode: "compliance",
      keywords: ["compliance", "regulatory", "asic", "apra", "privacy", "gdpr"],
    },
    {
      mode: "litigation",
      keywords: ["litigation", "dispute", "court", "trial", "evidence"],
    },
  ];

  for (const { mode, keywords } of keywordModes) {
    const matchCount = keywords.filter((kw) => lowerQuery.includes(kw)).length;
    if (matchCount >= 2) {
      return {
        mode,
        confidence: 0.6 + matchCount * 0.1,
        aiClassified: false,
      };
    }
  }

  return {
    mode: "general",
    confidence: 0.5,
    aiClassified: false,
  };
}

// ============================================================================
// DOCUMENT CLASSIFICATION
// ============================================================================

/**
 * Classify document type from content sample
 * 
 * @param content - Document content (first ~1000 chars recommended)
 * @returns DocumentTypeResult with type and confidence
 */
export async function classifyDocumentType(
  content: string
): Promise<DocumentTypeResult> {
  if (!isIsaacusConfigured() || content.length < 50) {
    return {
      type: "other",
      confidence: 0.3,
    };
  }

  try {
    // Take first 2000 chars for classification to save tokens
    const sample = content.slice(0, 2000);

    // Classify document type
    const typeResults = await classify(sample, DOCUMENT_TYPE_LABELS);
    const bestType = typeResults.reduce((max, curr) =>
      curr.score > max.score ? curr : max
    );

    // Classify jurisdiction
    let jurisdiction: string | undefined;
    try {
      const jurisdictionResults = await classify(sample, JURISDICTION_LABELS);
      const bestJurisdiction = jurisdictionResults.reduce((max, curr) =>
        curr.score > max.score ? curr : max
      );
      if (bestJurisdiction.score > 0.5) {
        jurisdiction = bestJurisdiction.label;
      }
    } catch {
      // Jurisdiction detection is optional
    }

    // Classify practice area
    let practiceArea: string | undefined;
    try {
      const practiceResults = await classify(sample, PRACTICE_AREA_LABELS);
      const bestPractice = practiceResults.reduce((max, curr) =>
        curr.score > max.score ? curr : max
      );
      if (bestPractice.score > 0.4) {
        practiceArea = bestPractice.label;
      }
    } catch {
      // Practice area detection is optional
    }

    // Check for secondary type if confidence is not very high
    let secondaryType: DocumentType | undefined;
    if (bestType.score < 0.8 && typeResults.length > 1) {
      const sorted = [...typeResults].sort((a, b) => b.score - a.score);
      if (sorted[1] && sorted[1].score > 0.3) {
        secondaryType = sorted[1].label as DocumentType;
      }
    }

    return {
      type: bestType.label as DocumentType,
      confidence: bestType.score,
      secondaryType,
      jurisdiction,
      practiceArea,
    };
  } catch (error) {
    console.error("Document classification error:", error);
    return {
      type: "other",
      confidence: 0.3,
    };
  }
}

/**
 * Get suggested counsel mode based on document type
 */
export function getRecommendedModeForDocument(type: DocumentType): CounselMode {
  const typeToMode: Record<DocumentType, CounselMode> = {
    commercial_agreement: "contract_analysis",
    employment_contract: "contract_analysis",
    nda: "contract_analysis",
    lease: "contract_analysis",
    shareholders_agreement: "contract_analysis",
    terms_of_service: "contract_analysis",
    privacy_policy: "compliance",
    pleading: "litigation",
    affidavit: "litigation",
    legislation: "legal_research",
    case_law: "legal_research",
    legal_opinion: "legal_research",
    memorandum: "general",
    correspondence: "general",
    other: "general",
  };

  return typeToMode[type] || "general";
}

// ============================================================================
// CLAUSE CLASSIFICATION
// ============================================================================

/**
 * Classify clause risk level
 */
export async function classifyClauseRisk(
  clauseText: string
): Promise<{ level: "low" | "medium" | "high"; confidence: number }> {
  if (!isIsaacusConfigured() || clauseText.length < 20) {
    return { level: "medium", confidence: 0.5 };
  }

  try {
    const riskLabels = [
      "low_risk_standard_clause",
      "medium_risk_notable_obligation",
      "high_risk_unusual_or_onerous",
    ];

    const results = await classify(clauseText, riskLabels);
    const best = results.reduce((max, curr) =>
      curr.score > max.score ? curr : max
    );

    let level: "low" | "medium" | "high" = "medium";
    if (best.label.includes("low")) level = "low";
    if (best.label.includes("high")) level = "high";

    return {
      level,
      confidence: best.score,
    };
  } catch (error) {
    console.error("Clause risk classification error:", error);
    return { level: "medium", confidence: 0.5 };
  }
}

/**
 * Classify if clause is mutual or unilateral
 */
export async function classifyClauseMutuality(
  clauseText: string
): Promise<{ mutual: boolean; confidence: number }> {
  if (!isIsaacusConfigured() || clauseText.length < 20) {
    return { mutual: true, confidence: 0.5 };
  }

  try {
    const labels = ["mutual_obligation", "unilateral_obligation"];
    const results = await classify(clauseText, labels);

    const mutual = results.find((r) => r.label === "mutual_obligation");
    const unilateral = results.find((r) => r.label === "unilateral_obligation");

    if (mutual && unilateral) {
      return {
        mutual: mutual.score > unilateral.score,
        confidence: Math.max(mutual.score, unilateral.score),
      };
    }

    return { mutual: true, confidence: 0.5 };
  } catch (error) {
    console.error("Clause mutuality classification error:", error);
    return { mutual: true, confidence: 0.5 };
  }
}

