/**
 * Loading state for chat page
 */

import { Skeleton } from '@/components/ui/skeleton';

export default function ChatLoading() {
  return (
    <>
      {/* Header skeleton */}
      <div className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
        <Skeleton className="h-6 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>

      {/* Chat area skeleton */}
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <Skeleton className="mx-auto mb-4 h-16 w-16 rounded-2xl" />
          <Skeleton className="mx-auto mb-2 h-6 w-48" />
          <Skeleton className="mx-auto h-4 w-64" />
        </div>
      </div>
    </>
  );
}

