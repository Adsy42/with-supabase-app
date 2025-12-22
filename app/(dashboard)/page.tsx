/**
 * Dashboard Home Page
 *
 * Shows recent activity, quick actions, and overview.
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageSquare,
  FileText,
  Briefcase,
  Plus,
  ArrowRight,
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <>
      <DashboardHeader title="Dashboard" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Welcome Section */}
          <section>
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
              Welcome back
            </h2>
            <p className="text-muted-foreground">
              Your legal AI assistant is ready to help with document analysis and research.
            </p>
          </section>

          {/* Quick Actions */}
          <section className="grid gap-4 sm:grid-cols-3">
            <Link href="/dashboard/chat/new">
              <Card className="group cursor-pointer shadow-subtle hover:shadow-elevated transition-shadow">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand">
                    <MessageSquare className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">New Chat</h3>
                    <p className="text-sm text-muted-foreground">
                      Start a conversation
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/documents">
              <Card className="group cursor-pointer shadow-subtle hover:shadow-elevated transition-shadow">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      Upload Document
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Add PDF or DOCX
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/matters">
              <Card className="group cursor-pointer shadow-subtle hover:shadow-elevated transition-shadow">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Briefcase className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      New Matter
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Organize your work
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </Link>
          </section>

          {/* Stats Overview */}
          <section>
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              Overview
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Suspense fallback={<StatCardSkeleton />}>
                <DocumentStats />
              </Suspense>
              <Suspense fallback={<StatCardSkeleton />}>
                <ConversationStats />
              </Suspense>
              <Suspense fallback={<StatCardSkeleton />}>
                <MatterStats />
              </Suspense>
            </div>
          </section>

          {/* Recent Activity */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Recent Conversations
              </h3>
              <Link href="/dashboard/chat">
                <Button variant="ghost" size="sm">
                  View all
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <Suspense fallback={<RecentActivitySkeleton />}>
              <RecentConversations />
            </Suspense>
          </section>
        </div>
      </div>
    </>
  );
}

/**
 * Document Stats Card
 */
async function DocumentStats() {
  const supabase = await createClient();
  const { count } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });

  return (
    <Card className="shadow-subtle">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Documents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{count || 0}</div>
        <p className="text-xs text-muted-foreground">Uploaded files</p>
      </CardContent>
    </Card>
  );
}

/**
 * Conversation Stats Card
 */
async function ConversationStats() {
  const supabase = await createClient();
  const { count } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true });

  return (
    <Card className="shadow-subtle">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Conversations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{count || 0}</div>
        <p className="text-xs text-muted-foreground">Chat sessions</p>
      </CardContent>
    </Card>
  );
}

/**
 * Matter Stats Card
 */
async function MatterStats() {
  const supabase = await createClient();
  const { count } = await supabase
    .from('matters')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  return (
    <Card className="shadow-subtle">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Active Matters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{count || 0}</div>
        <p className="text-xs text-muted-foreground">Legal matters</p>
      </CardContent>
    </Card>
  );
}

/**
 * Recent Conversations
 */
async function RecentConversations() {
  const supabase = await createClient();
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, title, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5);

  if (!conversations || conversations.length === 0) {
    return (
      <Card className="shadow-subtle">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <MessageSquare className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No conversations yet. Start a new chat to begin.
          </p>
          <Link href="/dashboard/chat/new" className="mt-4">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Chat
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-subtle">
      <CardContent className="divide-y divide-border p-0">
        {conversations.map((conv) => (
          <Link
            key={conv.id}
            href={`/dashboard/chat/${conv.id}`}
            className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {conv.title}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(conv.updated_at).toLocaleDateString()}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton Components
 */
function StatCardSkeleton() {
  return (
    <Card className="shadow-subtle">
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-20" />
      </CardHeader>
      <CardContent>
        <Skeleton className="mb-2 h-8 w-12" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

function RecentActivitySkeleton() {
  return (
    <Card className="shadow-subtle">
      <CardContent className="space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

