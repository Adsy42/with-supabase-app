'use client';

/**
 * Document Uploader Component
 *
 * Drag-and-drop file upload with progress tracking.
 * Supports PDF, DOCX, and TXT files.
 */

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { fadeUpVariants } from '@/lib/motion-variants';

interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  documentId?: string;
  error?: string;
}

interface DocumentUploaderProps {
  matterId?: string;
  onUploadComplete?: (documentId: string) => void;
  className?: string;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function DocumentUploader({
  matterId,
  onUploadComplete,
  className,
}: DocumentUploaderProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pollDocumentStatus = useCallback(
    (fileId: string, documentId: string) => {
      const maxAttempts = 60;
      let attempts = 0;

      const poll = async () => {
        try {
          const response = await fetch(
            `/api/documents/ingest?documentId=${documentId}`
          );
          const data = await response.json();

          if (data.status === 'ready') {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileId ? { ...f, status: 'complete', progress: 100 } : f
              )
            );
            onUploadComplete?.(documentId);
            return;
          }

          if (data.status === 'error') {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileId
                  ? { ...f, status: 'error', error: data.error_message }
                  : f
              )
            );
            return;
          }

          attempts++;
          if (attempts < maxAttempts) {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileId
                  ? { ...f, progress: Math.min(50 + attempts, 95) }
                  : f
              )
            );
            setTimeout(poll, 2000);
          } else {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileId
                  ? { ...f, status: 'error', error: 'Processing timed out' }
                  : f
              )
            );
          }
        } catch {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? { ...f, status: 'error', error: 'Failed to check status' }
                : f
            )
          );
        }
      };

      setTimeout(poll, 2000);
    },
    [onUploadComplete]
  );

  const uploadSingleFile = useCallback(
    async (uploadItem: UploadFile) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadItem.id ? { ...f, status: 'uploading', progress: 10 } : f
        )
      );

      try {
        const formData = new FormData();
        formData.append('file', uploadItem.file);
        if (matterId) {
          formData.append('matterId', matterId);
        }

        const response = await fetch('/api/documents/ingest', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }

        const result = await response.json();

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadItem.id
              ? {
                  ...f,
                  status: 'processing',
                  progress: 50,
                  documentId: result.documentId,
                }
              : f
          )
        );

        pollDocumentStatus(uploadItem.id, result.documentId);
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadItem.id
              ? {
                  ...f,
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Upload failed',
                }
              : f
          )
        );
      }
    },
    [matterId, pollDocumentStatus]
  );

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const newFiles: UploadFile[] = Array.from(fileList)
        .filter((file) => {
          if (!ACCEPTED_TYPES.includes(file.type)) {
            console.warn(`Unsupported file type: ${file.type}`);
            return false;
          }
          if (file.size > MAX_FILE_SIZE) {
            console.warn(`File too large: ${file.name}`);
            return false;
          }
          return true;
        })
        .map((file) => ({
          id: crypto.randomUUID(),
          file,
          status: 'pending' as const,
          progress: 0,
        }));

      setFiles((prev) => [...prev, ...newFiles]);
      newFiles.forEach(uploadSingleFile);
    },
    [uploadSingleFile]
  );

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop Zone */}
      <motion.div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        animate={{
          borderColor: isDragging ? 'hsl(var(--primary))' : 'hsl(var(--border))',
          backgroundColor: isDragging
            ? 'hsl(var(--primary) / 0.05)'
            : 'transparent',
        }}
        className={cn(
          'cursor-pointer rounded-xl border-2 border-dashed p-8',
          'flex flex-col items-center justify-center text-center',
          'transition-colors hover:border-primary/50 hover:bg-muted/50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Upload className="h-6 w-6 text-primary" />
        </div>

        <h3 className="mb-1 text-sm font-semibold text-foreground">
          {isDragging ? 'Drop files here' : 'Upload Documents'}
        </h3>
        <p className="text-xs text-muted-foreground">
          Drag and drop or click to browse
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          PDF, DOCX, or TXT • Max 10MB
        </p>
      </motion.div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={fadeUpVariants}
            className="space-y-2"
          >
            {files.map((file) => (
              <FileItem key={file.id} file={file} onRemove={removeFile} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * File Item Component
 */
function FileItem({
  file,
  onRemove,
}: {
  file: UploadFile;
  onRemove: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
    >
      {/* Icon */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
        <FileText className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {file.file.name}
        </p>
        <div className="flex items-center gap-2">
          <StatusIndicator status={file.status} error={file.error} />
          {(file.status === 'uploading' || file.status === 'processing') && (
            <span className="text-xs text-muted-foreground">
              {file.progress}%
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {(file.status === 'uploading' || file.status === 'processing') && (
        <div className="h-1 w-20 overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${file.progress}%` }}
            className="h-full bg-primary"
          />
        </div>
      )}

      {/* Actions */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(file.id)}
        className="h-8 w-8 flex-shrink-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}

/**
 * Status Indicator Component
 */
function StatusIndicator({
  status,
  error,
}: {
  status: UploadFile['status'];
  error?: string;
}) {
  switch (status) {
    case 'pending':
      return <span className="text-xs text-muted-foreground">Waiting...</span>;
    case 'uploading':
      return (
        <span className="flex items-center gap-1 text-xs text-primary">
          <Loader2 className="h-3 w-3 animate-spin" />
          Uploading
        </span>
      );
    case 'processing':
      return (
        <span className="flex items-center gap-1 text-xs text-primary">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </span>
      );
    case 'complete':
      return (
        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
          <CheckCircle className="h-3 w-3" />
          Complete
        </span>
      );
    case 'error':
      return (
        <span className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error || 'Error'}
        </span>
      );
  }
}
