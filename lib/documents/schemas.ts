/**
 * Zod schemas for extracted document fields
 *
 * These schemas define the structured data extracted from legal documents
 */

import { z } from "zod";

/**
 * Party in a legal document
 */
export const PartySchema = z.object({
  name: z.string().describe("Full legal name of the party"),
  role: z
    .string()
    .optional()
    .describe("Role in the agreement (e.g., buyer, seller, licensor)"),
  type: z
    .enum(["individual", "company", "trust", "partnership", "other"])
    .optional()
    .describe("Type of entity"),
  abn: z.string().optional().describe("Australian Business Number if available"),
  acn: z.string().optional().describe("Australian Company Number if available"),
});

export type Party = z.infer<typeof PartySchema>;

/**
 * Date information extracted from document
 */
export const DateInfoSchema = z.object({
  date: z.string().optional().describe("Date in ISO format (YYYY-MM-DD)"),
  description: z.string().optional().describe("What this date represents"),
});

/**
 * Monetary amount
 */
export const AmountSchema = z.object({
  value: z.number().optional().describe("Numeric value"),
  currency: z.string().default("AUD").describe("Currency code"),
  description: z.string().optional().describe("What this amount is for"),
});

/**
 * Contract document extracted fields
 */
export const ContractFieldsSchema = z.object({
  // Document identification
  document_type: z
    .enum([
      "nda",
      "msa",
      "employment",
      "lease",
      "loan",
      "share_purchase",
      "asset_purchase",
      "licence",
      "services",
      "supply",
      "other",
    ])
    .optional()
    .describe("Type of contract document"),

  // Parties
  parties: z.array(PartySchema).default([]).describe("All parties to the agreement"),

  // Key dates
  effective_date: z
    .string()
    .optional()
    .describe("When the contract takes effect (ISO format)"),
  execution_date: z
    .string()
    .optional()
    .describe("When the contract was signed (ISO format)"),
  termination_date: z
    .string()
    .optional()
    .describe("When the contract ends (ISO format)"),
  term_length: z
    .string()
    .optional()
    .describe("Duration of the contract (e.g., '2 years')"),

  // Jurisdiction
  governing_law: z
    .string()
    .optional()
    .describe("Jurisdiction governing the contract (e.g., 'NSW, Australia')"),
  dispute_resolution: z
    .string()
    .optional()
    .describe("How disputes are resolved (arbitration, mediation, courts)"),
  jurisdiction: z
    .string()
    .optional()
    .describe("Court jurisdiction for disputes"),

  // Financial terms
  contract_value: AmountSchema.optional().describe("Total contract value"),
  liability_cap: AmountSchema.optional().describe("Maximum liability amount"),
  key_amounts: z
    .array(AmountSchema)
    .default([])
    .describe("Other significant monetary amounts"),

  // Key terms
  confidentiality_term: z
    .string()
    .optional()
    .describe("How long confidentiality obligations last"),
  termination_rights: z
    .string()
    .optional()
    .describe("Summary of termination rights"),
  renewal_terms: z
    .string()
    .optional()
    .describe("Auto-renewal and notice period"),
  assignment_rights: z
    .string()
    .optional()
    .describe("Whether parties can assign their rights"),
  ip_ownership: z
    .string()
    .optional()
    .describe("Who owns intellectual property created under the contract"),
  indemnification: z
    .string()
    .optional()
    .describe("Summary of indemnification provisions"),

  // Summary
  summary: z
    .string()
    .optional()
    .describe("Brief summary of what the document is about"),
});

export type ContractFields = z.infer<typeof ContractFieldsSchema>;

/**
 * Litigation document extracted fields
 */
export const LitigationFieldsSchema = z.object({
  document_type: z
    .enum([
      "complaint",
      "answer",
      "motion",
      "brief",
      "affidavit",
      "judgment",
      "order",
      "transcript",
      "other",
    ])
    .optional()
    .describe("Type of litigation document"),

  // Case information
  case_name: z.string().optional().describe("Name of the case"),
  case_number: z.string().optional().describe("Court case/file number"),
  court: z.string().optional().describe("Name of the court"),
  judge: z.string().optional().describe("Name of the judge"),

  // Parties
  parties: z.array(PartySchema).default([]).describe("Parties involved"),

  // Key dates
  filing_date: z.string().optional().describe("When document was filed"),
  hearing_date: z.string().optional().describe("Date of hearing"),
  judgment_date: z.string().optional().describe("Date of judgment"),
  key_dates: z.array(DateInfoSchema).default([]).describe("Other important dates"),

  // Substantive
  claims: z.array(z.string()).default([]).describe("Types of claims or causes of action"),
  relief_sought: z.string().optional().describe("What relief is being requested"),
  outcome: z.string().optional().describe("Decision or settlement"),
  key_holdings: z.array(z.string()).default([]).describe("Important legal holdings"),

  // Summary
  summary: z.string().optional().describe("Brief summary of the document"),
});

export type LitigationFields = z.infer<typeof LitigationFieldsSchema>;

/**
 * Generic document fields (fallback)
 */
export const GenericFieldsSchema = z.object({
  document_type: z.string().optional().describe("Type of document"),
  title: z.string().optional().describe("Document title"),
  date: z.string().optional().describe("Primary date associated with document"),
  parties: z.array(PartySchema).default([]).describe("Parties mentioned"),
  summary: z.string().optional().describe("Brief summary"),
  key_points: z.array(z.string()).default([]).describe("Key points from the document"),
});

export type GenericFields = z.infer<typeof GenericFieldsSchema>;

/**
 * Union of all field types
 */
export type ExtractedFields = ContractFields | LitigationFields | GenericFields;



