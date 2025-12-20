"use client";

/**
 * Loader Components
 * Loading spinners and states for AI operations
 * Based on shadcn.io/ai patterns
 * @see https://www.shadcn.io/ai
 */

import * as React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * TypingIndicator - Animated dots showing AI is thinking
 * ChatGPT-style typing indicator
 */
export function TypingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn("flex w-full gap-4 px-4 py-6 bg-muted/30", className)}>
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
        <Sparkles className="h-4 w-4 text-white" />
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-primary">Counsel</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <motion.div
            className="h-2 w-2 rounded-full bg-primary/60"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="h-2 w-2 rounded-full bg-primary/60"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="h-2 w-2 rounded-full bg-primary/60"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Spinner - Simple loading spinner
 */
export function Spinner({ 
  size = "default",
  className 
}: { 
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <motion.div
      className={cn(
        "border-2 border-primary/20 border-t-primary rounded-full",
        sizeClasses[size],
        className
      )}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  );
}

/**
 * SkeletonShimmer - Animated skeleton loading effect
 */
export function SkeletonShimmer({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <motion.div
        className="h-4 rounded bg-muted"
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{ width: "90%" }}
      />
      <motion.div
        className="h-4 rounded bg-muted"
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
        style={{ width: "75%" }}
      />
      <motion.div
        className="h-4 rounded bg-muted"
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
        style={{ width: "85%" }}
      />
    </div>
  );
}

/**
 * MessageSkeleton - Full message loading skeleton
 */
export function MessageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex w-full gap-4 px-4 py-6", className)}>
      {/* Avatar skeleton */}
      <div className="h-8 w-8 shrink-0 rounded-lg bg-muted animate-pulse" />

      {/* Content skeleton */}
      <div className="flex-1 space-y-3">
        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        <SkeletonShimmer />
      </div>
    </div>
  );
}

/**
 * ThinkingText - Animated "thinking" text
 */
export function ThinkingText({ text = "Thinking" }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      {text}
      <motion.span
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        ...
      </motion.span>
    </span>
  );
}
