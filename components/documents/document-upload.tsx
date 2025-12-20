"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { createDocument } from "@/actions/documents";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DocumentUploadProps {
  matterId: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: "uploading" | "processing" | "complete" | "error";
  error?: string;
}

const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function DocumentUpload({ matterId }: DocumentUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<
    Map<string, UploadingFile>
  >(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const router = useRouter();

  const getFileExtension = (filename: string) => {
    return filename.split(".").pop()?.toLowerCase() || "";
  };

  const uploadFile = useCallback(
    async (file: File) => {
      const fileId = `${file.name}-${Date.now()}`;

      // Validate file type
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        toast.error(`File type not supported: ${file.name}`);
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File too large: ${file.name} (max 50MB)`);
        return;
      }

      // Add to uploading state
      setUploadingFiles((prev) =>
        new Map(prev).set(fileId, {
          file,
          progress: 0,
          status: "uploading",
        })
      );

      try {
        const supabase = createClient();

        // Generate storage path
        const fileExt = getFileExtension(file.name);
        const storagePath = `${matterId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(storagePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        // Update progress
        setUploadingFiles((prev) =>
          new Map(prev).set(fileId, {
            file,
            progress: 100,
            status: "processing",
          })
        );

        // Create document record
        const result = await createDocument(
          matterId,
          file.name,
          fileExt,
          storagePath,
          file.size
        );

        if (!result.success) {
          throw new Error(result.error);
        }

        // Trigger document processing
        try {
          await fetch("/api/documents/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documentId: result.data.id }),
          });
        } catch (processingError) {
          // Log but don't fail - processing can happen later
          console.error("Failed to trigger processing:", processingError);
        }

        // Mark complete
        setUploadingFiles((prev) =>
          new Map(prev).set(fileId, {
            file,
            progress: 100,
            status: "complete",
          })
        );

        toast.success(`Uploaded: ${file.name}`);

        // Remove from list after a delay
        setTimeout(() => {
          setUploadingFiles((prev) => {
            const next = new Map(prev);
            next.delete(fileId);
            return next;
          });
        }, 2000);

        // Refresh the page
        router.refresh();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";

        setUploadingFiles((prev) =>
          new Map(prev).set(fileId, {
            file,
            progress: 0,
            status: "error",
            error: errorMessage,
          })
        );

        toast.error(`Failed to upload ${file.name}: ${errorMessage}`);
      }
    },
    [matterId, router]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      files.forEach(uploadFile);
    },
    [uploadFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      files.forEach(uploadFile);
      // Reset input
      e.target.value = "";
    },
    [uploadFile]
  );

  const cancelUpload = useCallback((fileId: string) => {
    setUploadingFiles((prev) => {
      const next = new Map(prev);
      next.delete(fileId);
      return next;
    });
  }, []);

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <Card
        className={cn(
          "border-2 border-dashed transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Upload
            className={cn(
              "h-10 w-10 mb-4 transition-colors",
              isDragging ? "text-primary" : "text-muted-foreground"
            )}
          />
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop files here, or{" "}
            <label className="text-primary hover:underline cursor-pointer">
              browse
              <input
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.docx,.txt"
                onChange={handleFileSelect}
              />
            </label>
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, DOCX, or TXT files up to 50MB
          </p>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadingFiles.size > 0 && (
        <div className="space-y-2">
          {Array.from(uploadingFiles.entries()).map(([id, upload]) => (
            <div
              key={id}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30"
            >
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {upload.file.name}
                </p>
                <div className="flex items-center gap-2">
                  {upload.status === "uploading" && (
                    <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                  )}
                  {upload.status === "processing" && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Processing...
                    </span>
                  )}
                  {upload.status === "complete" && (
                    <span className="text-xs text-success">Complete</span>
                  )}
                  {upload.status === "error" && (
                    <span className="text-xs text-destructive">
                      {upload.error}
                    </span>
                  )}
                </div>
              </div>
              {upload.status !== "complete" && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => cancelUpload(id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



