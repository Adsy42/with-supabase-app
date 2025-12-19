import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractText, cleanText } from "@/lib/documents/processor";
import { chunkText } from "@/lib/documents/chunker";
import { embedChunks, isIsaacusConfigured } from "@/lib/documents/embedder";

/**
 * POST /api/documents/process
 *
 * Process a document:
 * 1. Download from storage
 * 2. Extract text
 * 3. Chunk into segments
 * 4. Generate embeddings (if Isaacus configured)
 * 5. Store chunks in database
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentId } = await request.json();

  if (!documentId) {
    return NextResponse.json(
      { error: "Document ID is required" },
      { status: 400 }
    );
  }

  // Get document
  const { data: document, error: docError } = await supabase
    .from("documents")
    .select("id, storage_path, file_type, matter_id")
    .eq("id", documentId)
    .single();

  if (docError || !document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Verify user has access to the matter
  const { data: membership } = await supabase
    .from("matter_members")
    .select("role")
    .eq("matter_id", document.matter_id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    // Update status to processing
    await supabase
      .from("documents")
      .update({ processing_status: "processing" })
      .eq("id", documentId);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(document.storage_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    // Convert to buffer
    const buffer = Buffer.from(await fileData.arrayBuffer());

    // Extract text
    const extracted = await extractText(buffer, document.file_type);
    const cleanedText = cleanText(extracted.content);

    // Chunk text
    const chunks = chunkText(cleanedText, {
      chunkSize: 500,
      chunkOverlap: 50,
    });

    // Generate embeddings if Isaacus is configured
    let processedChunks = chunks;
    if (isIsaacusConfigured()) {
      processedChunks = await embedChunks(chunks);
    }

    // Delete existing chunks for this document
    await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", documentId);

    // Store chunks
    const chunkRecords = processedChunks.map((chunk) => ({
      document_id: documentId,
      chunk_index: chunk.index,
      content: chunk.content,
      token_count: chunk.tokenCount,
      embedding: "embedding" in chunk ? chunk.embedding : null,
    }));

    if (chunkRecords.length > 0) {
      const { error: insertError } = await supabase
        .from("document_chunks")
        .insert(chunkRecords);

      if (insertError) {
        console.error("Error inserting chunks:", insertError);
      }
    }

    // Update document metadata and status
    await supabase
      .from("documents")
      .update({
        processing_status: "completed",
        metadata: {
          pageCount: extracted.pageCount,
          chunkCount: chunks.length,
          hasEmbeddings: isIsaacusConfigured(),
          processedAt: new Date().toISOString(),
        },
      })
      .eq("id", documentId);

    return NextResponse.json({
      success: true,
      chunks: chunks.length,
      hasEmbeddings: isIsaacusConfigured(),
    });
  } catch (error) {
    console.error("Document processing error:", error);

    // Update status to failed
    await supabase
      .from("documents")
      .update({
        processing_status: "failed",
        metadata: {
          error:
            error instanceof Error ? error.message : "Unknown error",
          failedAt: new Date().toISOString(),
        },
      })
      .eq("id", documentId);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Processing failed" },
      { status: 500 }
    );
  }
}

