"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Standard response type
type ActionResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create a document record after upload
 */
export async function createDocument(
  matterId: string,
  name: string,
  fileType: string,
  storagePath: string,
  fileSize: number
): Promise<ActionResponse<{ id: string }>> {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  // Check user has access to this matter
  const { data: membership } = await supabase
    .from("matter_members")
    .select("role")
    .eq("matter_id", matterId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["owner", "editor"].includes(membership.role)) {
    return { success: false, error: "You do not have permission to upload documents" };
  }

  // Create document record
  const { data: document, error } = await supabase
    .from("documents")
    .insert({
      matter_id: matterId,
      uploaded_by: user.id,
      name,
      file_type: fileType,
      storage_path: storagePath,
      file_size: fileSize,
      processing_status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/matters/${matterId}`);
  revalidatePath(`/matters/${matterId}/documents`);
  return { success: true, data: { id: document.id } };
}

/**
 * Get documents for a matter
 */
export async function getDocuments(matterId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Get documents with matter membership check
  const { data: documents } = await supabase
    .from("documents")
    .select(
      `
      id,
      name,
      file_type,
      file_size,
      processing_status,
      is_restricted,
      created_at,
      uploaded_by,
      uploader:users!documents_uploaded_by_fkey(full_name, email)
    `
    )
    .eq("matter_id", matterId)
    .order("created_at", { ascending: false });

  return documents || [];
}

/**
 * Delete a document
 */
export async function deleteDocument(
  documentId: string,
  matterId: string
): Promise<ActionResponse> {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  // Get document to check ownership and get storage path
  const { data: document } = await supabase
    .from("documents")
    .select("storage_path, uploaded_by, matter_id")
    .eq("id", documentId)
    .single();

  if (!document) {
    return { success: false, error: "Document not found" };
  }

  // Check user has access (uploader or matter owner)
  const { data: membership } = await supabase
    .from("matter_members")
    .select("role")
    .eq("matter_id", document.matter_id)
    .eq("user_id", user.id)
    .single();

  const canDelete =
    document.uploaded_by === user.id || membership?.role === "owner";

  if (!canDelete) {
    return { success: false, error: "You do not have permission to delete this document" };
  }

  // Delete from storage
  await supabase.storage.from("documents").remove([document.storage_path]);

  // Delete document record (cascades to chunks)
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/matters/${matterId}`);
  revalidatePath(`/matters/${matterId}/documents`);
  return { success: true, data: undefined };
}

/**
 * Get a signed URL for document download
 */
export async function getDocumentUrl(
  documentId: string
): Promise<ActionResponse<{ url: string }>> {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  // Get document
  const { data: document } = await supabase
    .from("documents")
    .select("storage_path, matter_id, is_restricted")
    .eq("id", documentId)
    .single();

  if (!document) {
    return { success: false, error: "Document not found" };
  }

  // Check user has access to this matter
  const { data: membership } = await supabase
    .from("matter_members")
    .select("role")
    .eq("matter_id", document.matter_id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return { success: false, error: "Access denied" };
  }

  // For restricted documents, check document_access table
  if (document.is_restricted) {
    const { data: access } = await supabase
      .from("document_access")
      .select("permission")
      .eq("document_id", documentId)
      .eq("user_id", user.id)
      .single();

    if (!access) {
      return { success: false, error: "Access denied to restricted document" };
    }
  }

  // Generate signed URL (valid for 1 hour)
  const { data: signedUrl, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(document.storage_path, 3600);

  if (error || !signedUrl) {
    return { success: false, error: "Failed to generate download URL" };
  }

  return { success: true, data: { url: signedUrl.signedUrl } };
}
