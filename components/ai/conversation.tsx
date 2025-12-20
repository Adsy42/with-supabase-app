"use client";

/**
 * Conversation Component
 * Auto-scrolling chat container - ChatGPT/Claude style
 * Based on shadcn.io/ai patterns
 * @see https://www.shadcn.io/ai
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

/**
 * Conversation - Main chat container
 * Clean, full-height layout like ChatGPT
 */
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
          "flex h-full flex-col bg-background",
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

/**
 * ConversationContent - Scrollable message area
 */
export const ConversationContent = React.forwardRef<
  HTMLDivElement,
  ConversationContentProps
>(({ children, className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex-1 overflow-y-auto",
        // Custom scrollbar styling
        "scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent",
        className
      )}
      {...props}
    >
      {/* Centered content container with max-width */}
      <div className="mx-auto max-w-3xl">
        {children}
      </div>
    </div>
  );
});
ConversationContent.displayName = "ConversationContent";

/**
 * ConversationInput - Fixed input area at bottom
 */
export function ConversationInput({ children, className, ...props }: ConversationInputProps) {
  return (
    <div
      className={cn(
        "border-t border-border/50 bg-background",
        "px-4 py-4",
        className
      )}
      {...props}
    >
      {/* Centered input container */}
      <div className="mx-auto max-w-3xl">
        {children}
      </div>
    </div>
  );
}
