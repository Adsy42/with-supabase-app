/**
 * Matters Page
 * List and manage legal matters (cases/engagements)
 * Documents are organized within matters for scoped RAG search
 */

import { Metadata } from "next";
import { Suspense } from "react";
import { MattersClient } from "./matters-client";

export const metadata: Metadata = {
  title: "Matters | Counsel",
  description: "Manage your legal matters and case documents",
};

export default function MattersPage() {
  return (
    <div className="container max-w-5xl py-8">
      <Suspense
        fallback={
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-4 w-96 bg-muted rounded" />
            <div className="grid gap-4 mt-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        }
      >
        <MattersClient />
      </Suspense>
    </div>
  );
}

