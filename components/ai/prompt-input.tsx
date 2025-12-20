"use client";

/**
 * PromptInput Component
 * Auto-resizing textarea with submit button - ChatGPT style
 * Based on shadcn.io/ai patterns
 * @see https://www.shadcn.io/ai
 */

import * as React from "react";
import { ArrowUp, Loader2, Paperclip, Mic } from "lucide-react";
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
  showAttachments?: boolean;
  showVoice?: boolean;
}

export function PromptInput({
  value: controlledValue,
  onChange,
  onSubmit,
  placeholder = "Message Counsel...",
  disabled = false,
  isLoading = false,
  className,
  showAttachments = false,
  showVoice = false,
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
        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
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

  const canSubmit = value.trim().length > 0 && !isLoading && !disabled;

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <div
        className={cn(
          "relative flex items-end gap-2",
          "rounded-2xl border border-border bg-background",
          "shadow-sm",
          "focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20",
          "transition-all duration-200"
        )}
      >
        {/* Attachment button (optional) */}
        {showAttachments && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 ml-1 mb-1 text-muted-foreground hover:text-foreground"
            disabled={disabled || isLoading}
          >
            <Paperclip className="h-5 w-5" />
            <span className="sr-only">Attach file</span>
          </Button>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          rows={1}
          className={cn(
            "flex-1 resize-none bg-transparent",
            "py-3 px-4",
            "text-sm leading-relaxed",
            "placeholder:text-muted-foreground",
            "focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "min-h-[48px] max-h-[200px]"
          )}
        />

        {/* Right side buttons */}
        <div className="flex items-center gap-1 pr-2 pb-2">
          {/* Voice button (optional) */}
          {showVoice && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              disabled={disabled || isLoading}
            >
              <Mic className="h-4 w-4" />
              <span className="sr-only">Voice input</span>
            </Button>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            size="icon"
            disabled={!canSubmit}
            className={cn(
              "h-8 w-8 rounded-lg",
              "transition-all duration-200",
              canSubmit
                ? "bg-primary hover:bg-primary/90"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </div>

      {/* Helper text */}
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Counsel can make mistakes. Verify important legal information.
      </p>
    </form>
  );
}
