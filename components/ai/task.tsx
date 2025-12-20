"use client";

/**
 * Task Component
 * Collapsible task lists with file references and progress tracking
 * Based on shadcn.io/ai patterns
 * @see https://www.shadcn.io/ai
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  CheckCircle2,
  Circle,
  Loader2,
  FileText,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TaskStatus = "pending" | "in_progress" | "complete" | "error";

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  files?: { name: string; path?: string }[];
}

interface TaskListProps {
  title?: string;
  tasks: TaskItem[];
  className?: string;
  defaultExpanded?: boolean;
}

export function TaskList({
  title = "Tasks",
  tasks,
  className,
  defaultExpanded = true,
}: TaskListProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  const completedCount = tasks.filter((t) => t.status === "complete").length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card overflow-hidden",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
      >
        {/* Progress indicator */}
        <div className="relative h-8 w-8 shrink-0">
          <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32">
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              strokeWidth="2"
              className="stroke-muted"
            />
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              className="stroke-primary transition-all duration-300"
              strokeDasharray={`${progress * 0.88} 88`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium">
            {completedCount}/{tasks.length}
          </span>
        </div>

        {/* Title */}
        <div className="flex-1">
          <span className="font-medium text-sm">{title}</span>
          <p className="text-xs text-muted-foreground">
            {completedCount} of {tasks.length} complete
          </p>
        </div>

        {/* Chevron */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border">
              {tasks.map((task, index) => (
                <Task key={task.id} task={task} index={index} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface TaskProps {
  task: TaskItem;
  index: number;
}

function Task({ task, index }: TaskProps) {
  const statusConfig: Record<
    TaskStatus,
    { icon: React.ElementType; color: string; animate?: boolean }
  > = {
    pending: {
      icon: Circle,
      color: "text-muted-foreground",
    },
    in_progress: {
      icon: Loader2,
      color: "text-primary",
      animate: true,
    },
    complete: {
      icon: CheckCircle2,
      color: "text-green-600",
    },
    error: {
      icon: AlertCircle,
      color: "text-destructive",
    },
  };

  const config = statusConfig[task.status];
  const StatusIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-start gap-3 p-3 border-b border-border last:border-b-0"
    >
      <StatusIcon
        className={cn(
          "h-5 w-5 shrink-0 mt-0.5",
          config.color,
          config.animate && "animate-spin"
        )}
      />

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm",
            task.status === "complete" && "text-muted-foreground line-through"
          )}
        >
          {task.title}
        </p>

        {task.description && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {task.description}
          </p>
        )}

        {/* Files */}
        {task.files && task.files.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {task.files.map((file, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-xs"
              >
                <FileText className="h-3 w-3" />
                {file.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

