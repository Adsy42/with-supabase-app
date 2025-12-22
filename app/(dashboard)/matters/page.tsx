/**
 * Matters Page
 *
 * Organize legal work into matters/cases.
 */

import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { MatterCard } from '@/components/matters/matter-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Briefcase } from 'lucide-react';

export default function MattersPage() {
  return (
    <>
      <DashboardHeader title="Matters">
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Matter
        </Button>
      </DashboardHeader>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl">
          <Suspense fallback={<MattersListSkeleton />}>
            <MattersListWrapper />
          </Suspense>
        </div>
      </div>
    </>
  );
}

/**
 * Matters List Wrapper (Server Component)
 */
async function MattersListWrapper() {
  const supabase = await createClient();

  const { data: matters } = await supabase
    .from('matters')
    .select('*')
    .order('updated_at', { ascending: false });

  if (!matters || matters.length === 0) {
    return (
      <Card className="shadow-subtle">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <Briefcase className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mb-1 text-sm font-semibold text-foreground">
            No matters yet
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Create a matter to organize your documents and conversations
          </p>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create Matter
          </Button>
        </CardContent>
      </Card>
    );
  }

  const formattedMatters = matters.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    clientName: m.client_name,
    matterNumber: m.matter_number,
    status: m.status as 'active' | 'archived' | 'closed',
    documentCount: m.document_count,
    createdAt: m.created_at,
  }));

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {formattedMatters.map((matter) => (
        <MatterCard key={matter.id} matter={matter} />
      ))}
    </div>
  );
}

/**
 * Matters List Skeleton
 */
function MattersListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="shadow-subtle">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="mb-4 h-12 w-full" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

