/**
 * Conversation Page
 * Chat interface for a specific conversation
 */

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getConversation, getMessages } from "@/actions/conversations";
import { ChatInterface } from "./chat-interface";
import ConversationLoading from "./loading";

interface ConversationPageProps {
  params: Promise<{
    conversationId: string;
  }>;
}

export async function generateMetadata({ params }: ConversationPageProps) {
  // Access params to ensure proper handling
  await params;

  return {
    title: `Conversation | Counsel`,
  };
}

async function ConversationContent({ conversationId }: { conversationId: string }) {
  // Fetch conversation and messages in parallel
  const [conversationResult, messagesResult] = await Promise.all([
    getConversation(conversationId),
    getMessages(conversationId),
  ]);

  if (!conversationResult.success || !conversationResult.data) {
    notFound();
  }

  const conversation = conversationResult.data;
  const messages = messagesResult.success ? messagesResult.data ?? [] : [];

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold truncate">{conversation.title}</h1>
      </div>

      {/* Chat Interface */}
      <ChatInterface
        conversationId={conversationId}
        initialMatterId={conversation.matter_id ?? undefined}
        initialMessages={messages}
      />
    </div>
  );
}

export default async function ConversationPage({ params }: ConversationPageProps) {
  const { conversationId } = await params;

  return (
    <Suspense fallback={<ConversationLoading />}>
      <ConversationContent conversationId={conversationId} />
    </Suspense>
  );
}

