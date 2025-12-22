"use client";

/**
 * Citation Display Component
 * Shows verified citations with exact quotes from source documents
 * Uses Isaacus extractive QA for accuracy
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Quote,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  BookOpen,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// ============================================================================
// TYPES
// ============================================================================

export interface CitationData {
  /** Unique identifier */
  id: string;
  /** Source document name */
  document: string;
  /** Exact quote extracted by Isaacus */
  quote: string;
  /** Confidence score (0-100) */
  confidence: number;
  /** Relevance score (0-100) */
  relevance: number;
  /** Whether the citation is AI-verified */
  verified?: boolean;
}

interface CitationCardProps {
  citation: CitationData;
  index: number;
  className?: string;
}

interface CitationListProps {
  citations: CitationData[];
  title?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
}

interface InlineCitationProps {
  number: number;
  citation: CitationData;
}

// ============================================================================
// CITATION CARD
// ============================================================================

export function CitationCard({ citation, index, className }: CitationCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const confidenceLevel =
    citation.confidence >= 80
      ? "high"
      : citation.confidence >= 60
      ? "medium"
      : "low";

  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-sm",
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            {/* Citation number badge */}
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-sm font-medium truncate">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{citation.document}</span>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {citation.verified ? (
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified by AI
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <AlertCircle className="h-3 w-3" />
                    Unverified
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant={
                      confidenceLevel === "high"
                        ? "default"
                        : confidenceLevel === "medium"
                        ? "secondary"
                        : "outline"
                    }
                    className="text-xs"
                  >
                    {citation.confidence}%
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Citation confidence score</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
          </div>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0 pb-4">
              <div className="relative mt-2">
                <Quote className="absolute -left-1 -top-1 h-4 w-4 text-primary/30" />
                <blockquote className="pl-4 border-l-2 border-primary/20 text-sm text-foreground">
                  &ldquo;{citation.quote}&rdquo;
                </blockquote>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span>Relevance: {citation.relevance}%</span>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ============================================================================
// CITATION LIST
// ============================================================================

export function CitationList({
  citations,
  title = "Sources",
  collapsible = true,
  defaultOpen = true,
  className,
}: CitationListProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  if (citations.length === 0) {
    return null;
  }

  const verifiedCount = citations.filter((c) => c.verified).length;

  const content = (
    <div className="space-y-2">
      {citations.map((citation, index) => (
        <motion.div
          key={citation.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <CitationCard citation={citation} index={index} />
        </motion.div>
      ))}
    </div>
  );

  if (!collapsible) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="h-4 w-4" />
            {title}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {citations.length} sources
          </Badge>
        </div>
        {content}
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="h-8 gap-2 px-2 text-sm font-semibold">
            <BookOpen className="h-4 w-4" />
            {title}
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <div className="flex items-center gap-2">
          {verifiedCount > 0 && (
            <Badge
              variant="outline"
              className="text-xs text-green-600 dark:text-green-400 border-green-200 dark:border-green-900"
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              {verifiedCount} verified
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            {citations.length} sources
          </Badge>
        </div>
      </div>
      <CollapsibleContent className="mt-3">
        <AnimatePresence>
          {isOpen && content}
        </AnimatePresence>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// INLINE CITATION
// ============================================================================

export function InlineCitation({ number, citation }: InlineCitationProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-primary/10 px-1 text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors">
            {number}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          <div className="space-y-1">
            <p className="font-medium text-xs">{citation.document}</p>
            <p className="text-xs text-muted-foreground italic line-clamp-3">
              &ldquo;{citation.quote}&rdquo;
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// CITATION SUMMARY
// ============================================================================

interface CitationSummaryProps {
  count: number;
  verifiedCount: number;
  onClick?: () => void;
}

export function CitationSummary({
  count,
  verifiedCount,
  onClick,
}: CitationSummaryProps) {
  if (count === 0) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 gap-2 text-xs"
      onClick={onClick}
    >
      <BookOpen className="h-3 w-3" />
      <span>{count} Sources</span>
      {verifiedCount > 0 && (
        <Badge
          variant="outline"
          className="h-4 px-1 text-[10px] text-green-600 dark:text-green-400 border-green-200 dark:border-green-900"
        >
          <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" />
          {verifiedCount}
        </Badge>
      )}
    </Button>
  );
}

