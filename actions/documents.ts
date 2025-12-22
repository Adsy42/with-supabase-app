"use server";

/**
 * Document Management Server Actions
 * Upload, process, embed (Isaacus), and manage documents for RAG
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { chunkDocument, chunkLegalDocument } from "@/lib/rag/chunker";
import { embedDocuments, isIsaacusConfigured } from "@/lib/isaacus/client";
import {
  classifyDocumentType,
  type DocumentTypeResult,
} from "@/lib/isaacus/document-classifier";

// ============================================================================
// TYPES
// ============================================================================

export interface ActionResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Document {
  id: string;
  user_id: string;
  matter_id: string | null;
  name: string;
  file_type: string;
  file_size: number;
  chunk_count: number;
  status: "processing" | "ready" | "error";
  document_type: string | null;
  jurisdiction: string | null;
  practice_area: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentWithChunks extends Document {
  chunks: Array<{
    id: string;
    chunk_index: number;
    content: string;
    metadata: Record<string, unknown>;
  }>;
}

export interface IngestResult {
  documentId: string;
  documentName: string;
  chunksCreated: number;
  embeddingsGenerated: boolean;
  classification?: DocumentTypeResult;
}

// ============================================================================
// VALIDATION
// ============================================================================

const IngestDocumentSchema = z.object({
  content: z.string().min(1, "Document content required"),
  fileName: z.string().min(1, "File name required"),
  fileType: z.string().default("text/plain"),
  fileSize: z.number().int().positive(),
  matterId: z.string().uuid("Valid matter ID required"),
});

// ============================================================================
// HELPERS
// ============================================================================

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

// ============================================================================
// DOCUMENT INGESTION
// ============================================================================

/**
 * Ingest a document: chunk, embed with Isaacus, classify, and store
 * This is the main entry point for document upload
 * Documents must be associated with a matter for RAG scoping
 */
