"use client";

/**
 * Document Manager Component
 * Upload, view, and manage documents for RAG
 * Uses Isaacus for embeddings and classification
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileUp,
  Database,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  listDocumentsGrouped,
  deleteDocumentByName,
  regenerateEmbeddings,
  getDocumentStats,
  type DocumentRecord,
} from "@/actions/documents";

// ============================================================================
// TYPES
// ============================================================================

interface DocumentManagerProps {
  matterId?: string;
  className?: string;
}

interface UploadState {
  status: "idle" | "uploading" | "processing" | "success" | "error";
  progress: number;
  message: string;
  fileName?: string;
}

// ============================================================================
// DOCUMENT UPLOADER
// ============================================================================

function DocumentUploader({
  matterId,
  onUploadComplete,
}: {
  matterId?: string;
  onUploadComplete: () => void;
}) {
  const [uploadState, setUploadState] = React.useState<UploadState>({
    status: "idle",
    progress: 0,
    message: "",
  });
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploadState({
      status: "uploading",
      progress: 10,
      message: "Uploading file...",
      fileName: file.name,
    });

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (matterId) {
        formData.append("matterId", matterId);
      }

      setUploadState((prev) => ({
        ...prev,
        status: "processing",
        progress: 30,
        message: "Extracting text...",
      }));

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      setUploadState((prev) => ({
        ...prev,
        progress: 60,
        message: "Generating embeddings with Isaacus...",
      }));

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      setUploadState({
        status: "success",
        progress: 100,
        message: `Created ${result.data.chunksCreated} chunks${result.data.embeddingsGenerated ? " with embeddings" : ""}`,
        fileName: file.name,
      });

      // Reset after delay
      setTimeout(() => {
        setUploadState({ status: "idle", progress: 0, message: "" });
        onUploadComplete();
      }, 2000);
    } catch (error) {
      setUploadState({
        status: "error",
        progress: 0,
        message: error instanceof Error ? error.message : "Upload failed",
        fileName: file.name,
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const isProcessing = ["uploading", "processing"].includes(uploadState.status);

  return (
    <Card
      className={cn(
        "border-2 border-dashed transition-colors",
        isDragging && "border-primary bg-primary/5",
        uploadState.status === "error" && "border-destructive"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <CardContent className="flex flex-col items-center justify-center py-8">
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.json,.csv,.pdf"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isProcessing}
        />

        <AnimatePresence mode="wait">
          {uploadState.status === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                <FileUp className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">Upload Document</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Drag & drop or click to upload
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Supports: .txt, .md, .json, .csv, .pdf (max 10MB)
              </p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Select File
              </Button>
            </motion.div>
          )}

          {isProcessing && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center w-full max-w-xs"
            >
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="font-medium mb-1">{uploadState.fileName}</p>
              <p className="text-sm text-muted-foreground mb-4">
                {uploadState.message}
              </p>
              <Progress value={uploadState.progress} className="w-full" />
            </motion.div>
          )}

          {uploadState.status === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mb-4">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="font-medium text-green-600 dark:text-green-400">
                Upload Complete
              </p>
              <p className="text-sm text-muted-foreground">
                {uploadState.message}
              </p>
            </motion.div>
          )}

          {uploadState.status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <p className="font-medium text-destructive">Upload Failed</p>
              <p className="text-sm text-muted-foreground mb-4">
                {uploadState.message}
              </p>
              <Button
                variant="outline"
                onClick={() =>
                  setUploadState({ status: "idle", progress: 0, message: "" })
                }
              >
                Try Again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// DOCUMENT LIST
// ============================================================================

function DocumentList({
  documents,
  onDelete,
  onRegenerateEmbeddings,
  isLoading,
}: {
  documents: DocumentRecord[];
  onDelete: (name: string) => void;
  onRegenerateEmbeddings: (name: string) => void;
  isLoading: boolean;
}) {
  const [expandedDoc, setExpandedDoc] = React.useState<string | null>(null);
  const [regenerating, setRegenerating] = React.useState<string | null>(null);

  const handleRegenerate = async (name: string) => {
    setRegenerating(name);
    await onRegenerateEmbeddings(name);
    setRegenerating(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Database className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 className="font-medium text-muted-foreground">No Documents</h3>
        <p className="text-sm text-muted-foreground">
          Upload documents to enable RAG search
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <Card key={doc.document_name} className="overflow-hidden">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() =>
              setExpandedDoc(
                expandedDoc === doc.document_name ? null : doc.document_name
              )
            }
          >
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="font-medium truncate">{doc.document_name}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.chunk_count} chunks •{" "}
                  {(doc.total_characters / 1000).toFixed(1)}k chars
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {doc.document_type && (
                <Badge variant="secondary" className="text-xs">
                  {doc.document_type.replace(/_/g, " ")}
                </Badge>
              )}
              {expandedDoc === doc.document_name ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>

          <AnimatePresence>
            {expandedDoc === doc.document_name && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="px-4 pb-4 pt-0 border-t">
                  <div className="grid grid-cols-2 gap-4 py-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Uploaded:</span>
                      <span className="ml-2">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <span className="ml-2">
                        {doc.document_type || "Unknown"}
                      </span>
                    </div>
                    {typeof doc.metadata?.jurisdiction === "string" && (
                      <div>
                        <span className="text-muted-foreground">
                          Jurisdiction:
                        </span>
                        <span className="ml-2">
                          {doc.metadata.jurisdiction}
                        </span>
                      </div>
                    )}
                    {typeof doc.metadata?.practiceArea === "string" && (
                      <div>
                        <span className="text-muted-foreground">Practice:</span>
                        <span className="ml-2">
                          {doc.metadata.practiceArea}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRegenerate(doc.document_name);
                      }}
                      disabled={regenerating === doc.document_name}
                    >
                      {regenerating === doc.document_name ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-3 w-3" />
                      )}
                      Regenerate Embeddings
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="mr-2 h-3 w-3" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Document?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete &ldquo;{doc.document_name}
                            &rdquo; and all its chunks. This action cannot be
                            undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => onDelete(doc.document_name)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DocumentManager({ matterId, className }: DocumentManagerProps) {
  const [documents, setDocuments] = React.useState<DocumentRecord[]>([]);
  const [stats, setStats] = React.useState<{
    totalDocuments: number;
    totalChunks: number;
    chunksWithEmbeddings: number;
  } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadDocuments = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [docsResult, statsResult] = await Promise.all([
        listDocumentsGrouped(matterId),
        getDocumentStats(matterId),
      ]);

      if (docsResult.success && docsResult.data) {
        setDocuments(docsResult.data);
      }
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }
    } catch (error) {
      console.error("Failed to load documents:", error);
    } finally {
      setIsLoading(false);
    }
  }, [matterId]);

  React.useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleDelete = async (documentName: string) => {
    const result = await deleteDocumentByName(documentName);
    if (result.success) {
      loadDocuments();
    }
  };

  const handleRegenerateEmbeddings = async (documentName: string) => {
    const result = await regenerateEmbeddings(documentName);
    if (result.success) {
      loadDocuments();
    }
  };

  const embeddingCoverage = stats
    ? Math.round((stats.chunksWithEmbeddings / stats.totalChunks) * 100) || 0
    : 0;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats Header */}
      {stats && stats.totalDocuments > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{stats.totalDocuments}</span>
              </div>
              <p className="text-xs text-muted-foreground">Documents</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{stats.totalChunks}</span>
              </div>
              <p className="text-xs text-muted-foreground">Chunks</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{embeddingCoverage}%</span>
              </div>
              <p className="text-xs text-muted-foreground">Embedded</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upload Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Upload Document</h2>
        <DocumentUploader matterId={matterId} onUploadComplete={loadDocuments} />
      </div>

      {/* Document List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Your Documents</h2>
          <Button variant="ghost" size="sm" onClick={loadDocuments}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <DocumentList
          documents={documents}
          onDelete={handleDelete}
          onRegenerateEmbeddings={handleRegenerateEmbeddings}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}


