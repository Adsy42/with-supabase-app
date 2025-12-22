/**
 * Conversation Not Found
 * Displayed when a conversation doesn't exist or user doesn't have access
 */

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ConversationNotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
      </div>

      <h1 className="mt-6 text-2xl font-bold">Conversation not found</h1>
      <p className="mt-2 text-muted-foreground max-w-md">
        This conversation doesn&apos;t exist or you don&apos;t have access to
        it.
      </p>

      <Button asChild className="mt-6">
        <Link href="/counsel">Back to Counsel</Link>
      </Button>
    </div>
  );
}



