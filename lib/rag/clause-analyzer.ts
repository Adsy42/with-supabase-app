/**
 * Clause Analyzer for Contract Analysis Mode
 * Uses IQL for systematic clause detection and extractive QA for citations
 */

import {
  scanContractClauses,
  scanHighRiskClauses,
  scanDueDiligenceClauses,
  executeIQL,
  IQL_TEMPLATES,
  type IQLScanResult,
} from "@/lib/isaacus/iql";
import { extractAnswer, isIsaacusConfigured } from "@/lib/isaacus/client";
import {
  classifyClauseRisk,
  classifyClauseMutuality,
} from "@/lib/isaacus/document-classifier";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Analyzed clause with full metadata
 */
export interface AnalyzedClause {
  /** Type of clause (e.g., "indemnity", "termination") */
  type: string;
  /** Human-readable clause type label */
  typeLabel: string;
  /** IQL score indicating match confidence (0-1) */
  iqlScore: number;
  /** Risk level assessment */
  riskLevel: "low" | "medium" | "high";
  /** Risk confidence score */
  riskConfidence: number;
  /** Whether this is a mutual or unilateral clause */
  isMutual: boolean;
  /** The chunk text containing this clause */
  chunkText: string;
  /** Chunk index for reference */
  chunkIndex: number;
  /** Exact quote extracted from the clause */
  exactQuote?: string;
  /** Quote extraction confidence */
  quoteConfidence?: number;
  /** Start position of quote in chunk */
  quoteStart?: number;
  /** End position of quote in chunk */
  quoteEnd?: number;
}

/**
 * Full contract analysis result
 */
export interface ContractAnalysisResult {
  /** All detected clauses sorted by risk */
  clauses: AnalyzedClause[];
  /** High risk clauses requiring attention */
  highRiskClauses: AnalyzedClause[];
  /** Summary statistics */
  summary: {
    totalClauses: number;
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
    chunksAnalyzed: number;
  };
  /** Whether full IQL analysis was performed */
  fullAnalysis: boolean;
}

/**
 * Clause type labels for display
 */
const CLAUSE_TYPE_LABELS: Record<string, string> = {
  indemnity: "Indemnity",
  limitation: "Limitation of Liability",
  termination: "Termination",
  confidentiality: "Confidentiality",
  assignment: "Assignment",
  changeOfControl: "Change of Control",
  intellectualProperty: "Intellectual Property",
  warranty: "Warranty",
  unlimited_liability: "Unlimited Liability",
  broad_indemnity: "Broad Indemnification",
  unilateral_termination: "Unilateral Termination",
  governing_law: "Governing Law",
  dispute_resolution: "Dispute Resolution",
  notice: "Notice",
  severability: "Severability",
  entire_agreement: "Entire Agreement",
  amendment: "Amendment",
  non_compete: "Non-Compete",
  exclusivity: "Exclusivity",
};

// ============================================================================
// CLAUSE ANALYSIS
// ============================================================================

/**
 * Analyze contract chunks for clauses using IQL
 * 
 * @param chunks - Array of document text chunks
 * @param options - Analysis options
 * @returns ContractAnalysisResult with detected clauses
 */
export async function analyzeContractClauses(
  chunks: string[],
  options?: {
    /** Minimum IQL score threshold (default 0.6) */
    threshold?: number;
    /** Include extractive QA for exact quotes (default true) */
    extractQuotes?: boolean;
    /** Include risk classification (default true) */
    classifyRisk?: boolean;
    /** Maximum clauses to return (default 20) */
    maxClauses?: number;
  }
): Promise<ContractAnalysisResult> {
  const {
    threshold = 0.6,
    extractQuotes = true,
    classifyRisk = true,
    maxClauses = 20,
  } = options ?? {};

  // Check if Isaacus is configured
  if (!isIsaacusConfigured() || chunks.length === 0) {
    return createEmptyResult(chunks.length);
  }

  try {
    // Step 1: Scan for all contract clauses using IQL
    const scanResults = await scanContractClauses(chunks, threshold);

    // Step 2: Process and enrich each result
    const analyzedClauses: AnalyzedClause[] = [];

    for (const result of scanResults.slice(0, maxClauses)) {
      const clause = await processClauseResult(result, {
        extractQuotes,
        classifyRisk,
      });
      analyzedClauses.push(clause);
    }

    // Step 3: Sort by risk level and score
    analyzedClauses.sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2 };
      if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
        return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      }
      return b.iqlScore - a.iqlScore;
    });

    // Step 4: Build summary
    const highRiskClauses = analyzedClauses.filter((c) => c.riskLevel === "high");
    const mediumRiskCount = analyzedClauses.filter((c) => c.riskLevel === "medium").length;
    const lowRiskCount = analyzedClauses.filter((c) => c.riskLevel === "low").length;

    return {
      clauses: analyzedClauses,
      highRiskClauses,
      summary: {
        totalClauses: analyzedClauses.length,
        highRiskCount: highRiskClauses.length,
        mediumRiskCount,
        lowRiskCount,
        chunksAnalyzed: chunks.length,
      },
      fullAnalysis: true,
    };
  } catch (error) {
    console.error("Contract analysis error:", error);
    return createEmptyResult(chunks.length);
  }
}

