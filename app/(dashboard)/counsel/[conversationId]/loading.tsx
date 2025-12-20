/**
 * Conversation Loading State
 * Skeleton UI while conversation is loading
 */

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function ConversationLoading() {
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header skeleton */}
      <div className="mb-4">
        <Skeleton className="h-7 w-48" />
      </div>

      {/* Chat container skeleton */}
      <Card className="flex flex-1 flex-col rounded-xl border-border/50">
        {/* Messages area */}
        <div className="flex-1 p-4 space-y-4">
          {/* Message skeletons */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={`flex gap-3 ${i % 2 === 1 ? "flex-row-reverse" : ""}`}
            >
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 max-w-[80%] space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                {i % 2 === 0 && <Skeleton className="h-4 w-1/2" />}
              </div>
            </div>
          ))}
        </div>

        {/* Input area skeleton */}
        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            <Skeleton className="h-[46px] flex-1 rounded-lg" />
            <Skeleton className="h-[46px] w-[46px] rounded-lg" />
          </div>
        </div>
      </Card>
    </div>
  );
}


