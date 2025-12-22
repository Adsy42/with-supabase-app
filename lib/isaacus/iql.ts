/**
 * Isaacus Query Language (IQL) Module
 * https://docs.isaacus.com/iql/introduction
 *
 * IQL combines natural language with Boolean logic for precise
 * legal document analysis. This module provides:
 * - IQL query parser and builder
 * - Pre-built legal clause templates
 * - Integration with Universal Classifier API
 */

import { isIsaacusConfigured, IsaacusError } from "./client";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result from an IQL query execution
 */
export interface IQLResult {
  /** The IQL query that was executed */
  query: string;
  /** Score from 0-1 indicating likelihood the statement is true */
  score: number;
  /** The text that was analyzed */
  text: string;
  /** Index in the input texts array */
  index: number;
}

/**
 * Batch result from scanning multiple texts with multiple queries
 */
export interface IQLScanResult {
  /** The template/query type that matched */
  clauseType: string;
  /** The IQL query used */
  query: string;
  /** Score from 0-1 */
  score: number;
  /** The text chunk that was analyzed */
  text: string;
  /** Index in the input texts array */
  textIndex: number;
}

/**
 * Response from Universal Classifier API
 */
interface UniversalClassifierResponse {
  results: Array<{
    index: number;
    score: number;
  }>;
  usage: {
    input_tokens: number;
    total_tokens: number;
  };
}

// ============================================================================
// IQL TEMPLATES
// ============================================================================

/**
 * Pre-built IQL templates for common legal clause types
 * Based on https://docs.isaacus.com/iql/templates
 */
export const IQL_TEMPLATES = {
  // Core clause types
  confidentiality: "{IS confidentiality clause}",
  indemnity: "{IS indemnity clause}",
  termination: "{IS termination clause}",
  limitation: "{IS limitation of liability clause}",
  assignment: "{IS assignment clause}",
  changeOfControl: "{IS change of control clause}",
  intellectualProperty: "{IS intellectual property clause}",
  warranty: "{IS warranty clause}",
  representation: "{IS representation clause}",
  covenant: "{IS covenant clause}",
  force_majeure: "{IS force majeure clause}",
  governing_law: "{IS governing law clause}",
  dispute_resolution: "{IS dispute resolution clause}",
  notice: "{IS notice clause}",
  severability: "{IS severability clause}",
  entire_agreement: "{IS entire agreement clause}",
  amendment: "{IS amendment clause}",
  waiver: "{IS waiver clause}",
  counterparts: "{IS counterparts clause}",
  survival: "{IS survival clause}",
  
  // Relationship types
  mutual: "{IS mutual clause}",
  unilateral: "{IS unilateral clause}",
  
  // Party-specific templates (functions)
  obligating: (party: string) => `{IS clause obligating "${party}"}`,
  entitling: (party: string) => `{IS clause entitling "${party}"}`,
  binding: (party: string) => `{IS clause binding "${party}"}`,
  
  // Custom clause matching
  custom: (description: string) => `{IS clause that "${description}"}`,
  
  // Risk indicators
  unlimited_liability: '{IS clause that "creates unlimited liability"}',
  broad_indemnity: '{IS clause that "requires broad indemnification"}',
  unilateral_termination: '{IS clause that "allows unilateral termination"}',
  automatic_renewal: '{IS clause that "provides for automatic renewal"}',
  non_compete: "{IS non-compete clause}",
  exclusivity: "{IS exclusivity clause}",
} as const;

/**
 * Grouped templates by category for systematic scanning
 */
