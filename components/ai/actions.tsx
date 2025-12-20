"use client";

/**
 * Actions Component
 * Interactive action buttons for AI responses and messages - ChatGPT style
 * Based on shadcn.io/ai patterns
 * @see https://www.shadcn.io/ai
 */

import * as React from "react";
import {
  Copy,
  Check,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Pencil,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ActionsProps {
  content?: string;
  onCopy?: () => void;
  onRegenerate?: () => void;
  onEdit?: () => void;
  onFeedback?: (type: "positive" | "negative") => void;
  showCopy?: boolean;
  showRegenerate?: boolean;
  showEdit?: boolean;
  showFeedback?: boolean;
  className?: string;
}

export function Actions({
  content,
  onCopy,
  onRegenerate,
  onEdit,
  onFeedback,
  showCopy = true,
  showRegenerate = true,
  showEdit = false,
  showFeedback = true,
  className,
}: ActionsProps) {
  const [copied, setCopied] = React.useState(false);
  const [feedback, setFeedback] = React.useState<"positive" | "negative" | null>(null);

  const handleCopy = React.useCallback(async () => {
    if (content) {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    }
  }, [content, onCopy]);

  const handleFeedback = React.useCallback(
    (type: "positive" | "negative") => {
      setFeedback(type);
      onFeedback?.(type);
    },
    [onFeedback]
  );

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {showCopy && (
        <ActionButton
          icon={copied ? Check : Copy}
          label={copied ? "Copied!" : "Copy"}
          onClick={handleCopy}
          active={copied}
        />
      )}

      {showEdit && onEdit && (
        <ActionButton
          icon={Pencil}
          label="Edit"
          onClick={onEdit}
        />
      )}

      {showRegenerate && onRegenerate && (
        <ActionButton
          icon={RefreshCw}
          label="Regenerate"
          onClick={onRegenerate}
        />
      )}

      {showFeedback && (
        <>
          <ActionButton
            icon={ThumbsUp}
            label="Good response"
            onClick={() => handleFeedback("positive")}
            active={feedback === "positive"}
          />
          <ActionButton
            icon={ThumbsDown}
            label="Bad response"
            onClick={() => handleFeedback("negative")}
            active={feedback === "negative"}
          />
        </>
      )}
    </div>
  );
}

interface ActionButtonProps {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}

function ActionButton({ icon: Icon, label, onClick, active, disabled }: ActionButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-7 w-7 text-muted-foreground hover:text-foreground",
        active && "text-primary"
      )}
      onClick={onClick}
      disabled={disabled}
      title={label}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="sr-only">{label}</span>
    </Button>
  );
}

/**
 * StopButton - Button to stop generation
 */
interface StopButtonProps {
  onStop: () => void;
  className?: string;
}

export function StopButton({ onStop, className }: StopButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onStop}
      className={cn("gap-2", className)}
    >
      <Square className="h-3 w-3 fill-current" />
      Stop generating
    </Button>
  );
}

/**
 * Actions Menu - Dropdown for more actions
 */
interface ActionsMenuProps {
  children?: React.ReactNode;
  className?: string;
}

export function ActionsMenu({ children, className }: ActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7 text-muted-foreground", className)}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
          <span className="sr-only">More actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}

export { DropdownMenuItem as ActionsMenuItem };
