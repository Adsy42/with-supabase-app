"use client";

/**
 * Matter Detail Client Component
 * Document upload and management for a specific matter
 */

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Briefcase,
  FileText,
  Upload,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MoreVertical,
  Database,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { listDocuments, deleteDocument, type Document } from "@/actions/documents";
import { type MatterWithStats } from "@/actions/matters";

interface MatterDetailClientProps {
  matter: MatterWithStats;
}

export function MatterDetailClient({ matter }: MatterDetailClientProps) {
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = React.useState(true);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadStatus, setUploadStatus] = React.useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load documents
  const loadDocuments = React.useCallback(async () => {
    setIsLoadingDocs(true);
    try {
      const result = await listDocuments(matter.id);
      if (result.success && result.data) {
        setDocuments(result.data);
      }
    } catch (error) {
      console.error("Failed to load documents:", error);
    } finally {
      setIsLoadingDocs(false);
    }
  }, [matter.id]);

  React.useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Handle file upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus(`Uploading ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("matterId", matter.id);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      await response.json(); // Consume response
      setUploadStatus(`${file.name} uploaded successfully!`);
      
      // Reload documents
      setTimeout(() => {
        loadDocuments();
        setIsUploading(false);
        setUploadStatus(null);
      }, 1500);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus(
        `Failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      setTimeout(() => {
        setIsUploading(false);
        setUploadStatus(null);
      }, 3000);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      const result = await deleteDocument(deleteConfirmId);
      if (result.success) {
        loadDocuments();
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/matters"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Matters
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">
                  {matter.name}
                </h1>
                <Badge
                  variant={matter.status === "active" ? "default" : "secondary"}
                >
                  {matter.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                {matter.client_name && <span>{matter.client_name}</span>}
                {matter.matter_number && (
                  <span className="bg-muted px-2 py-0.5 rounded">
                    {matter.matter_number}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/counsel">
                <MessageSquare className="h-4 w-4 mr-2" />
                Open in Counsel
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{matter.stats.documentCount}</p>
                <p className="text-xs text-muted-foreground">Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{matter.stats.chunkCount}</p>
                <p className="text-xs text-muted-foreground">Chunks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">
                  {matter.stats.hasEmbeddings ? "Yes" : "No"}
                </p>
                <p className="text-xs text-muted-foreground">RAG Ready</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium truncate">
                  {matter.stats.lastDocumentAt
                    ? new Date(matter.stats.lastDocumentAt).toLocaleDateString()
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Last Upload</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Upload Documents</CardTitle>
          <CardDescription>
            Upload documents to this matter. They will be processed with Isaacus
            for AI-powered search and analysis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf,.json,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          {isUploading ? (
            <div className="space-y-3">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                {uploadProgress === 100 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {uploadStatus}
              </p>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full h-24 border-dashed"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Click to upload or drag and drop
                </span>
                <span className="text-xs text-muted-foreground">
                  PDF, TXT, MD, JSON, CSV (max 10MB)
                </span>
              </div>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Documents</CardTitle>
            <CardDescription>
              {documents.length} document{documents.length !== 1 ? "s" : ""} in
              this matter
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadDocuments}
            disabled={isLoadingDocs}
          >
            <RefreshCw
              className={cn("h-4 w-4", isLoadingDocs && "animate-spin")}
            />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingDocs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                No documents yet. Upload your first document above.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              <AnimatePresence mode="popLayout">
                {documents.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    document={doc}
                    onDelete={() => setDeleteConfirmId(doc.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the document and its chunks. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// Document Row Component
// ============================================================================

interface DocumentRowProps {
  document: Document;
  onDelete: () => void;
}

function DocumentRow({ document, onDelete }: DocumentRowProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-4 py-3"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <FileText className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{document.name}</p>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
          <span>{document.chunk_count} chunks</span>
          <span>•</span>
          <span>
            {(document.file_size / 1024).toFixed(1)} KB
          </span>
          {document.document_type && (
            <>
              <span>•</span>
              <Badge variant="outline" className="text-xs">
                {document.document_type}
              </Badge>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {document.status === "processing" ? (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </Badge>
        ) : document.status === "error" ? (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Error
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Ready
          </Badge>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}

