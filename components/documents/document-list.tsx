'use client';

/**
 * Document List Component
 *
 * Displays user's uploaded documents with status and actions.
 */

import { motion } from 'framer-motion';
import {
  FileText,
  MoreVertical,
  Trash2,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { staggerContainerVariants, staggerItemVariants } from '@/lib/motion-variants';

interface Document {
  id: string;
  name: string;
  fileType: string;
  status: 'processing' | 'ready' | 'error';
  chunkCount: number;
  documentType?: string;
  createdAt: string;
}

interface DocumentListProps {
  documents: Document[];
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function DocumentList({
  documents,
  onDelete,
  onView,
  isLoading,
  className,
}: DocumentListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mb-1 text-sm font-semibold text-foreground">
          No documents yet
        </h3>
        <p className="text-xs text-muted-foreground">
          Upload your first document to get started
        </p>
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      className={cn('space-y-2', className)}
    >
      {documents.map((doc) => (
        <motion.div
          key={doc.id}
          variants={staggerItemVariants}
          className={cn(
            'flex items-center gap-4 rounded-lg border border-border bg-card p-4',
            'hover:border-primary/30 hover:shadow-subtle transition-all'
          )}
        >
          {/* Icon */}
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {doc.name}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{doc.fileType.split('/').pop()?.toUpperCase()}</span>
              <span>•</span>
              <StatusBadge status={doc.status} />
              {doc.status === 'ready' && (
                <>
                  <span>•</span>
                  <span>{doc.chunkCount} chunks</span>
                </>
              )}
            </div>
          </div>

          {/* Date */}
          <span className="hidden text-xs text-muted-foreground sm:block">
            {new Date(doc.createdAt).toLocaleDateString()}
          </span>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView?.(doc.id)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete?.(doc.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </motion.div>
      ))}
    </motion.div>
  );
}

/**
 * Status Badge Component
 */
function StatusBadge({ status }: { status: Document['status'] }) {
  switch (status) {
    case 'processing':
      return (
        <span className="flex items-center gap-1 text-primary">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </span>
      );
    case 'ready':
      return (
        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <CheckCircle className="h-3 w-3" />
          Ready
        </span>
      );
    case 'error':
      return (
        <span className="flex items-center gap-1 text-destructive">
          <AlertCircle className="h-3 w-3" />
          Error
        </span>
      );
  }
}

