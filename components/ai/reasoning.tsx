"use client";

/**
 * Reasoning Component
 * Collapsible AI reasoning display with auto-streaming behavior
 * Based on shadcn.io/ai patterns
 * @see https://www.shadcn.io/ai
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReasoningProps {
  children: React.ReactNode;
  isStreaming?: boolean;
  title?: string;
  defaultExpanded?: boolean;
  autoCollapseOnComplete?: boolean;
  className?: string;
}

export function Reasoning({
  children,
  isStreaming = false,
  title = "Reasoning",
  defaultExpanded = true,
  autoCollapseOnComplete = true,
  className,
}: ReasoningProps) {
  const [isExpanded, setIsExpanded] = React.useState(
    defaultExpanded || isStreaming
  );
  const wasStreaming = React.useRef(isStreaming);

  // Auto-collapse when streaming completes
  React.useEffect(() => {
    if (wasStreaming.current && !isStreaming && autoCollapseOnComplete) {
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
    wasStreaming.current = isStreaming;
  }, [isStreaming, autoCollapseOnComplete]);

  return (
    <div
      className={cn(
        "rounded-lg border border-border/50 bg-muted/30 overflow-hidden",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 p-3 text-left hover:bg-muted/50 transition-colors"
      >
        {/* Icon */}
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
          {isStreaming ? (
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
          ) : (
            <Brain className="h-3.5 w-3.5 text-primary" />
          )}
        </div>

        {/* Title */}
        <span className="flex-1 text-sm font-medium text-muted-foreground">
          {title}
          {isStreaming && (
            <span className="ml-2 text-xs text-primary">Thinking...</span>
          )}
        </span>

        {/* Chevron */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/50 p-3">
              <div className="text-sm text-muted-foreground leading-relaxed prose-legal">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Reasoning Step - Individual step in reasoning process
 */
interface ReasoningStepProps {
  step: number;
  title: string;
  children: React.ReactNode;
  status?: "pending" | "active" | "complete";
}

export function ReasoningStep({
  step,
  title,
  children,
  status = "complete",
}: ReasoningStepProps) {
  return (
    <div className="flex gap-3 py-2">
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
          status === "active" && "bg-primary text-primary-foreground",
          status === "complete" && "bg-primary/20 text-primary",
          status === "pending" && "bg-muted text-muted-foreground"
        )}
      >
        {step}
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-medium">{title}</h4>
        <div className="text-xs text-muted-foreground mt-1">{children}</div>
      </div>
    </div>
  );
}



