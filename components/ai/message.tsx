"use client";

/**
 * Message Component
 * Chat message with role-based styling - ChatGPT/Claude style
 * Based on shadcn.io/ai patterns
 * @see https://www.shadcn.io/ai
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Sparkles } from "lucide-react";
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
  src?: string;
  fallback?: string;
}

/**
 * Message - Main container following ChatGPT/Claude style
 * Full-width rows with avatar + content, not bubbles
 */
export function Message({
  from,
  children,
  className,
  animate = true,
  ...props
}: MessageProps) {
  const isUser = from === "user";
  const isAssistant = from === "assistant";

  const content = (
    <div
      className={cn(
        "group relative flex w-full gap-4 px-4 py-6",
        isUser && "bg-transparent",
        isAssistant && "bg-muted/30",
        className
      )}
      {...props}
    >
      {/* Avatar */}
      <MessageAvatar from={from} />

      {/* Content area */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Role label */}
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm font-semibold",
            isUser && "text-foreground",
            isAssistant && "text-primary"
          )}>
            {isUser ? "You" : "Counsel"}
          </span>
        </div>

        {/* Message content */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {children}
        </div>
      </div>
    </div>
  );

  if (!animate) {
    return content;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {content}
    </motion.div>
  );
}

/**
 * MessageContent - Wrapper for message text/parts
 */
export function MessageContent({ children, className, ...props }: MessageContentProps) {
  return (
    <div 
      className={cn(
        "text-sm leading-relaxed text-foreground",
        "[&>p]:mb-3 [&>p:last-child]:mb-0",
        "[&>ul]:my-2 [&>ol]:my-2",
        "[&>pre]:my-3",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * MessageAvatar - User/Assistant avatar with proper styling
 */
export function MessageAvatar({ 
  from, 
  src, 
  fallback,
  className, 
  ...props 
}: MessageAvatarProps) {
  const isUser = from === "user";
  const isAssistant = from === "assistant";

  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
        "select-none",
        isUser && "bg-gradient-to-br from-blue-500 to-blue-600",
        isAssistant && "bg-gradient-to-br from-violet-500 to-purple-600",
        className
      )}
      {...props}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img 
          src={src} 
          alt={fallback || (isUser ? "User" : "Assistant")}
          className="h-full w-full rounded-lg object-cover"
        />
      ) : (
        <>
          {isUser && <User className="h-4 w-4 text-white" />}
          {isAssistant && <Sparkles className="h-4 w-4 text-white" />}
        </>
      )}
    </div>
  );
}

/**
 * MessageList - AnimatePresence wrapper for message animations
 */
export function MessageList({ children }: { children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false} mode="popLayout">
      {children}
    </AnimatePresence>
  );
}

/**
 * MessageBubble - Alternative bubble-style message (like iMessage)
 * Use this if you prefer bubble style over full-width rows
 */
interface MessageBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  from: "user" | "assistant";
  children: React.ReactNode;
}

export function MessageBubble({
  from,
  children,
  className,
  ...props
}: MessageBubbleProps) {
  const isUser = from === "user";

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md",
          className
        )}
        {...props}
      >
        <div className="text-sm leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}
