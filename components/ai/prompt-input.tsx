"use client";

/**
 * PromptInput Component
 * Auto-resizing textarea with submit button
 * Based on shadcn.io/ai patterns with Orderly design system
 */

import * as React from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PromptInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function PromptInput({
  value: controlledValue,
  onChange,
  onSubmit,
  placeholder = "Ask a legal question...",
  disabled = false,
  isLoading = false,
  className,
}: PromptInputProps) {
  const [internalValue, setInternalValue] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Use controlled or uncontrolled value
  const value = controlledValue ?? internalValue;
  const setValue = onChange ?? setInternalValue;

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleSubmit = React.useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmedValue = value.trim();
      if (trimmedValue && !isLoading && !disabled) {
        onSubmit?.(trimmedValue);
        if (!controlledValue) {
          setInternalValue("");
        }
      }
    },
    [value, isLoading, disabled, onSubmit, controlledValue]
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Enter (without Shift)
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className={cn("flex gap-2", className)}>
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          rows={1}
          className={cn(
            "w-full resize-none rounded-lg border border-border bg-background px-4 py-3 pr-12",
            "text-sm leading-relaxed placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "scrollbar-hide"
          )}
        />
      </div>

      <Button
        type="submit"
        size="icon"
        disabled={!value.trim() || isLoading || disabled}
        className="h-[46px] w-[46px] shrink-0"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        <span className="sr-only">Send message</span>
      </Button>
    </form>
  );
}

