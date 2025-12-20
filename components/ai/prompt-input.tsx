"use client";

import * as React from "react";
import { Send, Loader2, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * PromptInput component for AI chat
 * Auto-resizing textarea with toolbar support
 */

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  maxRows?: number;
  toolbar?: React.ReactNode;
  className?: string;
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  placeholder = "Type a message...",
  disabled = false,
  maxRows = 8,
  toolbar,
  className,
}: PromptInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const lineHeight = 24; // Approximate line height
      const maxHeight = lineHeight * maxRows;
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    }
  }, [value, maxRows]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading && !disabled) {
        onSubmit();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={cn("border-t border-border bg-background", className)}>
      {/* Toolbar area */}
      {toolbar && (
        <div className="px-4 pt-3">
          {toolbar}
        </div>
      )}

      {/* Input area */}
      <div className="p-4">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isLoading}
              rows={1}
              className={cn(
                "min-h-[44px] max-h-[200px] resize-none pr-12",
                "focus-visible:ring-1"
              )}
            />
          </div>

          <Button
            type="button"
            size="icon"
            onClick={onSubmit}
            disabled={!value.trim() || isLoading || disabled}
            className="shrink-0 h-11 w-11"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Prompt Toolbar
// ============================================================================

interface PromptToolbarProps {
  children: React.ReactNode;
  className?: string;
}

export function PromptToolbar({ children, className }: PromptToolbarProps) {
  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Attachment Pill (for showing selected documents)
// ============================================================================

interface AttachmentPillProps {
  name: string;
  onRemove: () => void;
  className?: string;
}

export function AttachmentPill({ name, onRemove, className }: AttachmentPillProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1",
        "text-xs rounded-full",
        "bg-primary/10 text-primary",
        "border border-primary/20",
        className
      )}
    >
      <Paperclip className="h-3 w-3" />
      <span className="truncate max-w-32">{name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

