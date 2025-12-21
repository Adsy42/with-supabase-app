/**
 * Legal AI Modes Configuration
 * Defines available counsel modes with metadata for UI and prompt selection
 */

import {
  Scale,
  Search,
  FileEdit,
  ClipboardCheck,
  ShieldCheck,
  Swords,
  type LucideIcon,
} from "lucide-react";

/**
 * Available counsel modes
 */
export type CounselMode =
  | "general"
  | "contract_analysis"
  | "legal_research"
  | "document_drafting"
  | "due_diligence"
  | "compliance"
  | "litigation";

/**
 * Mode configuration interface
 */
export interface ModeConfig {
  id: CounselMode;
  name: string;
  shortName: string;
  description: string;
  icon: LucideIcon;
  /** Recommended model tier for this mode */
  recommendedTier: "fast" | "standard" | "powerful";
  /** Keywords that suggest this mode should be used */
  triggerKeywords: string[];
  /** Color theme for UI differentiation */
  color: string;
}

/**
 * Mode configurations with metadata
 */
export const COUNSEL_MODES: Record<CounselMode, ModeConfig> = {
  general: {
    id: "general",
    name: "General Counsel",
    shortName: "General",
    description: "General legal assistance and advice",
    icon: Scale,
    recommendedTier: "standard",
    triggerKeywords: [],
    color: "primary",
  },
  contract_analysis: {
    id: "contract_analysis",
    name: "Contract Analysis",
    shortName: "Contracts",
    description: "Clause review, risk identification, and redlining suggestions",
    icon: Scale,
    recommendedTier: "powerful",
    triggerKeywords: [
      "contract",
      "clause",
      "agreement",
      "terms",
      "obligations",
      "liability",
      "indemnity",
      "warranty",
      "termination",
      "assignment",
      "redline",
      "review",
      "analyze",
    ],
    color: "blue",
  },
  legal_research: {
    id: "legal_research",
    name: "Legal Research",
    shortName: "Research",
    description: "Case law, statutes, and regulatory questions with citations",
    icon: Search,
    recommendedTier: "powerful",
    triggerKeywords: [
      "case",
      "precedent",
      "statute",
      "legislation",
      "regulation",
      "authority",
      "citation",
      "law",
      "legal principle",
      "ratio",
      "obiter",
      "binding",
    ],
    color: "purple",
  },
  document_drafting: {
    id: "document_drafting",
    name: "Document Drafting",
    shortName: "Drafting",
    description: "Generate contracts, letters, pleadings, and agreements",
    icon: FileEdit,
    recommendedTier: "powerful",
    triggerKeywords: [
      "draft",
      "write",
      "prepare",
      "create",
      "template",
      "letter",
      "pleading",
      "submission",
      "motion",
      "affidavit",
    ],
    color: "green",
  },
  due_diligence: {
    id: "due_diligence",
    name: "Due Diligence",
    shortName: "Due Diligence",
    description: "M&A analysis, transaction review, and bulk document processing",
    icon: ClipboardCheck,
    recommendedTier: "powerful",
    triggerKeywords: [
      "due diligence",
      "M&A",
      "merger",
      "acquisition",
      "transaction",
      "material",
      "disclosure",
      "schedule",
      "data room",
      "bulk",
    ],
    color: "orange",
  },
  compliance: {
    id: "compliance",
    name: "Compliance",
    shortName: "Compliance",
    description: "Regulatory verification, policy adherence, and gap analysis",
    icon: ShieldCheck,
    recommendedTier: "powerful",
    triggerKeywords: [
      "compliance",
      "regulatory",
      "ASIC",
      "APRA",
      "privacy",
      "GDPR",
      "policy",
      "requirement",
      "obligation",
      "breach",
      "audit",
    ],
    color: "teal",
  },
  litigation: {
    id: "litigation",
    name: "Litigation Support",
    shortName: "Litigation",
    description: "Discovery analysis, argument preparation, and case strategy",
    icon: Swords,
    recommendedTier: "powerful",
    triggerKeywords: [
      "litigation",
      "dispute",
      "court",
      "trial",
      "discovery",
      "evidence",
      "argument",
      "submission",
      "hearing",
      "judgment",
      "appeal",
    ],
    color: "red",
  },
};

/**
 * Get all available modes as an array
 */
export function getAllModes(): ModeConfig[] {
  return Object.values(COUNSEL_MODES);
}

/**
 * Get mode config by ID
 */
export function getModeConfig(modeId: CounselMode): ModeConfig {
  return COUNSEL_MODES[modeId];
}

/**
 * Detect suggested mode based on user query keywords
 * Returns the mode with the most keyword matches, or 'general' if none
 */
export function detectSuggestedMode(query: string): CounselMode {
  const lowerQuery = query.toLowerCase();
  let bestMatch: CounselMode = "general";
  let maxMatches = 0;

  for (const [modeId, config] of Object.entries(COUNSEL_MODES)) {
    if (modeId === "general") continue;

    const matches = config.triggerKeywords.filter((keyword) =>
      lowerQuery.includes(keyword.toLowerCase())
    ).length;

    if (matches > maxMatches) {
      maxMatches = matches;
      bestMatch = modeId as CounselMode;
    }
  }

  return bestMatch;
}

/**
 * Default mode for new conversations
 */
export const DEFAULT_MODE: CounselMode = "general";