export const IQL_TEMPLATE_GROUPS = {
  /** High-risk clauses that need careful review */
  highRisk: [
    { name: "indemnity", query: IQL_TEMPLATES.indemnity },
    { name: "limitation", query: IQL_TEMPLATES.limitation },
    { name: "unlimited_liability", query: IQL_TEMPLATES.unlimited_liability },
    { name: "broad_indemnity", query: IQL_TEMPLATES.broad_indemnity },
    { name: "unilateral_termination", query: IQL_TEMPLATES.unilateral_termination },
  ],
  
  /** Core contractual clauses */
  core: [
    { name: "termination", query: IQL_TEMPLATES.termination },
    { name: "confidentiality", query: IQL_TEMPLATES.confidentiality },
    { name: "assignment", query: IQL_TEMPLATES.assignment },
    { name: "changeOfControl", query: IQL_TEMPLATES.changeOfControl },
    { name: "intellectualProperty", query: IQL_TEMPLATES.intellectualProperty },
  ],
  
  /** Standard boilerplate clauses */
  boilerplate: [
    { name: "governing_law", query: IQL_TEMPLATES.governing_law },
    { name: "dispute_resolution", query: IQL_TEMPLATES.dispute_resolution },
    { name: "notice", query: IQL_TEMPLATES.notice },
    { name: "severability", query: IQL_TEMPLATES.severability },
    { name: "entire_agreement", query: IQL_TEMPLATES.entire_agreement },
    { name: "amendment", query: IQL_TEMPLATES.amendment },
  ],
  
  /** M&A / Due diligence specific */
  dueDiligence: [
    { name: "changeOfControl", query: IQL_TEMPLATES.changeOfControl },
    { name: "assignment", query: IQL_TEMPLATES.assignment },
    { name: "non_compete", query: IQL_TEMPLATES.non_compete },
    { name: "exclusivity", query: IQL_TEMPLATES.exclusivity },
    { name: "termination", query: IQL_TEMPLATES.termination },
  ],
} as const;

// ============================================================================
// IQL QUERY BUILDER
// ============================================================================

/**
 * Build complex IQL queries with Boolean operators
 */
export class IQLBuilder {
  private statements: string[] = [];

  /**
   * Add a statement to the query
   */
  add(statement: string): this {
    this.statements.push(statement);
    return this;
  }

  /**
   * Add an IS template statement
   */
  is(clauseType: string): this {
    this.statements.push(`{IS ${clauseType}}`);
    return this;
  }

  /**
   * Add a custom clause description
   */
  clauseThat(description: string): this {
    this.statements.push(`{IS clause that "${description}"}`);
    return this;
  }

  /**
   * Add a party obligation check
   */
  obligating(party: string): this {
    this.statements.push(`{IS clause obligating "${party}"}`);
    return this;
  }

  /**
   * Add a party entitlement check
   */
  entitling(party: string): this {
    this.statements.push(`{IS clause entitling "${party}"}`);
    return this;
  }

  /**
   * Combine statements with AND (returns minimum score)
   */
  and(): this {
    if (this.statements.length >= 2) {
      const right = this.statements.pop()!;
      const left = this.statements.pop()!;
      this.statements.push(`${left} AND ${right}`);
    }
    return this;
  }

  /**
   * Combine statements with OR (returns maximum score)
   */
  or(): this {
    if (this.statements.length >= 2) {
      const right = this.statements.pop()!;
      const left = this.statements.pop()!;
      this.statements.push(`${left} OR ${right}`);
    }
    return this;
  }

  /**
   * Negate the last statement (returns complement)
   */
  not(): this {
    if (this.statements.length >= 1) {
      const statement = this.statements.pop()!;
      this.statements.push(`NOT ${statement}`);
    }
    return this;
  }

  /**
   * Build the final IQL query string
   */
  build(): string {
    if (this.statements.length === 0) {
      throw new Error("No statements added to IQL query");
    }
    return this.statements.join(" ");
  }

  /**
   * Reset the builder
   */
  reset(): this {
    this.statements = [];
    return this;
  }
}

/**
 * Create a new IQL query builder
 */
export function iql(): IQLBuilder {
  return new IQLBuilder();
}

// ============================================================================
// IQL EXECUTION
// ============================================================================

const ISAACUS_API_URL = "https://api.isaacus.com/v1";

/**
 * Execute an IQL query against texts using Universal Classifier
 * 
 * @param query - IQL query string (e.g., "{IS confidentiality clause}")
 * @param texts - Array of text chunks to analyze
 * @returns Array of results with scores for each text
 */
export async function executeIQL(
  query: string,
  texts: string[]
): Promise<IQLResult[]> {
  if (!isIsaacusConfigured()) {
    throw new IsaacusError("ISAACUS_API_KEY not configured");
  }

  if (texts.length === 0) {
    return [];
  }

  const apiKey = process.env.ISAACUS_API_KEY!;

  const response = await fetch(`${ISAACUS_API_URL}/classify/universal`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "kanon-universal-classifier",
      query,
      texts,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new IsaacusError(
      `IQL execution failed: ${response.statusText}`,
      response.status,
      errorBody
    );
  }

  const data = (await response.json()) as UniversalClassifierResponse;

  return data.results.map((result) => ({
    query,
    score: result.score,
    text: texts[result.index],
    index: result.index,
  }));
}

