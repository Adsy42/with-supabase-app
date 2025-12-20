"use client";

/**
 * Branch Component
 * Response variation navigation for AI conversations
 * Based on shadcn.io/ai patterns
 * @see https://www.shadcn.io/ai
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BranchProps {
  total: number;
  current: number;
  onNavigate: (index: number) => void;
  className?: string;
}

export function Branch({ total, current, onNavigate, className }: BranchProps) {
  if (total <= 1) return null;

  const handlePrevious = () => {
    if (current > 0) {
      onNavigate(current - 1);
    }
  };

  const handleNext = () => {
    if (current < total - 1) {
      onNavigate(current + 1);
    }
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-card px-1",
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={handlePrevious}
        disabled={current === 0}
      >
        <ChevronLeft className="h-3 w-3" />
        <span className="sr-only">Previous response</span>
      </Button>

      <div className="flex items-center gap-1 px-1">
        <GitBranch className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground tabular-nums">
          {current + 1} / {total}
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={handleNext}
        disabled={current === total - 1}
      >
        <ChevronRight className="h-3 w-3" />
        <span className="sr-only">Next response</span>
      </Button>
    </div>
  );
}

/**
 * BranchContainer - Animated container for branch content
 */
interface BranchContainerProps {
  children: React.ReactNode;
  branchKey: string | number;
}

export function BranchContainer({ children, branchKey }: BranchContainerProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={branchKey}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

