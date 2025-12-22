"use client";

/**
 * Clause Card Component
 * Displays detected clause with risk level, type, and exact quote
 * Used in Contract Analysis and Due Diligence modes
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Quote,
  Scale,
  Shield,
  FileText,
  Handshake,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// TYPES
// ============================================================================

export interface ClauseCardData {
  /** Clause type key */
  type: string;
  /** Human-readable type label */
  typeLabel: string;
  /** Risk level */
  riskLevel: "low" | "medium" | "high";
  /** Confidence score (0-100) */
  confidence: number;
  /** Whether mutual or unilateral */
  isMutual: boolean;
  /** Exact quote if extracted */
  exactQuote?: string;
  /** Full chunk text */
  fullText?: string;
}

interface ClauseCardProps {
  clause: ClauseCardData;
  className?: string;
  defaultExpanded?: boolean;
}

interface ClauseCardListProps {
  clauses: ClauseCardData[];
  title?: string;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

const riskConfig = {
  high: {
    icon: AlertTriangle,
    color: "text-red-500 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    borderColor: "border-red-200 dark:border-red-900",
    badgeVariant: "destructive" as const,
  },
  medium: {
    icon: AlertCircle,
    color: "text-amber-500 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-900",
    badgeVariant: "secondary" as const,
  },
  low: {
    icon: CheckCircle,
    color: "text-green-500 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-900",
    badgeVariant: "outline" as const,
  },
};

const clauseIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  indemnity: Shield,
  limitation: Scale,
  termination: FileText,
  confidentiality: FileText,
  assignment: Handshake,
  default: FileText,
};

// ============================================================================
// CLAUSE CARD
// ============================================================================

export function ClauseCard({
  clause,
  className,
  defaultExpanded = false,
}: ClauseCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  
  const config = riskConfig[clause.riskLevel];
  const RiskIcon = config.icon;
  const ClauseIcon = clauseIcons[clause.type] || clauseIcons.default;

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        config.borderColor,
        isExpanded && config.bgColor,
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg",
                config.bgColor
              )}
            >
              <ClauseIcon className={cn("h-4 w-4", config.color)} />
            </div>
            <div>
              <CardTitle className="text-sm font-medium">
                {clause.typeLabel}
              </CardTitle>
              <CardDescription className="text-xs">
                {clause.isMutual ? "Mutual" : "Unilateral"} •{" "}
                {clause.confidence}% confidence
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={config.badgeVariant} className="text-xs">
              <RiskIcon className="mr-1 h-3 w-3" />
              {clause.riskLevel.toUpperCase()}
            </Badge>
            {(clause.exactQuote || clause.fullText) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (clause.exactQuote || clause.fullText) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0 pb-4">
              {clause.exactQuote && (
                <div className="relative mt-2">
                  <Quote className="absolute -left-1 -top-1 h-4 w-4 text-muted-foreground/40" />
                  <blockquote className="pl-4 border-l-2 border-muted-foreground/20 text-sm italic text-muted-foreground">
                    &ldquo;{clause.exactQuote}&rdquo;
                  </blockquote>
                </div>
              )}
              {!clause.exactQuote && clause.fullText && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                  {clause.fullText}
                </p>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ============================================================================
// CLAUSE CARD LIST
// ============================================================================

export function ClauseCardList({
  clauses,
  title = "Detected Clauses",
  className,
}: ClauseCardListProps) {
  const [showAll, setShowAll] = React.useState(false);

  // Group by risk level
  const highRisk = clauses.filter((c) => c.riskLevel === "high");
  const mediumRisk = clauses.filter((c) => c.riskLevel === "medium");
  const lowRisk = clauses.filter((c) => c.riskLevel === "low");

  // Show first 5 by default, prioritize high risk
  const displayClauses = showAll
    ? clauses
    : [...highRisk, ...mediumRisk, ...lowRisk].slice(0, 5);

  const hasMore = clauses.length > 5;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {highRisk.length > 0 && (
            <span className="flex items-center gap-1 text-red-500">
              <AlertTriangle className="h-3 w-3" />
              {highRisk.length}
            </span>
          )}
          {mediumRisk.length > 0 && (
            <span className="flex items-center gap-1 text-amber-500">
              <AlertCircle className="h-3 w-3" />
              {mediumRisk.length}
            </span>
          )}
          {lowRisk.length > 0 && (
            <span className="flex items-center gap-1 text-green-500">
              <CheckCircle className="h-3 w-3" />
              {lowRisk.length}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {displayClauses.map((clause, index) => (
            <motion.div
              key={`${clause.type}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.05 }}
            >
              <ClauseCard
                clause={clause}
                defaultExpanded={clause.riskLevel === "high" && index === 0}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? (
            <>Show Less</>
          ) : (
            <>Show {clauses.length - 5} More Clauses</>
          )}
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// CLAUSE SUMMARY BADGE
// ============================================================================

interface ClauseSummaryProps {
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  onClick?: () => void;
}

export function ClauseSummaryBadge({
  highRiskCount,
  mediumRiskCount,
  lowRiskCount,
  onClick,
}: ClauseSummaryProps) {
  const total = highRiskCount + mediumRiskCount + lowRiskCount;

  if (total === 0) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        "h-7 gap-2 text-xs",
        highRiskCount > 0 && "border-red-200 dark:border-red-900"
      )}
      onClick={onClick}
    >
      <Scale className="h-3 w-3" />
      <span>{total} Clauses</span>
      {highRiskCount > 0 && (
        <Badge variant="destructive" className="h-4 px-1 text-[10px]">
          {highRiskCount} Risk
        </Badge>
      )}
    </Button>
  );
}

