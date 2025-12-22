/**
 * Documents Page
 * Manage documents for RAG - upload, view, delete
 * Documents are processed with Isaacus for embeddings
 */

import { Metadata } from "next";
import { DocumentManager } from "@/components/documents/document-manager";

export const metadata: Metadata = {
  title: "Documents | Counsel",
  description: "Manage your legal documents for AI-powered search and analysis",
};

export default function DocumentsPage() {
  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground mt-2">
          Upload legal documents to enable AI-powered search and analysis.
          Documents are automatically chunked and embedded using Isaacus for
          accurate retrieval.
        </p>
      </div>

      <DocumentManager />
    </div>
  );
}

