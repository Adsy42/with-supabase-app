"use client";

/**
 * Mode Selector Component
 * Dropdown UI for selecting counsel modes (Harvey.ai/Legora-style)
 * Supports keyboard navigation and mode descriptions
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type CounselMode,
  type ModeConfig,
  getAllModes,
  getModeConfig,
  DEFAULT_MODE,
} from "@/lib/ai/modes";

interface ModeSelectorProps {
  value: CounselMode;
  onChange: (mode: CounselMode) => void;
  className?: string;
  /** Show mode descriptions in dropdown */
  showDescriptions?: boolean;
  /** Compact mode for mobile */
  compact?: boolean;
  /** Disable mode selection */
  disabled?: boolean;
}

export function ModeSelector({
  value,
  onChange,
  className,
  showDescriptions = true,
  compact = false,
  disabled = false,
}: ModeSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const modes = getAllModes();
  const currentMode = getModeConfig(value);
  const Icon = currentMode.icon;

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

      switch (event.key) {
        case "Enter":
        case " ":
          event.preventDefault();
          if (isOpen && highlightedIndex >= 0) {
            onChange(modes[highlightedIndex].id);
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
              prev < modes.length - 1 ? prev + 1 : 0
            );
          }
          break;
        case "ArrowUp":
          event.preventDefault();
          if (isOpen) {
            setHighlightedIndex((prev) =>
              prev > 0 ? prev - 1 : modes.length - 1
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
    [isOpen, highlightedIndex, modes, onChange, disabled]
  );

  // Reset highlighted index when opening
  React.useEffect(() => {
    if (isOpen) {
      const currentIndex = modes.findIndex((m) => m.id === value);
      setHighlightedIndex(currentIndex);
    }
  }, [isOpen, value, modes]);

  const handleModeSelect = (mode: CounselMode) => {
    onChange(mode);
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
        aria-label={`Selected mode: ${currentMode.name}`}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2",
          "text-sm font-medium text-foreground",
          "transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "ring-2 ring-ring",
          compact && "px-2 py-1.5"
        )}
      >
        <Icon className={cn("h-4 w-4", getModeColor(currentMode.color))} />
        {!compact && (
          <span className="hidden sm:inline">{currentMode.shortName}</span>
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
              "min-w-[280px] rounded-lg border border-border bg-background p-1 shadow-lg",
              showDescriptions && "min-w-[320px]"
            )}
            role="listbox"
            aria-label="Select counsel mode"
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground border-b border-border mb-1">
              <Sparkles className="h-3 w-3" />
              <span>Select Counsel Mode</span>
            </div>

            {/* Mode Options */}
            {modes.map((mode, index) => (
              <ModeOption
                key={mode.id}
                mode={mode}
                isSelected={mode.id === value}
                isHighlighted={index === highlightedIndex}
                showDescription={showDescriptions}
                onClick={() => handleModeSelect(mode.id)}
                onMouseEnter={() => setHighlightedIndex(index)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Mode Option Component
// ============================================================================

interface ModeOptionProps {
  mode: ModeConfig;
  isSelected: boolean;
  isHighlighted: boolean;
  showDescription: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}

function ModeOption({
  mode,
  isSelected,
  isHighlighted,
  showDescription,
  onClick,
  onMouseEnter,
}: ModeOptionProps) {
  const Icon = mode.icon;

  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "flex w-full items-start gap-3 rounded-md px-3 py-2 text-left",
        "transition-colors cursor-pointer",
        isHighlighted && "bg-muted",
        isSelected && "bg-primary/10"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
          getModeBackgroundColor(mode.color)
        )}
      >
        <Icon className={cn("h-4 w-4", getModeColor(mode.color))} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{mode.name}</span>
          {isSelected && (
            <Check className="h-4 w-4 text-primary shrink-0" />
          )}
        </div>
        {showDescription && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {mode.description}
          </p>
        )}
      </div>
    </button>
  );
}

// ============================================================================
// Inline Mode Selector (Pills variant)
// ============================================================================

interface ModePillsProps {
  value: CounselMode;
  onChange: (mode: CounselMode) => void;
  className?: string;
  /** Show only specified modes */
  modes?: CounselMode[];
}

export function ModePills({
  value,
  onChange,
  className,
  modes: allowedModes,
}: ModePillsProps) {
  const allModes = getAllModes();
  const modes = allowedModes
    ? allModes.filter((m) => allowedModes.includes(m.id))
    : allModes;

  return (
    <div
      className={cn("flex flex-wrap gap-2", className)}
      role="radiogroup"
      aria-label="Counsel mode"
    >
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isSelected = mode.id === value;

        return (
          <button
            key={mode.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(mode.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5",
              "text-xs font-medium transition-all",
              "border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isSelected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{mode.shortName}</span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getModeColor(color: string): string {
  const colors: Record<string, string> = {
    primary: "text-primary",
    blue: "text-blue-600 dark:text-blue-400",
    purple: "text-purple-600 dark:text-purple-400",
    green: "text-green-600 dark:text-green-400",
    orange: "text-orange-600 dark:text-orange-400",
    teal: "text-teal-600 dark:text-teal-400",
    red: "text-red-600 dark:text-red-400",
  };
  return colors[color] ?? colors.primary;
}

function getModeBackgroundColor(color: string): string {
  const colors: Record<string, string> = {
    primary: "bg-primary/10",
    blue: "bg-blue-100 dark:bg-blue-900/30",
    purple: "bg-purple-100 dark:bg-purple-900/30",
    green: "bg-green-100 dark:bg-green-900/30",
    orange: "bg-orange-100 dark:bg-orange-900/30",
    teal: "bg-teal-100 dark:bg-teal-900/30",
    red: "bg-red-100 dark:bg-red-900/30",
  };
  return colors[color] ?? colors.primary;
}

// ============================================================================
// Exports
// ============================================================================

export { DEFAULT_MODE };
export type { CounselMode };