export async function ingestDocument(
  content: string,
  fileName: string,
  fileType: string,
  fileSize: number,
  matterId: string
): Promise<ActionResponse<IngestResult>> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Validate input
  const parsed = IngestDocumentSchema.safeParse({
    content,
    fileName,
    fileType,
    fileSize,
    matterId,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  try {
    // Step 1: Create document record with "processing" status
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        matter_id: matterId ?? null,
        name: fileName,
        file_type: fileType,
        file_size: fileSize,
        chunk_count: 0,
        status: "processing",
      })
      .select()
      .single();

    if (docError) {
      // If documents table doesn't exist, fall back to chunks-only approach
      // 42P01 = undefined_table, PGRST116 = table not found via PostgREST
      if (docError.code === "42P01" || docError.code === "PGRST116" || docError.message?.includes("does not exist")) {
        console.log("Documents table not found, falling back to chunks-only approach");
        return ingestDocumentChunksOnly(
          content,
          fileName,
          fileType,
          fileSize,
          matterId,
          user.id
        );
      }
      console.error("Document insert error:", docError);
      throw docError;
    }

    const documentId = doc.id;

    // Step 2: Classify document type (if Isaacus available)
    let classification: DocumentTypeResult | undefined;
    if (isIsaacusConfigured()) {
      try {
        classification = await classifyDocumentType(content.slice(0, 3000));
      } catch (classifyError) {
        console.error("Document classification failed:", classifyError);
      }
    }

    // Step 3: Chunk the document
    // Use legal-aware chunking for better section handling
    const isLegalDoc = fileName.toLowerCase().includes("agreement") ||
      fileName.toLowerCase().includes("contract") ||
      fileName.toLowerCase().includes("policy") ||
      classification?.type !== "other";

    const chunks = isLegalDoc
      ? chunkLegalDocument(content, {
          chunkSize: 1500,
          overlap: 200,
          respectSections: true,
        })
      : chunkDocument(content, {
          chunkSize: 1500,
          overlap: 200,
        });

    if (chunks.length === 0) {
      await supabase.from("documents").update({ status: "error" }).eq("id", documentId);
      return { success: false, error: "Document produced no chunks" };
    }

    // Step 4: Generate embeddings with Isaacus
    let embeddings: number[][] = [];
    let embeddingsGenerated = false;

    if (isIsaacusConfigured()) {
      try {
        const chunkTexts = chunks.map((c) => c.content);
        embeddings = await embedDocuments(chunkTexts);
        embeddingsGenerated = true;
      } catch (embedError) {
        console.error("Embedding generation failed:", embedError);
        // Continue without embeddings - RAG will fall back to text search
      }
    }

    // Step 5: Store chunks with embeddings
    const chunkInserts = chunks.map((chunk, index) => ({
      user_id: user.id,
      document_id: documentId,
      matter_id: matterId ?? null,
      document_name: fileName,
      chunk_index: chunk.index,
      content: chunk.content,
      embedding: embeddings[index] ?? null,
      metadata: {
        ...chunk.metadata,
        documentType: classification?.type,
        jurisdiction: classification?.jurisdiction,
        practiceArea: classification?.practiceArea,
        startChar: chunk.startChar,
        endChar: chunk.endChar,
      },
    }));

    const { error: chunksError } = await supabase
      .from("document_chunks")
      .insert(chunkInserts);

    if (chunksError) {
      await supabase.from("documents").update({ status: "error" }).eq("id", documentId);
      throw chunksError;
    }

    // Step 6: Update document record with classification and status
    await supabase
      .from("documents")
      .update({
        chunk_count: chunks.length,
        status: "ready",
        document_type: classification?.type ?? null,
        jurisdiction: classification?.jurisdiction ?? null,
        practice_area: classification?.practiceArea ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    revalidatePath("/counsel");
    revalidatePath("/documents");

    return {
      success: true,
      data: {
        documentId,
        documentName: fileName,
        chunksCreated: chunks.length,
        embeddingsGenerated,
        classification,
      },
    };
  } catch (error) {
    console.error("Document ingestion error:", error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : "Failed to ingest document";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Fallback: Ingest without documents table (just chunks)
 * Used when documents table doesn't exist yet
 */
async function ingestDocumentChunksOnly(
  content: string,
  fileName: string,
  fileType: string,
  fileSize: number,
  matterId: string | undefined,
  userId: string
): Promise<ActionResponse<IngestResult>> {
  const supabase = await createClient();

  try {
    // Classify document
    let classification: DocumentTypeResult | undefined;
    if (isIsaacusConfigured()) {
      try {
        classification = await classifyDocumentType(content.slice(0, 3000));
      } catch {
        // Continue without classification
      }
    }

    // Chunk the document
    const chunks = chunkLegalDocument(content, {
      chunkSize: 1500,
      overlap: 200,
    });

    if (chunks.length === 0) {
      return { success: false, error: "Document produced no chunks" };
    }

    // Generate embeddings
    let embeddings: number[][] = [];
    let embeddingsGenerated = false;

    if (isIsaacusConfigured()) {
      try {
        embeddings = await embedDocuments(chunks.map((c) => c.content));
        embeddingsGenerated = true;
      } catch {
        // Continue without embeddings
      }
    }

    // Store chunks
    const documentId = crypto.randomUUID();
    const chunkInserts = chunks.map((chunk, index) => ({
      user_id: userId,
      matter_id: matterId ?? null,
      document_name: fileName,
      chunk_index: chunk.index,
      content: chunk.content,
      embedding: embeddings[index] ?? null,
      metadata: {
        documentId,
        documentType: classification?.type,
        jurisdiction: classification?.jurisdiction,
        practiceArea: classification?.practiceArea,
        fileType,
        fileSize,
        ...chunk.metadata,
      },
    }));

    const { error: chunksError } = await supabase
      .from("document_chunks")
      .insert(chunkInserts);

    if (chunksError) {
      console.error("Chunk insert error:", chunksError);
      throw chunksError;
    }

    revalidatePath("/counsel");
    revalidatePath("/documents");

    return {
      success: true,
      data: {
        documentId,
        documentName: fileName,
        chunksCreated: chunks.length,
        embeddingsGenerated,
        classification,
      },
    };
  } catch (error) {
    console.error("Chunk-only ingestion error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to ingest document",
    };
  }
}

// ============================================================================
// DOCUMENT MANAGEMENT
// ============================================================================

/**
 * List user's documents
 */
export async function listDocuments(
  matterId?: string
): Promise<ActionResponse<Document[]>> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  try {
    let query = supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (matterId) {
      query = query.eq("matter_id", matterId);
    }

    const { data, error } = await query;

    if (error) {
      // If table doesn't exist, return empty list
      if (error.code === "42P01") {
        return { success: true, data: [] };
      }
      throw error;
    }

    return { success: true, data: data as Document[] };
  } catch (error) {
    console.error("List documents error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list documents",
    };
  }
}

/**
 * List documents by querying unique document names from chunks
 * Fallback when documents table doesn't exist
 */
export async function listDocumentsByChunks(
  matterId?: string
): Promise<ActionResponse<Array<{ name: string; chunkCount: number }>>> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  try {
    let query = supabase
      .from("document_chunks")
      .select("document_name")
      .eq("user_id", user.id);

    if (matterId) {
      query = query.eq("matter_id", matterId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Count chunks per document
    const docCounts = new Map<string, number>();
    for (const row of data ?? []) {
      const name = row.document_name;
      docCounts.set(name, (docCounts.get(name) ?? 0) + 1);
    }

    const documents = Array.from(docCounts.entries()).map(([name, chunkCount]) => ({
      name,
      chunkCount,
    }));

    return { success: true, data: documents };
  } catch (error) {
    console.error("List documents by chunks error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list documents",
    };
  }
}

/**
 * Delete a document and its chunks
 */
export async function deleteDocument(
  documentId: string
): Promise<ActionResponse> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  try {
    // Delete from documents table (chunks will cascade)
    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", documentId)
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    revalidatePath("/counsel");
    revalidatePath("/documents");
    revalidatePath("/matters");

    return { success: true };
  } catch (error) {
    console.error("Delete document error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete document",
    };
  }
}

/**
 * List documents for a specific matter
 * Used in matter detail pages
 */
export async function listDocumentsForMatter(
  matterId: string
): Promise<ActionResponse<Document[]>> {
  return listDocuments(matterId);
}

/**
 * Delete document chunks by name (fallback when no documents table)
 */
export async function deleteDocumentByName(
  documentName: string
): Promise<ActionResponse> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("document_chunks")
      .delete()
      .eq("document_name", documentName)
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    revalidatePath("/counsel");

    return { success: true };
  } catch (error) {
    console.error("Delete document by name error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete document",
    };
  }
}

/**
 * Get document details with chunk previews
 */
export async function getDocument(
  documentId: string
): Promise<ActionResponse<DocumentWithChunks>> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  try {
    // Get document
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (docError) {
      throw docError;
    }

    // Get chunks
    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("id, chunk_index, content, metadata")
      .eq("document_id", documentId)
      .order("chunk_index", { ascending: true });

    if (chunksError) {
      throw chunksError;
    }

    return {
      success: true,
      data: {
        ...(doc as Document),
        chunks: chunks ?? [],
      },
    };
  } catch (error) {
    console.error("Get document error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get document",
    };
  }
}

