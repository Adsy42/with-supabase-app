"use client";

/**
 * Conversation Component
 * Auto-scrolling chat container with scroll-to-bottom functionality
 * Based on shadcn.io/ai patterns
 */

import * as React from "react";
import { cn } from "@/lib/utils";

interface ConversationProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface ConversationContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface ConversationInputProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const ConversationContext = React.createContext<{
  scrollToBottom: () => void;
}>({
  scrollToBottom: () => {},
});

export function useConversation() {
  return React.useContext(ConversationContext);
}

export function Conversation({ children, className, ...props }: ConversationProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = React.useCallback(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({
        top: contentRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  return (
    <ConversationContext.Provider value={{ scrollToBottom }}>
      <div
        className={cn(
          "flex h-full flex-col rounded-xl border border-border/50 bg-card shadow-elevated",
          className
        )}
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child) && child.type === ConversationContent) {
            return React.cloneElement(child as React.ReactElement<{ ref?: React.Ref<HTMLDivElement> }>, {
              ref: contentRef,
            });
          }
          return child;
        })}
      </div>
    </ConversationContext.Provider>
  );
}

export const ConversationContent = React.forwardRef<
  HTMLDivElement,
  ConversationContentProps
>(({ children, className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
ConversationContent.displayName = "ConversationContent";

export function ConversationInput({ children, className, ...props }: ConversationInputProps) {
  return (
    <div
      className={cn("border-t border-border p-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

