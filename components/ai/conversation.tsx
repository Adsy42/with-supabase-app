"use client";

import * as React from "react";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Conversation container with auto-scroll behavior
 * Handles scroll position and provides scroll-to-bottom
 */

interface ConversationContextValue {
  scrollToBottom: () => void;
  isAtBottom: boolean;
}

const ConversationContext = React.createContext<ConversationContextValue | null>(null);

export function useConversation() {
  const context = React.useContext(ConversationContext);
  if (!context) {
    throw new Error("Conversation components must be used within a Conversation");
  }
  return context;
}

// ============================================================================
// Conversation Root
// ============================================================================

interface ConversationProps {
  children: React.ReactNode;
  className?: string;
}

export function Conversation({ children, className }: ConversationProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = React.useState(true);

  const scrollToBottom = React.useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  const handleScroll = React.useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const atBottom = scrollHeight - scrollTop - clientHeight < 100;
      setIsAtBottom(atBottom);
    }
  }, []);

  return (
    <ConversationContext.Provider value={{ scrollToBottom, isAtBottom }}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={cn(
          "flex flex-col h-full overflow-y-auto scroll-smooth",
          className
        )}
      >
        {children}
      </div>
    </ConversationContext.Provider>
  );
}

// ============================================================================
// Conversation Content
// ============================================================================

interface ConversationContentProps {
  children: React.ReactNode;
  className?: string;
}

export function ConversationContent({ children, className }: ConversationContentProps) {
  return (
    <div className={cn("flex-1 p-4 space-y-4", className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Scroll Anchor (auto-scrolls when new content arrives)
// ============================================================================

interface ConversationScrollAnchorProps {
  trackVisibility?: boolean;
}

export function ConversationScrollAnchor({ trackVisibility = true }: ConversationScrollAnchorProps) {
  const { isAtBottom, scrollToBottom } = useConversation();
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isAtBottom && trackVisibility) {
      scrollToBottom();
    }
  }, [isAtBottom, scrollToBottom, trackVisibility]);

  return <div ref={ref} className="h-px" />;
}

// ============================================================================
// Scroll to Bottom Button
// ============================================================================

interface ScrollToBottomButtonProps {
  className?: string;
}

export function ScrollToBottomButton({ className }: ScrollToBottomButtonProps) {
  const { isAtBottom, scrollToBottom } = useConversation();

  if (isAtBottom) return null;

  return (
    <div className={cn("absolute bottom-4 left-1/2 -translate-x-1/2", className)}>
      <Button
        variant="secondary"
        size="sm"
        onClick={scrollToBottom}
        className="shadow-lg"
      >
        <ArrowDown className="h-4 w-4 mr-1" />
        Scroll to bottom
      </Button>
    </div>
  );
}

