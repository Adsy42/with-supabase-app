"use client";

/**
 * Tool Component
 * Collapsible tool execution display with status tracking
 * Based on shadcn.io/ai patterns
 * @see https://www.shadcn.io/ai
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Loader2,
  Check,
  AlertCircle,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ToolStatus = "pending" | "running" | "complete" | "error";

interface ToolProps {
  name: string;
  status?: ToolStatus;
  description?: string;
  input?: Record<string, unknown>;
  output?: React.ReactNode;
  error?: string;
  className?: string;
  defaultExpanded?: boolean;
}

export function Tool({
  name,
  status = "complete",
  description,
  input,
  output,
  error,
  className,
  defaultExpanded = false,
}: ToolProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  const statusConfig: Record<
    ToolStatus,
    {
      icon: React.ElementType;
      color: string;
      bgColor: string;
      label: string;
      animate?: boolean;
    }
  > = {
    pending: {
      icon: Wrench,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      label: "Pending",
    },
    running: {
      icon: Loader2,
      color: "text-primary",
      bgColor: "bg-primary/10",
      label: "Running",
      animate: true,
    },
    complete: {
      icon: Check,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/20",
      label: "Complete",
    },
    error: {
      icon: AlertCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      label: "Error",
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card overflow-hidden",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
      >
        {/* Status indicator */}
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            config.bgColor
          )}
        >
          <StatusIcon
            className={cn(
              "h-4 w-4",
              config.color,
              config.animate && "animate-spin"
            )}
          />
        </div>

        {/* Tool info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{name}</span>
            <span
              className={cn(
                "text-xs px-1.5 py-0.5 rounded",
                config.bgColor,
                config.color
              )}
            >
              {config.label}
            </span>
          </div>
          {description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {description}
            </p>
          )}
        </div>

        {/* Expand chevron */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Expandable content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border p-3 space-y-3">
              {/* Input */}
              {input && Object.keys(input).length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">
                    Input
                  </h4>
                  <pre className="text-xs bg-muted rounded p-2 overflow-x-auto">
                    {JSON.stringify(input, null, 2)}
                  </pre>
                </div>
              )}

              {/* Output */}
              {output && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">
                    Output
                  </h4>
                  <div className="text-sm">{output}</div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-2 rounded bg-destructive/10 text-destructive text-xs">
                  {error}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

