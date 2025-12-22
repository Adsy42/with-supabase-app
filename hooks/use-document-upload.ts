"use client";

/**
 * Document Upload Hook
 * Handles file upload with progress tracking and status updates
 */

import * as React from "react";

export interface UploadProgress {
  /** Current stage of upload */
  stage: "idle" | "uploading" | "processing" | "complete" | "error";
  /** Progress percentage (0-100) */
  progress: number;
  /** Current stage message */
  message: string;
}

export interface UploadResult {
  success: boolean;
  documentId?: string;
  documentName?: string;
  chunksCreated?: number;
  embeddingsGenerated?: boolean;
  error?: string;
}

export interface UseDocumentUploadOptions {
  /** Matter ID to associate with uploaded documents */
  matterId?: string;
  /** Callback when upload completes successfully */
  onSuccess?: (result: UploadResult) => void;
  /** Callback when upload fails */
  onError?: (error: string) => void;
}

export function useDocumentUpload(options?: UseDocumentUploadOptions) {
  const { matterId, onSuccess, onError } = options ?? {};

  const [progress, setProgress] = React.useState<UploadProgress>({
    stage: "idle",
    progress: 0,
    message: "",
  });

  const [isUploading, setIsUploading] = React.useState(false);

  const reset = React.useCallback(() => {
    setProgress({ stage: "idle", progress: 0, message: "" });
    setIsUploading(false);
  }, []);

  const uploadFile = React.useCallback(
    async (file: File): Promise<UploadResult> => {
      setIsUploading(true);
      setProgress({
        stage: "uploading",
        progress: 10,
        message: `Uploading ${file.name}...`,
      });

      try {
        // Create form data
        const formData = new FormData();
        formData.append("file", file);
        if (matterId) {
          formData.append("matterId", matterId);
        }

        setProgress({
          stage: "uploading",
          progress: 30,
          message: "Extracting text...",
        });

        // Upload to API
        const response = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });

        setProgress({
          stage: "processing",
          progress: 60,
          message: "Generating embeddings with Isaacus...",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          const error = result.error || "Upload failed";
          setProgress({
            stage: "error",
            progress: 0,
            message: error,
          });
          onError?.(error);
          return { success: false, error };
        }

        setProgress({
          stage: "complete",
          progress: 100,
          message: `Created ${result.data.chunksCreated} searchable chunks`,
        });

        const uploadResult: UploadResult = {
          success: true,
          documentId: result.data.documentId,
          documentName: result.data.documentName,
          chunksCreated: result.data.chunksCreated,
          embeddingsGenerated: result.data.embeddingsGenerated,
        };

        onSuccess?.(uploadResult);
        return uploadResult;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";
        setProgress({
          stage: "error",
          progress: 0,
          message: errorMessage,
        });
        onError?.(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsUploading(false);
      }
    },
    [matterId, onSuccess, onError]
  );

  const uploadFiles = React.useCallback(
    async (files: File[]): Promise<UploadResult[]> => {
      const results: UploadResult[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress({
          stage: "uploading",
          progress: Math.round(((i + 0.5) / files.length) * 100),
          message: `Processing ${file.name} (${i + 1}/${files.length})...`,
        });

        const result = await uploadFile(file);
        results.push(result);

        // If one fails, continue with others but track the error
        if (!result.success) {
          console.error(`Failed to upload ${file.name}:`, result.error);
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const totalChunks = results.reduce(
        (sum, r) => sum + (r.chunksCreated ?? 0),
        0
      );

      setProgress({
        stage: successCount === files.length ? "complete" : "error",
        progress: 100,
        message:
          successCount === files.length
            ? `Uploaded ${successCount} files (${totalChunks} chunks)`
            : `Uploaded ${successCount}/${files.length} files`,
      });

      return results;
    },
    [uploadFile]
  );

  return {
    uploadFile,
    uploadFiles,
    progress,
    isUploading,
    reset,
  };
}