/**
 * Re-embed a document (regenerate embeddings)
 * Useful if Isaacus was added after initial upload
 */
export async function reembedDocument(
  documentId: string
): Promise<ActionResponse<{ chunksUpdated: number }>> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!isIsaacusConfigured()) {
    return { success: false, error: "Isaacus API not configured" };
  }

  const supabase = await createClient();

  try {
    // Get chunks for this document
    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("id, content")
      .eq("document_id", documentId)
      .order("chunk_index", { ascending: true });

    if (chunksError) {
      throw chunksError;
    }

    if (!chunks || chunks.length === 0) {
      return { success: false, error: "No chunks found for document" };
    }

    // Generate new embeddings
    const contents = chunks.map((c) => c.content);
    const embeddings = await embedDocuments(contents);

    // Update each chunk with new embedding
    for (let i = 0; i < chunks.length; i++) {
      await supabase
        .from("document_chunks")
        .update({ embedding: embeddings[i] })
        .eq("id", chunks[i].id);
    }

    return {
      success: true,
      data: { chunksUpdated: chunks.length },
    };
  } catch (error) {
    console.error("Re-embed document error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to re-embed document",
    };
  }
}

/**
 * Check document processing status
 */
export async function getDocumentStatus(
  documentId: string
): Promise<ActionResponse<{ status: string; chunkCount: number }>> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("documents")
      .select("status, chunk_count")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      data: {
        status: data.status,
        chunkCount: data.chunk_count,
      },
    };
  } catch (error) {
    console.error("Get document status error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get status",
    };
  }
}

