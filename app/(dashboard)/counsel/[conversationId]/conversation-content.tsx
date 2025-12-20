import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import { ChatInterface } from "@/components/chat/chat-interface";
import { getConversation, getMessages } from "@/actions/conversations";

interface ConversationContentProps {
  conversationId: string;
}

export async function ConversationContent({
  conversationId,
}: ConversationContentProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const conversation = await getConversation(conversationId);

  if (!conversation) {
    notFound();
  }

  const messages = await getMessages(conversationId);

  // Transform messages for the chat interface
  const chatMessages = messages.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const matterData = conversation.matter as
    | { id: string; title: string }[]
    | { id: string; title: string }
    | null;
  const matter = Array.isArray(matterData) ? matterData[0] : matterData;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 pb-4 border-b border-border">
        <Link
          href="/counsel"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="h-4 w-px bg-border" />
        <h1 className="font-medium truncate">{conversation.title}</h1>
        {matter && (
          <>
            <div className="h-4 w-px bg-border" />
            <Link
              href={`/matters/${matter.id}`}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {matter.title}
            </Link>
          </>
        )}
      </div>

      {/* Chat Interface */}
      <ChatInterface
        conversationId={conversationId}
        matterId={matter?.id}
        initialMessages={chatMessages}
      />
    </div>
  );
}



