"use client";

/**
 * Inline Citation Component
 * Inline source citations for AI-generated content
 * Based on shadcn.io/ai patterns
 * @see https://www.shadcn.io/ai
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, ExternalLink, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

interface Citation {
  id: string;
  index: number;
  title: string;
  source?: string;
  url?: string;
  excerpt?: string;
  type?: "document" | "case" | "statute" | "article";
}

interface InlineCitationProps {
  citation: Citation;
  className?: string;
}

export function InlineCitation({ citation, className }: InlineCitationProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const typeConfig = {
    document: { icon: FileText, label: "Document" },
    case: { icon: Scale, label: "Case" },
    statute: { icon: FileText, label: "Statute" },
    article: { icon: ExternalLink, label: "Article" },
  };

  const config = typeConfig[citation.type || "document"];
  const Icon = config.icon;

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "inline-flex items-center justify-center",
          "h-4 w-4 rounded-sm",
          "bg-primary/10 text-primary",
          "text-[10px] font-medium",
          "hover:bg-primary/20 transition-colors",
          "cursor-pointer",
          className
        )}
      >
        {citation.index}
      </button>

      {/* Tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50",
              "w-64 p-3 rounded-lg",
              "bg-popover border border-border shadow-lg"
            )}
          >
            {/* Header */}
            <div className="flex items-start gap-2 mb-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium truncate">{citation.title}</h4>
                {citation.source && (
                  <p className="text-xs text-muted-foreground truncate">
                    {citation.source}
                  </p>
                )}
              </div>
            </div>

            {/* Excerpt */}
            {citation.excerpt && (
              <p className="text-xs text-muted-foreground line-clamp-3">
                &ldquo;{citation.excerpt}&rdquo;
              </p>
            )}

            {/* Link */}
            {citation.url && (
              <a
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                View source
              </a>
            )}

            {/* Arrow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 h-2 w-2 bg-popover border-r border-b border-border" />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

/**
 * Citation List - Display all citations at end of response
 */
interface CitationListProps {
  citations: Citation[];
  className?: string;
}

export function CitationList({ citations, className }: CitationListProps) {
  if (!citations || citations.length === 0) return null;

  return (
    <div className={cn("mt-4 pt-4 border-t border-border", className)}>
      <h4 className="text-xs font-medium text-muted-foreground mb-2">
        Sources ({citations.length})
      </h4>
      <div className="space-y-2">
        {citations.map((citation) => (
          <CitationItem key={citation.id} citation={citation} />
        ))}
      </div>
    </div>
  );
}

function CitationItem({ citation }: { citation: Citation }) {
  const typeConfig = {
    document: { icon: FileText },
    case: { icon: Scale },
    statute: { icon: FileText },
    article: { icon: ExternalLink },
  };

  const Icon = typeConfig[citation.type || "document"].icon;

  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-xs font-medium text-primary">
        {citation.index}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <Icon className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium truncate">{citation.title}</span>
        </div>
        {citation.source && (
          <p className="text-xs text-muted-foreground">{citation.source}</p>
        )}
      </div>
    </div>
  );
}