/**
 * Quick high-risk scan for contracts
 * Faster than full analysis, focuses on problematic clauses
 */
export async function scanForHighRiskClauses(
  chunks: string[],
  threshold: number = 0.7
): Promise<AnalyzedClause[]> {
  if (!isIsaacusConfigured() || chunks.length === 0) {
    return [];
  }

  try {
    const scanResults = await scanHighRiskClauses(chunks, threshold);
    
    const clauses: AnalyzedClause[] = [];
    for (const result of scanResults) {
      const clause = await processClauseResult(result, {
        extractQuotes: true,
        classifyRisk: false, // Already high risk by definition
      });
      clause.riskLevel = "high";
      clauses.push(clause);
    }

    return clauses;
  } catch (error) {
    console.error("High risk scan error:", error);
    return [];
  }
}

/**
 * Analyze clauses for due diligence
 */
export async function analyzeDueDiligenceClauses(
  chunks: string[],
  threshold: number = 0.6
): Promise<AnalyzedClause[]> {
  if (!isIsaacusConfigured() || chunks.length === 0) {
    return [];
  }

  try {
    const scanResults = await scanDueDiligenceClauses(chunks, threshold);
    
    const clauses: AnalyzedClause[] = [];
    for (const result of scanResults) {
      const clause = await processClauseResult(result, {
        extractQuotes: true,
        classifyRisk: true,
      });
      clauses.push(clause);
    }

    return clauses.sort((a, b) => b.iqlScore - a.iqlScore);
  } catch (error) {
    console.error("Due diligence scan error:", error);
    return [];
  }
}

/**
 * Check for specific clause type with party context
 * E.g., "Find indemnity clauses that obligate the Customer"
 */
