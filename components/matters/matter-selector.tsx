"use client";

/**
 * Matter Selector Component
 * Dropdown for selecting which matter/case to scope RAG search to
 * Appears in chat interface alongside Mode selector
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, FolderOpen, Briefcase, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { listMattersForSelector } from "@/actions/matters";

interface Matter {
  id: string;
  name: string;
  clientName: string | null;
}

interface MatterSelectorProps {
  value: string | null;
  onChange: (matterId: string | null) => void;
  className?: string;
  /** Compact mode for mobile */
  compact?: boolean;
  /** Disable selection */
  disabled?: boolean;
  /** Callback when user wants to create a new matter */
  onCreateMatter?: () => void;
}

export function MatterSelector({
  value,
  onChange,
  className,
  compact = false,
  disabled = false,
  onCreateMatter,
}: MatterSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [matters, setMatters] = React.useState<Matter[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  // Load matters on mount
  React.useEffect(() => {
    async function loadMatters() {
      setIsLoading(true);
      try {
        const result = await listMattersForSelector();
        if (result.success && result.data) {
          setMatters(result.data);
        }
      } catch (error) {
        console.error("Failed to load matters:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadMatters();
  }, []);

  // Find selected matter
  const selectedMatter = value
    ? matters.find((m) => m.id === value)
    : null;

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled) return;

      // Add 1 for "All Documents" option at top
      const optionsCount = matters.length + 1;

      switch (event.key) {
        case "Enter":
        case " ":
          event.preventDefault();
          if (isOpen && highlightedIndex >= 0) {
            if (highlightedIndex === 0) {
              onChange(null);
            } else {
              onChange(matters[highlightedIndex - 1].id);
            }
            setIsOpen(false);
          } else {
            setIsOpen(!isOpen);
          }
          break;
        case "ArrowDown":
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setHighlightedIndex((prev) =>
              prev < optionsCount - 1 ? prev + 1 : 0
            );
          }
          break;
        case "ArrowUp":
          event.preventDefault();
          if (isOpen) {
            setHighlightedIndex((prev) =>
              prev > 0 ? prev - 1 : optionsCount - 1
            );
          }
          break;
        case "Escape":
          event.preventDefault();
          setIsOpen(false);
          buttonRef.current?.focus();
          break;
        case "Tab":
          setIsOpen(false);
          break;
      }
    },
    [isOpen, highlightedIndex, matters, onChange, disabled]
  );

  // Reset highlighted index when opening
  React.useEffect(() => {
    if (isOpen) {
      if (value === null) {
        setHighlightedIndex(0);
      } else {
        const currentIndex = matters.findIndex((m) => m.id === value);
        setHighlightedIndex(currentIndex + 1); // +1 for "All Documents" option
      }
    }
  }, [isOpen, value, matters]);

  const handleMatterSelect = (matterId: string | null) => {
    onChange(matterId);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={
          selectedMatter
            ? `Selected matter: ${selectedMatter.name}`
            : "All documents"
        }
        className={cn(
          "flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2",
          "text-sm font-medium text-foreground",
          "transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "ring-2 ring-ring",
          compact && "px-2 py-1.5"
        )}
      >
        {selectedMatter ? (
          <Briefcase className="h-4 w-4 text-primary" />
        ) : (
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
        )}
        {!compact && (
          <span className="hidden sm:inline max-w-[120px] truncate">
            {selectedMatter ? selectedMatter.name : "All Documents"}
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute left-0 top-full z-50 mt-1",
              "min-w-[280px] max-h-[320px] overflow-y-auto rounded-lg border border-border bg-background p-1 shadow-lg"
            )}
            role="listbox"
            aria-label="Select matter for document scope"
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground border-b border-border mb-1">
              <Briefcase className="h-3 w-3" />
              <span>Select Matter</span>
            </div>

            {isLoading ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                Loading matters...
              </div>
            ) : (
              <>
                {/* All Documents Option */}
                <MatterOption
                  name="All Documents"
                  subtitle="Search across all your documents"
                  isSelected={value === null}
                  isHighlighted={highlightedIndex === 0}
                  onClick={() => handleMatterSelect(null)}
                  onMouseEnter={() => setHighlightedIndex(0)}
                  icon={<FolderOpen className="h-4 w-4 text-muted-foreground" />}
                />

                {/* Divider */}
                {matters.length > 0 && (
                  <div className="my-1 border-t border-border" />
                )}

                {/* Matter Options */}
                {matters.map((matter, index) => (
                  <MatterOption
                    key={matter.id}
                    name={matter.name}
                    subtitle={matter.clientName || undefined}
                    isSelected={matter.id === value}
                    isHighlighted={index + 1 === highlightedIndex}
                    onClick={() => handleMatterSelect(matter.id)}
                    onMouseEnter={() => setHighlightedIndex(index + 1)}
                    icon={<Briefcase className="h-4 w-4 text-primary" />}
                  />
                ))}

                {/* Empty State */}
                {matters.length === 0 && (
                  <div className="px-3 py-4 text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      No matters yet
                    </p>
                    {onCreateMatter && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          onCreateMatter();
                        }}
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Create your first matter
                      </button>
                    )}
                  </div>
                )}

                {/* Create New Matter */}
                {matters.length > 0 && onCreateMatter && (
                  <>
                    <div className="my-1 border-t border-border" />
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onCreateMatter();
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2",
                        "text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                        "transition-colors cursor-pointer"
                      )}
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create new matter</span>
                    </button>
                  </>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Matter Option Component
// ============================================================================

interface MatterOptionProps {
  name: string;
  subtitle?: string;
  isSelected: boolean;
  isHighlighted: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  icon: React.ReactNode;
}

function MatterOption({
  name,
  subtitle,
  isSelected,
  isHighlighted,
  onClick,
  onMouseEnter,
  icon,
}: MatterOptionProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left",
        "transition-colors cursor-pointer",
        isHighlighted && "bg-muted",
        isSelected && "bg-primary/10"
      )}
    >
      {/* Icon */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{name}</span>
          {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </button>
  );
}

export default MatterSelector;

