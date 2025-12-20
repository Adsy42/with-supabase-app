"use client";

/**
 * AI Loader Components
 * Loading states for AI operations
 * Based on shadcn.io/ai patterns with Orderly design system
 */

import * as React from "react";
import { motion } from "framer-motion";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoaderProps {
  className?: string;
}

/**
 * Typing indicator with bouncing dots
 */
export function TypingIndicator({ className }: LoaderProps) {
  return (
    <div className={cn("flex gap-3", className)}>
      {/* Assistant avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
        <Bot className="h-4 w-4 text-primary-foreground" />
      </div>

      {/* Bouncing dots */}
      <div className="flex items-center gap-1 rounded-lg bg-muted px-4 py-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-muted-foreground"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Spinner for general loading states
 */
export function Spinner({ className }: LoaderProps) {
  return (
    <motion.div
      className={cn(
        "h-5 w-5 rounded-full border-2 border-primary border-t-transparent",
        className
      )}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
}

/**
 * Skeleton shimmer effect
 */
export function SkeletonShimmer({ className }: LoaderProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-md bg-muted", className)}>
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{ translateX: ["-100%", "100%"] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}

/**
 * Message skeleton for loading states
 */
export function MessageSkeleton({ className }: LoaderProps) {
  return (
    <div className={cn("flex gap-3", className)}>
      <SkeletonShimmer className="h-8 w-8 rounded-full" />
      <div className="flex-1 space-y-2">
        <SkeletonShimmer className="h-4 w-3/4" />
        <SkeletonShimmer className="h-4 w-1/2" />
      </div>
    </div>
  );
}

