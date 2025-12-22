/**
 * Matter Detail Page
 * View and manage documents within a matter
 */

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getMatter } from "@/actions/matters";
import { MatterDetailClient } from "./matter-detail-client";

interface MatterDetailPageProps {
  params: Promise<{ matterId: string }>;
}

export async function generateMetadata({
  params,
}: MatterDetailPageProps): Promise<Metadata> {
  const { matterId } = await params;
  const result = await getMatter(matterId);

  if (!result.success || !result.data) {
    return { title: "Matter Not Found | Counsel" };
  }

  return {
    title: `${result.data.name} | Counsel`,
    description: result.data.description || `Manage documents for ${result.data.name}`,
  };
}

export default async function MatterDetailPage({ params }: MatterDetailPageProps) {
  const { matterId } = await params;
  const result = await getMatter(matterId);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div className="container max-w-5xl py-8">
      <Suspense
        fallback={
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-muted rounded" />
            <div className="h-4 w-96 bg-muted rounded" />
            <div className="h-64 bg-muted rounded-lg mt-8" />
          </div>
        }
      >
        <MatterDetailClient matter={result.data} />
      </Suspense>
    </div>
  );
}