export async function findPartyObligations(
  chunks: string[],
  partyName: string,
  clauseType?: string
): Promise<IQLScanResult[]> {
  if (!isIsaacusConfigured() || chunks.length === 0) {
    return [];
  }

  try {
    // Build IQL query for party obligations
    const obligatingQuery = IQL_TEMPLATES.obligating(partyName);
    
    let query = obligatingQuery;
    if (clauseType && clauseType in IQL_TEMPLATES) {
      const clauseQuery = IQL_TEMPLATES[clauseType as keyof typeof IQL_TEMPLATES];
      if (typeof clauseQuery === "string") {
        query = `${clauseQuery} AND ${obligatingQuery}`;
      }
    }

    const results = await executeIQL(query, chunks);
    
    return results
      .filter((r) => r.score >= 0.5)
      .map((r) => ({
        clauseType: clauseType || "obligation",
        query,
        score: r.score,
        text: r.text,
        textIndex: r.index,
      }));
  } catch (error) {
    console.error("Party obligation search error:", error);
    return [];
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Process a single IQL scan result into an analyzed clause
 */
async function processClauseResult(
  result: IQLScanResult,
  options: {
    extractQuotes: boolean;
    classifyRisk: boolean;
  }
): Promise<AnalyzedClause> {
  const clause: AnalyzedClause = {
    type: result.clauseType,
    typeLabel: CLAUSE_TYPE_LABELS[result.clauseType] || result.clauseType,
    iqlScore: result.score,
    riskLevel: "medium",
    riskConfidence: 0.5,
    isMutual: true,
    chunkText: result.text,
    chunkIndex: result.textIndex,
  };

  // Run additional classifications in parallel
  const promises: Promise<void>[] = [];

  // Extract exact quote
  if (options.extractQuotes) {
    promises.push(
      extractClauseQuote(result.text, result.clauseType).then((quote) => {
        if (quote) {
          clause.exactQuote = quote.answer;
          clause.quoteConfidence = quote.confidence;
          clause.quoteStart = quote.start;
          clause.quoteEnd = quote.end;
        }
      })
    );
  }

  // Classify risk level
  if (options.classifyRisk) {
    promises.push(
      classifyClauseRisk(result.text).then((risk) => {
        clause.riskLevel = risk.level;
        clause.riskConfidence = risk.confidence;
      })
    );

    // Classify mutuality
    promises.push(
      classifyClauseMutuality(result.text).then((mutuality) => {
        clause.isMutual = mutuality.mutual;
      })
    );
  }

  await Promise.all(promises);

  return clause;
}

/**
 * Extract exact quote from clause text
 */
async function extractClauseQuote(
  text: string,
  clauseType: string
): Promise<{ answer: string; confidence: number; start: number; end: number } | null> {
  try {
    const question = `What is the exact text of the ${clauseType.replace(/_/g, " ")} provision?`;
    const answers = await extractAnswer(question, text);

    if (answers.length > 0) {
      const best = answers.reduce((max, curr) =>
        curr.score > max.score ? curr : max
      );
      return {
        answer: best.answer,
        confidence: best.score,
        start: best.start,
        end: best.end,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Create empty result when analysis cannot be performed
 */
function createEmptyResult(chunksCount: number): ContractAnalysisResult {
  return {
    clauses: [],
    highRiskClauses: [],
    summary: {
      totalClauses: 0,
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 0,
      chunksAnalyzed: chunksCount,
    },
    fullAnalysis: false,
  };
}

// ============================================================================
// CONTEXT BUILDERS
// ============================================================================

/**
 * Build structured clause analysis context for LLM
 */
export function buildClauseAnalysisContext(
  analysis: ContractAnalysisResult
): string {
  if (analysis.clauses.length === 0) {
    return "";
  }

  const sections: string[] = [];

  // Summary section
  sections.push(`## Contract Clause Analysis

Analyzed ${analysis.summary.chunksAnalyzed} document sections.
Found ${analysis.summary.totalClauses} notable clauses:
- High Risk: ${analysis.summary.highRiskCount}
- Medium Risk: ${analysis.summary.mediumRiskCount}
- Low Risk: ${analysis.summary.lowRiskCount}`);

  // High risk clauses section
  if (analysis.highRiskClauses.length > 0) {
    sections.push(`### High Risk Clauses (Require Attention)

${analysis.highRiskClauses
  .map(
    (c, i) => `**${i + 1}. ${c.typeLabel}** (Score: ${Math.round(c.iqlScore * 100)}%)
${c.isMutual ? "Mutual" : "Unilateral"} obligation
${c.exactQuote ? `> "${c.exactQuote}"` : `> ${c.chunkText.slice(0, 200)}...`}`
  )
  .join("\n\n")}`);
  }

  // Other notable clauses
  const otherClauses = analysis.clauses.filter((c) => c.riskLevel !== "high");
  if (otherClauses.length > 0) {
    sections.push(`### Other Notable Clauses

${otherClauses
  .slice(0, 10)
  .map(
    (c) => `- **${c.typeLabel}** (${c.riskLevel} risk, ${Math.round(c.iqlScore * 100)}% match)`
  )
  .join("\n")}`);
  }

  return sections.join("\n\n");
}

/**
 * Build clause summary for quick display
 */
export function buildClauseSummary(
  analysis: ContractAnalysisResult
): {
  hasHighRisk: boolean;
  riskSummary: string;
  clauseTypes: string[];
} {
  return {
    hasHighRisk: analysis.highRiskClauses.length > 0,
    riskSummary: `${analysis.summary.highRiskCount} high, ${analysis.summary.mediumRiskCount} medium, ${analysis.summary.lowRiskCount} low risk`,
    clauseTypes: [...new Set(analysis.clauses.map((c) => c.typeLabel))],
  };
}

