"use client";

/**
 * Suggestion Component
 * Scrollable suggestion pills for quick AI prompts
 * Based on shadcn.io/ai patterns
 * @see https://www.shadcn.io/ai
 */

import * as React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Suggestion {
  id: string;
  text: string;
  icon?: React.ReactNode;
}

interface SuggestionsProps {
  suggestions: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
  title?: string;
  className?: string;
}

export function Suggestions({
  suggestions,
  onSelect,
  title,
  className,
}: SuggestionsProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {title && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          <span>{title}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <SuggestionPill
            key={suggestion.id}
            suggestion={suggestion}
            onClick={() => onSelect(suggestion)}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

interface SuggestionPillProps {
  suggestion: Suggestion;
  onClick: () => void;
  index: number;
}

function SuggestionPill({ suggestion, onClick, index }: SuggestionPillProps) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
        "text-sm text-muted-foreground",
        "border border-border bg-background",
        "hover:bg-muted hover:text-foreground hover:border-primary/50",
        "transition-colors cursor-pointer",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      {suggestion.icon}
      <span>{suggestion.text}</span>
    </motion.button>
  );
}

/**
 * Pre-built legal suggestions for Counsel
 */
export const legalSuggestions: Suggestion[] = [
  { id: "1", text: "Explain this clause" },
  { id: "2", text: "What are the key risks?" },
  { id: "3", text: "Draft a response" },
  { id: "4", text: "Find relevant cases" },
  { id: "5", text: "Summarize this document" },
  { id: "6", text: "Check for compliance" },
];



