"use client";

/**
 * EditableMessage Component
 * User message with edit capability - ChatGPT style
 * Based on shadcn.io/ai patterns
 * @see https://www.shadcn.io/ai
 */

import * as React from "react";
import { motion } from "framer-motion";
import { Pencil, Check, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EditableMessageProps {
  content: string;
  onEdit?: (newContent: string) => void;
  onCancel?: () => void;
  className?: string;
}

export function EditableMessage({
  content,
  onEdit,
  onCancel,
  className,
}: EditableMessageProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedContent, setEditedContent] = React.useState(content);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        editedContent.length,
        editedContent.length
      );
    }
  }, [isEditing, editedContent]);

  const handleStartEdit = () => {
    setEditedContent(content);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editedContent.trim() && editedContent !== content) {
      onEdit?.(editedContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent(content);
    setIsEditing(false);
    onCancel?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div className={cn("group relative flex w-full gap-4 px-4 py-6", className)}>
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
        <User className="h-4 w-4 text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-foreground">You</span>
          
          {/* Edit button - show on hover when not editing */}
          {!isEditing && onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleStartEdit}
            >
              <Pencil className="h-3 w-3" />
              <span className="sr-only">Edit message</span>
            </Button>
          )}
        </div>

        {isEditing ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            <textarea
              ref={textareaRef}
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className={cn(
                "w-full resize-none rounded-lg border border-border bg-background p-3",
                "text-sm leading-relaxed",
                "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              )}
              rows={1}
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSave} disabled={!editedContent.trim()}>
                <Check className="h-3 w-3 mr-1" />
                Save & Submit
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel}>
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          </motion.div>
        ) : (
          <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {content}
          </div>
        )}
      </div>
    </div>
  );
}