/**
 * Scan texts with multiple IQL templates
 * 
 * @param texts - Array of text chunks to scan
 * @param templates - Array of template objects with name and query
 * @param threshold - Minimum score to include in results (default 0.5)
 * @returns Array of scan results above threshold, sorted by score
 */
export async function scanWithIQL(
  texts: string[],
  templates: Array<{ name: string; query: string }>,
  threshold: number = 0.5
): Promise<IQLScanResult[]> {
  if (!isIsaacusConfigured() || texts.length === 0 || templates.length === 0) {
    return [];
  }

  const allResults: IQLScanResult[] = [];

  // Execute each template query
  // Note: Consider batching or parallelizing for production
  for (const template of templates) {
    try {
      const results = await executeIQL(template.query, texts);
      
      for (const result of results) {
        if (result.score >= threshold) {
          allResults.push({
            clauseType: template.name,
            query: template.query,
            score: result.score,
            text: result.text,
            textIndex: result.index,
          });
        }
      }
    } catch (error) {
      console.error(`IQL scan failed for ${template.name}:`, error);
      // Continue with other templates
    }
  }

  // Sort by score descending
  return allResults.sort((a, b) => b.score - a.score);
}

/**
 * Scan for high-risk clauses in contract chunks
 * 
 * @param texts - Array of contract text chunks
 * @param threshold - Minimum score threshold (default 0.7)
 * @returns High-risk clause results
 */
export async function scanHighRiskClauses(
  texts: string[],
  threshold: number = 0.7
): Promise<IQLScanResult[]> {
  const templates: Array<{ name: string; query: string }> = [
    ...IQL_TEMPLATE_GROUPS.highRisk,
  ];
  return scanWithIQL(texts, templates, threshold);
}

/**
 * Comprehensive contract clause scan
 * Scans for all core and high-risk clauses
 * 
 * @param texts - Array of contract text chunks
 * @param threshold - Minimum score threshold (default 0.6)
 * @returns All detected clause results
 */
export async function scanContractClauses(
  texts: string[],
  threshold: number = 0.6
): Promise<IQLScanResult[]> {
  const templates: Array<{ name: string; query: string }> = [
    ...IQL_TEMPLATE_GROUPS.highRisk,
    ...IQL_TEMPLATE_GROUPS.core,
  ];
  
  return scanWithIQL(texts, templates, threshold);
}

/**
 * Scan for due diligence relevant clauses
 * 
 * @param texts - Array of document text chunks
 * @param threshold - Minimum score threshold (default 0.6)
 * @returns Due diligence relevant clause results
 */
export async function scanDueDiligenceClauses(
  texts: string[],
  threshold: number = 0.6
): Promise<IQLScanResult[]> {
  const templates: Array<{ name: string; query: string }> = [
    ...IQL_TEMPLATE_GROUPS.dueDiligence,
  ];
  return scanWithIQL(texts, templates, threshold);
}

/**
 * Check if a specific clause type exists in texts
 * 
 * @param texts - Array of text chunks
 * @param clauseType - Clause type from IQL_TEMPLATES
 * @param threshold - Minimum score to consider as "exists" (default 0.7)
 * @returns Boolean indicating if clause exists
 */
export async function hasClause(
  texts: string[],
  clauseType: keyof typeof IQL_TEMPLATES,
  threshold: number = 0.7
): Promise<boolean> {
  const query = IQL_TEMPLATES[clauseType];
  
  if (typeof query === "function") {
    throw new Error(`${clauseType} requires arguments. Use executeIQL directly.`);
  }

  const results = await executeIQL(query, texts);
  return results.some((r) => r.score >= threshold);
}

/**
 * Find the best matching clause for a query
 * 
 * @param texts - Array of text chunks
 * @param query - IQL query string
 * @returns The highest scoring result, or null if none above threshold
 */
export async function findBestMatch(
  texts: string[],
  query: string,
  threshold: number = 0.5
): Promise<IQLResult | null> {
  const results = await executeIQL(query, texts);
  const sorted = results.sort((a, b) => b.score - a.score);
  
  if (sorted.length > 0 && sorted[0].score >= threshold) {
    return sorted[0];
  }
  
  return null;
}

