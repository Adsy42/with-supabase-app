/**
 * Individual Chat Conversation Page
 *
 * Displays a single conversation with CopilotKit chat interface.
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CopilotKit } from '@copilotkit/react-core';
import { createClient } from '@/lib/supabase/client';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { ChatClient } from './chat-client';
import { ErrorBoundary } from '@/components/error-boundary';

interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export default function ChatPage() {
  const params = useParams();
  const conversationId = params.id as string;
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadConversation() {
      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from('conversations')
          .select('id, title, created_at, updated_at')
          .eq('id', conversationId)
          .single();

        if (fetchError) {
          setError('Conversation not found');
          return;
        }

        setConversation(data);
      } catch (err) {
        setError('Failed to load conversation');
      } finally {
        setLoading(false);
      }
    }

    if (conversationId) {
      loadConversation();
    }
  }, [conversationId]);

  if (loading) {
    return (
      <>
        <DashboardHeader title="Loading conversation...">
          <Link href="/dashboard/chat">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
        </DashboardHeader>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (error || !conversation) {
    return (
      <>
        <DashboardHeader title="Error">
          <Link href="/dashboard/chat">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
        </DashboardHeader>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-destructive mb-4">{error || 'Conversation not found'}</p>
            <Link href="/dashboard/chat">
              <Button>Go to Conversations</Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <div className="flex h-full flex-col">
        <DashboardHeader title={conversation.title || 'Chat'}>
          <Link href="/dashboard/chat">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
        </DashboardHeader>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <ErrorBoundary>
              <ChatClient conversationId={conversationId} />
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </CopilotKit>
  );
}
