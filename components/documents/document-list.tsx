"use client";

import { useState } from "react";
import { FileText, Download, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteDocument, getDocumentUrl } from "@/actions/documents";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Document {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  processing_status: string;
  is_restricted: boolean;
  created_at: string;
  uploader: { full_name?: string; email?: string }[] | { full_name?: string; email?: string } | null;
}

interface DocumentListProps {
  documents: Document[];
  matterId: string;
  userRole: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon() {
  return <FileText className="h-5 w-5 text-muted-foreground" />;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
          Processed
        </span>
      );
    case "processing":
      return (
        <span className="inline-flex items-center rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
          Processing
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
          Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          Pending
        </span>
      );
  }
}

export function DocumentList({
  documents,
  matterId,
  userRole,
}: DocumentListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (document: Document) => {
    setDownloadingId(document.id);
    try {
      const result = await getDocumentUrl(document.id);
      if (result.success) {
        // Open in new tab or trigger download
        window.open(result.data.url, "_blank");
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to download document");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteDocument(documentToDelete.id, matterId);
      if (result.success) {
        toast.success(`Deleted: ${documentToDelete.name}`);
        setDeleteDialogOpen(false);
        setDocumentToDelete(null);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to delete document");
    } finally {
      setIsDeleting(false);
    }
  };

  const canDelete = ["owner", "editor"].includes(userRole);

  return (
    <>
      <div className="divide-y divide-border">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
          >
            {getFileIcon()}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{doc.name}</p>
                {doc.is_restricted && (
                  <span className="inline-flex items-center rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                    Restricted
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{formatFileSize(doc.file_size)}</span>
                <span>•</span>
                <span>
                  {new Date(doc.created_at).toLocaleDateString("en-AU")}
                </span>
                <span>•</span>
                <span>
                  {Array.isArray(doc.uploader)
                    ? doc.uploader[0]?.full_name || doc.uploader[0]?.email?.split("@")[0] || "Unknown"
                    : doc.uploader?.full_name || doc.uploader?.email?.split("@")[0] || "Unknown"}
                </span>
                <span>•</span>
                {getStatusBadge(doc.processing_status)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleDownload(doc)}
                disabled={downloadingId === doc.id}
              >
                {downloadingId === doc.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setDocumentToDelete(doc);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{documentToDelete?.name}
              &quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

