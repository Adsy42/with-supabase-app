"use client";

/**
 * Actions Component
 * Interactive action buttons for AI responses and messages
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
  onFeedback?: (type: "positive" | "negative") => void;
  showCopy?: boolean;
  showRegenerate?: boolean;
  showFeedback?: boolean;
  className?: string;
}

export function Actions({
  content,
  onCopy,
  onRegenerate,
  onFeedback,
  showCopy = true,
  showRegenerate = true,
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
    <div className={cn("flex items-center gap-1", className)}>
      {showCopy && (
        <ActionButton
          icon={copied ? Check : Copy}
          label={copied ? "Copied!" : "Copy"}
          onClick={handleCopy}
          active={copied}
        />
      )}

      {showRegenerate && (
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
            label="Helpful"
            onClick={() => handleFeedback("positive")}
            active={feedback === "positive"}
          />
          <ActionButton
            icon={ThumbsDown}
            label="Not helpful"
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
}

function ActionButton({ icon: Icon, label, onClick, active }: ActionButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-8 w-8 text-muted-foreground hover:text-foreground",
        active && "text-primary"
      )}
      onClick={onClick}
      title={label}
    >
      <Icon className="h-4 w-4" />
      <span className="sr-only">{label}</span>
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
          className={cn("h-8 w-8 text-muted-foreground", className)}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">More actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}

export { DropdownMenuItem as ActionsMenuItem };

