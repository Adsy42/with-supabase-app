/**
 * Chat List Page
 *
 * Shows all conversations with ability to start new ones.
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Plus } from 'lucide-react';
import { DeleteConversationButton } from './delete-button';

export default function ChatListPage() {
  return (
    <>
      <DashboardHeader title="Conversations">
        <Link href="/dashboard/chat/new">
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </Link>
      </DashboardHeader>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl">
          <Suspense fallback={<ConversationListSkeleton />}>
            <ConversationList />
          </Suspense>
        </div>
      </div>
    </>
  );
}

/**
 * Conversation List
 */
async function ConversationList() {
  const supabase = await createClient();

  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('id, title, updated_at, created_at')
    .order('updated_at', { ascending: false });

  if (error) {
    return (
      <Card className="shadow-subtle">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-destructive">
            Failed to load conversations. Please try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <Card className="shadow-subtle">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mb-1 text-sm font-semibold text-foreground">
            No conversations yet
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Start a new chat to begin working with your legal AI assistant
          </p>
          <Link href="/dashboard/chat/new">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Start New Chat
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conversation) => (
        <Link
          key={conversation.id}
          href={`/dashboard/chat/${conversation.id}`}
          className="block"
        >
          <Card className="group shadow-subtle hover:shadow-elevated transition-all hover:border-primary/50">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {conversation.title || 'New Conversation'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Last updated:{' '}
                    {new Date(conversation.updated_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
              <DeleteConversationButton conversationId={conversation.id} />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

/**
 * Conversation List Skeleton
 */
function ConversationListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} className="shadow-subtle">
          <CardContent className="flex items-center gap-4 p-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

