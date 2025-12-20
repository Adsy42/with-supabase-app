/**
 * Document field extraction
 *
 * Uses LLM to extract structured fields from legal documents
 * Integrates with Isaacus for document classification
 */

import { classify } from "@/lib/isaacus/client";
import type { ContractFields, LitigationFields, GenericFields, ExtractedFields } from "./schemas";

// Document type labels for classification
const DOCUMENT_TYPES = [
  "NDA/Confidentiality Agreement",
  "Master Services Agreement",
  "Employment Contract",
  "Commercial Lease",
  "Loan Agreement",
  "Share Purchase Agreement",
  "Asset Purchase Agreement",
  "Licence Agreement",
  "Services Agreement",
  "Supply Agreement",
  "Court Filing/Litigation",
  "Corporate Resolution",
  "Power of Attorney",
  "Will/Testament",
  "Other Legal Document",
];

/**
 * Classify a document to determine its type
 */
export async function classifyDocument(
  text: string
): Promise<{ type: string; confidence: number }> {
  try {
    // Use first 2000 characters for classification
    const sample = text.slice(0, 2000);
    const results = await classify(sample, DOCUMENT_TYPES);

    if (results.length > 0) {
      return {
        type: results[0].label,
        confidence: results[0].score,
      };
    }
  } catch (error) {
    console.error("Document classification error:", error);
  }

  return {
    type: "Other Legal Document",
    confidence: 0.5,
  };
}

/**
 * Map classification label to schema document type
 */
function mapToDocumentType(
  label: string
): ContractFields["document_type"] | LitigationFields["document_type"] | undefined {
  const mapping: Record<string, string> = {
    "NDA/Confidentiality Agreement": "nda",
    "Master Services Agreement": "msa",
    "Employment Contract": "employment",
    "Commercial Lease": "lease",
    "Loan Agreement": "loan",
    "Share Purchase Agreement": "share_purchase",
    "Asset Purchase Agreement": "asset_purchase",
    "Licence Agreement": "licence",
    "Services Agreement": "services",
    "Supply Agreement": "supply",
    "Court Filing/Litigation": "complaint",
  };

  return mapping[label] as ContractFields["document_type"];
}

/**
 * Extract structured fields from a document
 * This is a placeholder implementation - in production, this would use an LLM
 */
export async function extractFields(
  text: string
): Promise<ExtractedFields> {
  // Classify the document
  const classification = await classifyDocument(text);
  const docType = mapToDocumentType(classification.type);

  // Check if it's a litigation document
  const isLitigation = classification.type === "Court Filing/Litigation";

  // Basic extraction using regex patterns (placeholder for LLM extraction)
  const fields = extractBasicFields(text);

  if (isLitigation) {
    const litigationFields: LitigationFields = {
      document_type: docType as LitigationFields["document_type"],
      case_name: fields.title,
      parties: fields.parties,
      filing_date: fields.date,
      claims: [],
      key_dates: [],
      summary: fields.summary,
      key_holdings: [],
    };
    return litigationFields;
  }

  const contractFields: ContractFields = {
    document_type: docType as ContractFields["document_type"],
    parties: fields.parties,
    effective_date: fields.date,
    governing_law: extractGoverningLaw(text),
    summary: fields.summary,
    key_amounts: [],
  };

  return contractFields;
}

/**
 * Extract basic fields using regex patterns
 * This is a simple fallback - production would use LLM
 */
function extractBasicFields(text: string): GenericFields {
  const fields: GenericFields = {
    parties: [],
    key_points: [],
  };

  // Try to extract date (Australian format DD/MM/YYYY or ISO)
  const datePattern = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/;
  const dateMatch = text.match(datePattern);
  if (dateMatch) {
    fields.date = dateMatch[1];
  }

  // Try to extract parties (look for "between X and Y" patterns)
  const betweenPattern = /between\s+([A-Z][A-Za-z\s,]+(?:Ltd|Pty Ltd|Limited|Inc\.?)?)\s+(?:and|&)\s+([A-Z][A-Za-z\s,]+(?:Ltd|Pty Ltd|Limited|Inc\.?)?)/i;
  const betweenMatch = text.match(betweenPattern);
  if (betweenMatch) {
    fields.parties = [
      { name: betweenMatch[1].trim() },
      { name: betweenMatch[2].trim() },
    ];
  }

  // Generate summary from first 500 characters
  const cleanText = text.replace(/\s+/g, " ").trim();
  fields.summary = cleanText.slice(0, 500) + (cleanText.length > 500 ? "..." : "");

  return fields;
}

/**
 * Extract governing law from document text
 */
function extractGoverningLaw(text: string): string | undefined {
  const patterns = [
    /govern(?:ed|ing)\s+(?:by\s+)?(?:the\s+)?laws?\s+of\s+([^.]+)/i,
    /law\s+of\s+([A-Za-z\s]+)\s+(?:shall\s+)?(?:govern|apply)/i,
    /(?:NSW|Victoria|Queensland|South\s+Australia|Western\s+Australia|Tasmania|ACT|NT)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1]?.trim() || match[0].trim();
    }
  }

  return undefined;
}

/**
 * Check if Isaacus API is available for extraction
 */
export function isExtractionAvailable(): boolean {
  return !!process.env.ISAACUS_API_KEY;
}

