/**
 * Document Upload API Route
 * Handles file upload, text extraction, and ingestion pipeline
 */

import { createClient } from "@/lib/supabase/server";
import { ingestDocument } from "@/actions/documents";
import { extractTextFromFile } from "@/lib/files/parser";

export const maxDuration = 120; // Allow time for embedding generation

/**
 * POST /api/documents/upload
 * Upload and process a document for RAG
 */
export async function POST(req: Request) {
  try {
    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const matterId = formData.get("matterId") as string | null;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    if (!matterId) {
      return Response.json(
        { error: "Matter ID is required. Documents must be uploaded to a matter." },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return Response.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Extract text from file
    let extracted;
    try {
      extracted = await extractTextFromFile(file);
    } catch (extractError) {
      return Response.json(
        {
          error:
            extractError instanceof Error
              ? extractError.message
              : "Failed to extract text from file",
        },
        { status: 400 }
      );
    }

    // Check if we got meaningful content
    if (!extracted.content || extracted.content.length < 50) {
      return Response.json(
        { error: "Could not extract meaningful content from file" },
        { status: 400 }
      );
    }

    // Ingest the document (chunk, embed, store)
    const result = await ingestDocument(
      extracted.content,
      extracted.name,
      extracted.type,
      extracted.size,
      matterId
    );

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 500 });
    }

    return Response.json({
      success: true,
      data: result.data,
      message: `Document "${result.data?.documentName}" processed successfully. Created ${result.data?.chunksCreated} chunks.`,
    });
  } catch (error) {
    console.error("Document upload error:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process document",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/documents/upload
 * Get upload capabilities info
 */
export async function GET() {
  return Response.json({
    supportedTypes: [
      { extension: ".txt", mimeType: "text/plain" },
      { extension: ".md", mimeType: "text/markdown" },
      { extension: ".pdf", mimeType: "application/pdf" },
      { extension: ".json", mimeType: "application/json" },
      { extension: ".csv", mimeType: "text/csv" },
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
    maxSizeFormatted: "10MB",
  });
}

