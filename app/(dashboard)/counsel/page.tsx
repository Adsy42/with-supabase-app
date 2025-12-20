/**
 * Counsel Page
 * Lists all conversations with option to create new ones
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Plus, MessageSquare } from "lucide-react";
import { getConversations, createConversation } from "@/actions/conversations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import CounselLoading from "./loading";

export const metadata = {
  title: "Counsel | Orderly",
  description: "AI-powered legal assistant",
};

async function CounselContent() {
  const result = await getConversations();

  if (!result.success) {
    // If unauthorized, redirect will happen in layout
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Failed to load conversations</p>
      </div>
    );
  }

  const conversations = result.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Counsel</h1>
          <p className="text-muted-foreground mt-1">
            Your AI-powered legal assistant
          </p>
        </div>

        <form action={handleNewConversation}>
          <Button type="submit">
            <Plus className="mr-2 h-4 w-4" />
            New Conversation
          </Button>
        </form>
      </div>

      {/* Conversations List */}
      {conversations.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {conversations.map((conversation) => (
            <ConversationCard
              key={conversation.id}
              id={conversation.id}
              title={conversation.title}
              updatedAt={conversation.updated_at}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default async function CounselPage() {
  return (
    <Suspense fallback={<CounselLoading />}>
      <CounselContent />
    </Suspense>
  );
}

async function handleNewConversation() {
  "use server";

  const result = await createConversation();

  if (result.success && result.data) {
    redirect(`/counsel/${result.data.id}`);
  }
}

function EmptyState() {
  return (
    <Card className="flex flex-col items-center justify-center py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <MessageSquare className="h-8 w-8 text-primary" />
      </div>

      <h2 className="mt-6 text-xl font-semibold">No conversations yet</h2>
      <p className="mt-2 text-center text-muted-foreground max-w-sm">
        Start a conversation with Counsel to get AI-powered assistance with your
        legal work.
      </p>

      <form action={handleNewConversation} className="mt-6">
        <Button type="submit" size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Start Your First Conversation
        </Button>
      </form>
    </Card>
  );
}

interface ConversationCardProps {
  id: string;
  title: string;
  updatedAt: string;
}

function ConversationCard({ id, title, updatedAt }: ConversationCardProps) {
  const formattedDate = new Date(updatedAt).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Link href={`/counsel/${id}`}>
      <Card className="group cursor-pointer transition-all hover:shadow-elevated hover:-translate-y-1">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                {title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {formattedDate}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

