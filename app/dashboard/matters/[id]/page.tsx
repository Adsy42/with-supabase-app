/**
 * Matter Detail Page
 *
 * Shows documents and conversations for a specific matter.
 */

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  FileText,
  MessageSquare,
  Plus,
  Upload,
} from 'lucide-react';

interface MatterPageProps {
  params: Promise<{ id: string }>;
}

export default async function MatterPage({ params }: MatterPageProps) {
  const { id } = await params;

  return (
    <>
      <DashboardHeader title="Matter Details">
        <Link href="/dashboard/matters">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Matters
          </Button>
        </Link>
      </DashboardHeader>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-8">
          <Suspense fallback={<MatterDetailSkeleton />}>
            <MatterDetail matterId={id} />
          </Suspense>
        </div>
      </div>
    </>
  );
}

/**
 * Matter Detail Content
 */
async function MatterDetail({ matterId }: { matterId: string }) {
  const supabase = await createClient();

  // Fetch matter details
  const { data: matter, error } = await supabase
    .from('matters')
    .select('*')
    .eq('id', matterId)
    .single();

  if (error || !matter) {
    notFound();
  }

  // Fetch related documents
  const { data: documents } = await supabase
    .from('documents')
    .select('id, name, status, created_at')
    .eq('matter_id', matterId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch related conversations
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, title, updated_at')
    .eq('matter_id', matterId)
    .order('updated_at', { ascending: false })
    .limit(5);

  return (
    <>
      {/* Matter Header */}
      <section>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {matter.name}
            </h1>
            {matter.matter_number && (
              <p className="text-sm text-muted-foreground">
                {matter.matter_number}
              </p>
            )}
          </div>
          <StatusBadge status={matter.status} />
        </div>
        {matter.description && (
          <p className="mt-4 text-muted-foreground">{matter.description}</p>
        )}
        {matter.client_name && (
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium">Client:</span> {matter.client_name}
          </p>
        )}
      </section>

      {/* Quick Actions */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Link href={`/dashboard/chat/new?matter=${matterId}`}>
          <Card className="group cursor-pointer shadow-subtle hover:shadow-elevated transition-shadow">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Start Chat</h3>
                <p className="text-sm text-muted-foreground">
                  Ask about this matter
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/dashboard/documents?matter=${matterId}`}>
          <Card className="group cursor-pointer shadow-subtle hover:shadow-elevated transition-shadow">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Upload Document</h3>
                <p className="text-sm text-muted-foreground">
                  Add to this matter
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>

      {/* Documents */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Documents</h2>
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Document
          </Button>
        </div>

        {!documents || documents.length === 0 ? (
          <Card className="shadow-subtle">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No documents yet. Upload documents to analyze.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-subtle">
            <CardContent className="divide-y divide-border p-0">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {doc.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        doc.status === 'ready'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}
                    >
                      {doc.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      {/* Conversations */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Conversations</h2>
        </div>

        {!conversations || conversations.length === 0 ? (
          <Card className="shadow-subtle">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No conversations yet. Start a chat to begin.
              </p>
            </CardContent>
          </Card>
        ) : (
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
        )}
      </section>
    </>
  );
}

/**
 * Status Badge
 */
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    archived: 'bg-muted text-muted-foreground',
    closed: 'bg-muted text-muted-foreground',
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${
        styles[status] || styles.active
      }`}
    >
      {status}
    </span>
  );
}

/**
 * Matter Detail Skeleton
 */
function MatterDetailSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="mb-2 h-8 w-64" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Generate static params - required for dynamic routes with cache components
 */
export function generateStaticParams() {
  // Return a placeholder - all other IDs are generated at runtime
  return [{ id: 'placeholder' }];
}

