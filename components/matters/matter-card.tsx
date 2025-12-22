"use client";

/**
 * Matter Card Component
 * Displays a matter with its metadata and actions
 */

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Briefcase,
  FileText,
  MoreVertical,
  Archive,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { MatterListItem } from "@/actions/matters";

interface MatterCardProps {
  matter: MatterListItem;
  onArchive?: (matterId: string) => void;
  onDelete?: (matterId: string) => void;
  className?: string;
}

export function MatterCard({
  matter,
  onArchive,
  onDelete,
  className,
}: MatterCardProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const formattedDate = new Date(matter.updated_at).toLocaleDateString(
    "en-AU",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative rounded-lg border border-border bg-card p-4",
        "transition-all hover:border-primary/50 hover:shadow-md",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <Link
          href={`/matters/${matter.id}`}
          className="flex items-start gap-3 flex-1 min-w-0"
        >
          {/* Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Briefcase className="h-5 w-5 text-primary" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {matter.name}
            </h3>
            {matter.client_name && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {matter.client_name}
              </p>
            )}
          </div>
        </Link>

        {/* Actions Menu */}
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity",
                isMenuOpen && "opacity-100"
              )}
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Matter actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={`/matters/${matter.id}`} className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Open Matter
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {onArchive && matter.status === "active" && (
              <DropdownMenuItem
                onClick={() => onArchive(matter.id)}
                className="text-muted-foreground"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={() => onDelete(matter.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {/* Document Count */}
          <div className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            <span>
              {matter.document_count}{" "}
              {matter.document_count === 1 ? "doc" : "docs"}
            </span>
          </div>

          {/* Matter Number */}
          {matter.matter_number && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded">
              {matter.matter_number}
            </span>
          )}
        </div>

        {/* Status & Date */}
        <div className="flex items-center gap-2">
          {matter.status !== "active" && (
            <Badge
              variant={matter.status === "archived" ? "secondary" : "outline"}
              className="text-xs"
            >
              {matter.status}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{formattedDate}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default MatterCard;

