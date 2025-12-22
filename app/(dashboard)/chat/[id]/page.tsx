/**
 * Chat Conversation Page
 *
 * Individual conversation with the legal AI assistant.
 */

import { DashboardHeader } from '@/components/layout/dashboard-header';
import { ChatPanel } from '@/components/chat/chat-panel';

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;

  // Handle "new" conversation
  const isNew = id === 'new';

  return (
    <>
      <DashboardHeader title={isNew ? 'New Conversation' : 'Chat'} />
      <ChatPanel
        conversationId={isNew ? undefined : id}
        className="flex-1"
      />
    </>
  );
}

/**
 * Generate static params - required for dynamic routes with cache components
 */
export function generateStaticParams() {
  // Return at least one param for build-time validation
  // All other chat IDs will be generated at runtime
  return [{ id: 'new' }];
}
