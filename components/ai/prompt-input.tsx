"use client";

/**
 * PromptInput Component
 * Auto-resizing textarea with file upload - ChatGPT style
 * Based on shadcn.io/ai patterns
 * @see https://www.shadcn.io/ai
 */

import * as React from "react";
import { ArrowUp, Loader2, Paperclip, X, FileText, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AttachedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
}

interface PromptInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string, files?: File[]) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  showAttachments?: boolean;
  acceptedFileTypes?: string;
  maxFileSize?: number; // in MB
  maxFiles?: number;
}

export function PromptInput({
  value: controlledValue,
  onChange,
  onSubmit,
  placeholder = "Message Counsel...",
  disabled = false,
  isLoading = false,
  className,
  showAttachments = true,
  acceptedFileTypes = ".pdf,.doc,.docx,.txt,.md",
  maxFileSize = 10, // 10MB default
  maxFiles = 5,
}: PromptInputProps) {
  const [internalValue, setInternalValue] = React.useState("");
  const [attachedFiles, setAttachedFiles] = React.useState<AttachedFile[]>([]);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  // Handle file selection
  const handleFileSelect = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      setFileError(null);
      const newFiles: AttachedFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Check max files
        if (attachedFiles.length + newFiles.length >= maxFiles) {
          setFileError(`Maximum ${maxFiles} files allowed`);
          break;
        }

        // Check file size
        if (file.size > maxFileSize * 1024 * 1024) {
          setFileError(`File "${file.name}" exceeds ${maxFileSize}MB limit`);
          continue;
        }

        newFiles.push({
          id: `${Date.now()}-${i}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
        });
      }

      setAttachedFiles((prev) => [...prev, ...newFiles]);

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [attachedFiles.length, maxFiles, maxFileSize]
  );

  // Remove attached file
  const removeFile = React.useCallback((id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
    setFileError(null);
  }, []);

  const handleSubmit = React.useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmedValue = value.trim();
      const hasContent = trimmedValue || attachedFiles.length > 0;

      if (hasContent && !isLoading && !disabled) {
        const files = attachedFiles.map((f) => f.file);
        onSubmit?.(trimmedValue, files.length > 0 ? files : undefined);

        if (!controlledValue) {
          setInternalValue("");
        }
        setAttachedFiles([]);
        setFileError(null);

        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      }
    },
    [value, attachedFiles, isLoading, disabled, onSubmit, controlledValue]
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

  const canSubmit =
    (value.trim().length > 0 || attachedFiles.length > 0) &&
    !isLoading &&
    !disabled;

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      {/* Attached files preview */}
      {attachedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm"
            >
              <FileIcon type={file.type} />
              <span className="max-w-[150px] truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </span>
              <button
                type="button"
                onClick={() => removeFile(file.id)}
                className="ml-1 rounded-full p-0.5 hover:bg-background"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {file.name}</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* File error */}
      {fileError && (
        <p className="mb-2 text-xs text-destructive">{fileError}</p>
      )}

      <div
        className={cn(
          "relative flex items-end gap-2",
          "rounded-2xl border border-border bg-background",
          "shadow-sm",
          "focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20",
          "transition-all duration-200"
        )}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFileTypes}
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Attachment button */}
        {showAttachments && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 ml-1 mb-1 text-muted-foreground hover:text-foreground"
            disabled={disabled || isLoading}
            onClick={() => fileInputRef.current?.click()}
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
            "py-3",
            !showAttachments && "pl-4",
            "pr-4",
            "text-sm leading-relaxed",
            "placeholder:text-muted-foreground",
            "focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "min-h-[48px] max-h-[200px]"
          )}
        />

        {/* Submit button */}
        <div className="flex items-center gap-1 pr-2 pb-2">
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

/**
 * File icon based on type
 */
function FileIcon({ type }: { type: string }) {
  if (type.includes("pdf")) {
    return <FileText className="h-4 w-4 text-red-500" />;
  }
  if (type.includes("word") || type.includes("document")) {
    return <FileText className="h-4 w-4 text-blue-500" />;
  }
  return <File className="h-4 w-4 text-muted-foreground" />;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
