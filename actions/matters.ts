"use server";

/**
 * Matter Management Server Actions
 * CRUD operations for legal matters (cases/engagements)
 * Documents are organized within matters for scoped RAG search
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ============================================================================
// TYPES
// ============================================================================

export interface Matter {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  client_name: string | null;
  matter_number: string | null;
  status: "active" | "archived" | "closed";
  is_shared: boolean;
  document_count: number;
  created_at: string;
  updated_at: string;
}

export interface MatterWithStats extends Matter {
  stats: {
    documentCount: number;
    chunkCount: number;
    hasEmbeddings: boolean;
    lastDocumentAt: string | null;
  };
}

export interface MatterListItem {
  id: string;
  name: string;
  client_name: string | null;
  matter_number: string | null;
  status: "active" | "archived" | "closed";
  document_count: number;
  created_at: string;
  updated_at: string;
}

export interface ActionResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateMatterSchema = z.object({
  name: z.string().min(1, "Matter name is required").max(200),
  description: z.string().max(2000).optional(),
  clientName: z.string().max(200).optional(),
  matterNumber: z.string().max(100).optional(),
});

const UpdateMatterSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  clientName: z.string().max(200).optional().nullable(),
  matterNumber: z.string().max(100).optional().nullable(),
  status: z.enum(["active", "archived", "closed"]).optional(),
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
// CREATE MATTER
// ============================================================================

/**
 * Create a new matter
 */
export async function createMatter(
  name: string,
  description?: string,
  clientName?: string,
  matterNumber?: string
): Promise<ActionResponse<Matter>> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Validate input
  const parsed = CreateMatterSchema.safeParse({
    name,
    description,
    clientName,
    matterNumber,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("matters")
      .insert({
        user_id: user.id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        client_name: parsed.data.clientName || null,
        matter_number: parsed.data.matterNumber || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Create matter error:", error);
      throw error;
    }

    revalidatePath("/matters");
    revalidatePath("/counsel");

    return { success: true, data };
  } catch (error) {
    console.error("Failed to create matter:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create matter",
    };
  }
}

// ============================================================================
// LIST MATTERS
// ============================================================================

/**
 * List all matters for the current user
 */
export async function listMatters(
  status?: "active" | "archived" | "closed" | "all"
): Promise<ActionResponse<MatterListItem[]>> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  try {
    let query = supabase
      .from("matters")
      .select(
        "id, name, client_name, matter_number, status, document_count, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    // Filter by status unless "all" is specified
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("List matters error:", error);
      throw error;
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Failed to list matters:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list matters",
    };
  }
}

// ============================================================================
// GET MATTER
// ============================================================================

/**
 * Get a single matter with statistics
 */
export async function getMatter(
  matterId: string
): Promise<ActionResponse<MatterWithStats>> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  try {
    // Get matter
    const { data: matter, error: matterError } = await supabase
      .from("matters")
      .select("*")
      .eq("id", matterId)
      .eq("user_id", user.id)
      .single();

    if (matterError) {
      if (matterError.code === "PGRST116") {
        return { success: false, error: "Matter not found" };
      }
      throw matterError;
    }

    // Get stats using RPC function or manual query
    let stats = {
      documentCount: matter.document_count || 0,
      chunkCount: 0,
      hasEmbeddings: false,
      lastDocumentAt: null as string | null,
    };

    try {
      const { data: statsData } = await supabase.rpc("get_matter_stats", {
        p_matter_id: matterId,
      });

      if (statsData && statsData[0]) {
        stats = {
          documentCount: Number(statsData[0].document_count) || 0,
          chunkCount: Number(statsData[0].chunk_count) || 0,
          hasEmbeddings: Boolean(statsData[0].has_embeddings),
          lastDocumentAt: statsData[0].last_document_at || null,
        };
      }
    } catch {
      // Function may not exist yet, use fallback
      const { count } = await supabase
        .from("document_chunks")
        .select("*", { count: "exact", head: true })
        .eq("matter_id", matterId);

      stats.chunkCount = count || 0;
    }

    return {
      success: true,
      data: { ...matter, stats },
    };
  } catch (error) {
    console.error("Failed to get matter:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get matter",
    };
  }
}

// ============================================================================
// UPDATE MATTER
// ============================================================================

/**
 * Update a matter's details
 */
export async function updateMatter(
  matterId: string,
  updates: {
    name?: string;
    description?: string | null;
    clientName?: string | null;
    matterNumber?: string | null;
    status?: "active" | "archived" | "closed";
  }
): Promise<ActionResponse<Matter>> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Validate input
  const parsed = UpdateMatterSchema.safeParse(updates);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  try {
    // Build update object with snake_case keys
    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.description !== undefined)
      updateData.description = parsed.data.description;
    if (parsed.data.clientName !== undefined)
      updateData.client_name = parsed.data.clientName;
    if (parsed.data.matterNumber !== undefined)
      updateData.matter_number = parsed.data.matterNumber;
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;

    const { data, error } = await supabase
      .from("matters")
      .update(updateData)
      .eq("id", matterId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: false, error: "Matter not found" };
      }
      throw error;
    }

    revalidatePath("/matters");
    revalidatePath(`/matters/${matterId}`);

    return { success: true, data };
  } catch (error) {
    console.error("Failed to update matter:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update matter",
    };
  }
}

// ============================================================================
// ARCHIVE MATTER
// ============================================================================

/**
 * Archive a matter (soft delete)
 */
export async function archiveMatter(
  matterId: string
): Promise<ActionResponse<Matter>> {
  return updateMatter(matterId, { status: "archived" });
}

// ============================================================================
// DELETE MATTER
// ============================================================================

/**
 * Permanently delete a matter and all its documents
 */
export async function deleteMatter(
  matterId: string
): Promise<ActionResponse<void>> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("matters")
      .delete()
      .eq("id", matterId)
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    revalidatePath("/matters");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete matter:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete matter",
    };
  }
}

// ============================================================================
// LIST MATTERS FOR SELECTOR
// ============================================================================

/**
 * Get a simplified list of active matters for the chat selector
 * Returns only id, name, and client_name for efficiency
 */
export async function listMattersForSelector(): Promise<
  ActionResponse<Array<{ id: string; name: string; clientName: string | null }>>
> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("matters")
      .select("id, name, client_name")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) {
      // Table may not exist yet
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return { success: true, data: [] };
      }
      throw error;
    }

    return {
      success: true,
      data: (data || []).map((m) => ({
        id: m.id,
        name: m.name,
        clientName: m.client_name,
      })),
    };
  } catch (error) {
    console.error("Failed to list matters for selector:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to list matters",
    };
  }
}

