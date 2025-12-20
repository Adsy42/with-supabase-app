"use client";

import * as React from "react";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Message component for AI chat interfaces
 * Provides role-based styling with avatars and timestamps
 */

interface MessageContextValue {
  role: "user" | "assistant";
}

const MessageContext = React.createContext<MessageContextValue | null>(null);

function useMessage() {
  const context = React.useContext(MessageContext);
  if (!context) {
    throw new Error("Message components must be used within a Message");
  }
  return context;
}

// ============================================================================
// Message Root
// ============================================================================

interface MessageProps {
  from: "user" | "assistant";
  children: React.ReactNode;
  className?: string;
}

export function Message({ from, children, className }: MessageProps) {
  return (
    <MessageContext.Provider value={{ role: from }}>
      <div
        className={cn(
          "group flex gap-3",
          from === "user" ? "flex-row-reverse" : "flex-row",
          className
        )}
      >
        {children}
      </div>
    </MessageContext.Provider>
  );
}

// ============================================================================
// Message Avatar
// ============================================================================

interface MessageAvatarProps {
  className?: string;
  children?: React.ReactNode;
}

export function MessageAvatar({ className, children }: MessageAvatarProps) {
  const { role } = useMessage();

  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
        role === "user"
          ? "bg-secondary text-secondary-foreground"
          : "bg-primary/10 text-primary",
        className
      )}
    >
      {children || (role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />)}
    </div>
  );
}

// ============================================================================
// Message Content
// ============================================================================

interface MessageContentProps {
  children: React.ReactNode;
  className?: string;
}

export function MessageContent({ children, className }: MessageContentProps) {
  const { role } = useMessage();

  return (
    <div
      className={cn(
        "flex flex-col gap-2 max-w-[85%] md:max-w-[75%]",
        role === "user" ? "items-end" : "items-start",
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Message Bubble (optional wrapper for content)
// ============================================================================

interface MessageBubbleProps {
  children: React.ReactNode;
  className?: string;
}

export function MessageBubble({ children, className }: MessageBubbleProps) {
  const { role } = useMessage();

  return (
    <div
      className={cn(
        "rounded-2xl px-4 py-3",
        role === "user"
          ? "bg-primary text-primary-foreground rounded-br-md"
          : "bg-card border border-border rounded-bl-md",
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Message Timestamp
// ============================================================================

interface MessageTimestampProps {
  time: Date | string;
  className?: string;
}

export function MessageTimestamp({ time, className }: MessageTimestampProps) {
  const date = typeof time === "string" ? new Date(time) : time;
  const formatted = date.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <span
      className={cn(
        "text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity",
        className
      )}
    >
      {formatted}
    </span>
  );
}