// ============================================================================
// LEGACY COMPATIBILITY - For existing document-manager component
// ============================================================================

/**
 * Document record type for UI (legacy compatibility)
 */
export interface DocumentRecord {
  document_name: string;
  chunk_count: number;
  total_characters: number;
  document_type: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

/**
 * List documents grouped by name (for UI compatibility)
 */
export async function listDocumentsGrouped(
  matterId?: string
): Promise<ActionResponse<DocumentRecord[]>> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  try {
    let query = supabase
      .from("document_chunks")
      .select("document_name, content, metadata, created_at")
      .eq("user_id", user.id);

    if (matterId) {
      query = query.eq("matter_id", matterId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Group by document name
    const grouped = new Map<string, DocumentRecord>();

    for (const chunk of data ?? []) {
      const existing = grouped.get(chunk.document_name);
      if (existing) {
        existing.chunk_count++;
        existing.total_characters += chunk.content?.length ?? 0;
      } else {
        grouped.set(chunk.document_name, {
          document_name: chunk.document_name,
          chunk_count: 1,
          total_characters: chunk.content?.length ?? 0,
          document_type: (chunk.metadata as Record<string, unknown>)?.documentType as string ?? null,
          created_at: chunk.created_at,
          metadata: chunk.metadata as Record<string, unknown> ?? {},
        });
      }
    }

    return {
      success: true,
      data: Array.from(grouped.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    };
  } catch (error) {
    console.error("List documents grouped error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list documents",
    };
  }
}

/**
 * Get document statistics
 */
export async function getDocumentStats(
  matterId?: string
): Promise<ActionResponse<{
  totalDocuments: number;
  totalChunks: number;
  chunksWithEmbeddings: number;
}>> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  try {
    let query = supabase
      .from("document_chunks")
      .select("document_name, embedding")
      .eq("user_id", user.id);

    if (matterId) {
      query = query.eq("matter_id", matterId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const chunks = data ?? [];
    const uniqueDocs = new Set(chunks.map((c) => c.document_name));

    return {
      success: true,
      data: {
        totalDocuments: uniqueDocs.size,
        totalChunks: chunks.length,
        chunksWithEmbeddings: chunks.filter((c) => c.embedding !== null).length,
      },
    };
  } catch (error) {
    console.error("Get document stats error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get stats",
    };
  }
}

/**
 * Regenerate embeddings for a document by name
 */
export async function regenerateEmbeddings(
  documentName: string,
  matterId?: string
): Promise<ActionResponse<{ chunksUpdated: number }>> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!isIsaacusConfigured()) {
    return { success: false, error: "Isaacus API not configured" };
  }

  const supabase = await createClient();

  try {
    // Get chunks for this document
    let query = supabase
      .from("document_chunks")
      .select("id, content")
      .eq("user_id", user.id)
      .eq("document_name", documentName)
      .order("chunk_index", { ascending: true });

    if (matterId) {
      query = query.eq("matter_id", matterId);
    }

    const { data: chunks, error: chunksError } = await query;

    if (chunksError) {
      throw chunksError;
    }

    if (!chunks || chunks.length === 0) {
      return { success: false, error: "No chunks found for document" };
    }

    // Generate new embeddings
    const contents = chunks.map((c) => c.content);
    const embeddings = await embedDocuments(contents);

    // Update each chunk with new embedding
    for (let i = 0; i < chunks.length; i++) {
      await supabase
        .from("document_chunks")
        .update({ embedding: embeddings[i] })
        .eq("id", chunks[i].id);
    }

    return {
      success: true,
      data: { chunksUpdated: chunks.length },
    };
  } catch (error) {
    console.error("Regenerate embeddings error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to regenerate embeddings",
    };
  }
}
