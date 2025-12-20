"use client";

/**
 * Message Component
 * Chat message with role-based styling
 * Based on shadcn.io/ai patterns with Orderly design system
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  from: "user" | "assistant" | "system";
  children: React.ReactNode;
  animate?: boolean;
}

interface MessageContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface MessageAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  from: "user" | "assistant" | "system";
}

export function Message({
  from,
  children,
  className,
  animate = true,
  ...props
}: MessageProps) {
  const isUser = from === "user";

  const content = (
    <div
      className={cn(
        "flex gap-3",
        isUser && "flex-row-reverse",
        className
      )}
      {...props}
    >
      <MessageAvatar from={from} />
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {children}
      </div>
    </div>
  );

  if (!animate) {
    return content;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {content}
    </motion.div>
  );
}

export function MessageContent({ children, className, ...props }: MessageContentProps) {
  return (
    <div className={cn("text-sm leading-relaxed", className)} {...props}>
      {children}
    </div>
  );
}

export function MessageAvatar({ from, className, ...props }: MessageAvatarProps) {
  const isUser = from === "user";
  const isAssistant = from === "assistant";

  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
        isUser && "bg-muted",
        isAssistant && "bg-primary",
        className
      )}
      {...props}
    >
      {isUser && <User className="h-4 w-4 text-muted-foreground" />}
      {isAssistant && <Bot className="h-4 w-4 text-primary-foreground" />}
    </div>
  );
}

export function MessageList({ children }: { children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false} mode="popLayout">
      {children}
    </AnimatePresence>
  );
}

