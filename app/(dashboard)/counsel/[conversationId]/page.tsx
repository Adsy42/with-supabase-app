import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ConversationContent } from "./conversation-content";

interface ConversationPageProps {
  params: Promise<{ conversationId: string }>;
}

function LoadingFallback() {
  return (
    <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  const { conversationId } = await params;

  return (
    <Suspense fallback={<LoadingFallback />}>
      <ConversationContent conversationId={conversationId} />
    </Suspense>
  );
}

