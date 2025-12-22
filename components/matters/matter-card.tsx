'use client';

/**
 * Matter Card Component
 *
 * Displays a legal matter with its documents and conversations.
 */

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Briefcase, FileText, MessageSquare, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Matter {
  id: string;
  name: string;
  description?: string;
  clientName?: string;
  matterNumber?: string;
  status: 'active' | 'archived' | 'closed';
  documentCount: number;
  createdAt: string;
}

interface MatterCardProps {
  matter: Matter;
  onEdit?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

export function MatterCard({
  matter,
  onEdit,
  onArchive,
  onDelete,
  className,
}: MatterCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          'shadow-subtle hover:shadow-elevated transition-shadow',
          className
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">
                  <Link
                    href={`/dashboard/matters/${matter.id}`}
                    className="hover:text-primary transition-colors"
                  >
                    {matter.name}
                  </Link>
                </CardTitle>
                {matter.matterNumber && (
                  <CardDescription className="text-xs">
                    {matter.matterNumber}
                  </CardDescription>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(matter.id)}>
                  Edit Matter
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onArchive?.(matter.id)}>
                  {matter.status === 'archived' ? 'Unarchive' : 'Archive'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete?.(matter.id)}
                  className="text-destructive focus:text-destructive"
                >
                  Delete Matter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent>
          {matter.description && (
            <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
              {matter.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                <span>{matter.documentCount} docs</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Chat</span>
              </div>
            </div>

            <StatusBadge status={matter.status} />
          </div>

          {matter.clientName && (
            <p className="mt-3 text-xs text-muted-foreground">
              Client: {matter.clientName}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Status Badge
 */
function StatusBadge({ status }: { status: Matter['status'] }) {
  const styles = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    archived: 'bg-muted text-muted-foreground',
    closed: 'bg-muted text-muted-foreground',
  };

  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
        styles[status]
      )}
    >
      {status}
    </span>
  );
}

