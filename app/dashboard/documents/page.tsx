/**
 * Documents Page
 *
 * Manage uploaded legal documents.
 */

import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { DocumentUploader } from '@/components/documents/document-uploader';
import { DocumentList } from '@/components/documents/document-list';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DocumentsPage() {
  return (
    <>
      <DashboardHeader title="Documents" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Upload Section */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Upload Documents
            </h2>
            <DocumentUploader />
          </section>

          {/* Documents List */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Your Documents
            </h2>
            <Suspense fallback={<DocumentListSkeleton />}>
              <DocumentListWrapper />
            </Suspense>
          </section>
        </div>
      </div>
    </>
  );
}

/**
 * Document List Wrapper (Server Component)
 */
async function DocumentListWrapper() {
  const supabase = await createClient();

  const { data: documents } = await supabase
    .from('documents')
    .select('id, name, file_type, status, chunk_count, document_type, created_at')
    .order('created_at', { ascending: false });

  const formattedDocs = documents?.map((doc) => ({
    id: doc.id,
    name: doc.name,
    fileType: doc.file_type,
    status: doc.status as 'processing' | 'ready' | 'error',
    chunkCount: doc.chunk_count,
    documentType: doc.document_type,
    createdAt: doc.created_at,
  })) || [];

  return <DocumentList documents={formattedDocs} />;
}

/**
 * Document List Skeleton
 */
function DocumentListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="shadow-subtle">
          <CardContent className="flex items-center gap-4 p-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-8" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

