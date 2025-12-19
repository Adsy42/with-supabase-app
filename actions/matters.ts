"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Standard response type
type ActionResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// Validation schemas
const CreateMatterSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  client_name: z.string().max(200).optional(),
  matter_type: z
    .enum(["litigation", "transaction", "advisory", "other"])
    .optional(),
  description: z.string().max(2000).optional(),
  matter_number: z.string().max(50).optional(),
});

const UpdateMatterSchema = CreateMatterSchema.extend({
  status: z.enum(["active", "archived", "closed"]).optional(),
});

/**
 * Create a new matter
 */
export async function createMatter(
  formData: FormData
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

  // Get user's org
  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) {
    return { success: false, error: "No organisation found" };
  }

  // Validate input
  const parsed = CreateMatterSchema.safeParse({
    title: formData.get("title"),
    client_name: formData.get("client_name") || undefined,
    matter_type: formData.get("matter_type") || undefined,
    description: formData.get("description") || undefined,
    matter_number: formData.get("matter_number") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // Create matter
  const { data: matter, error } = await supabase
    .from("matters")
    .insert({
      ...parsed.data,
      org_id: profile.org_id,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Add creator as matter owner
  await supabase.from("matter_members").insert({
    matter_id: matter.id,
    user_id: user.id,
    role: "owner",
  });

  revalidatePath("/matters");
  redirect(`/matters/${matter.id}`);
}

/**
 * Update an existing matter
 */
export async function updateMatter(
  matterId: string,
  formData: FormData
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

  // Check user has edit access to this matter
  const { data: membership } = await supabase
    .from("matter_members")
    .select("role")
    .eq("matter_id", matterId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["owner", "editor"].includes(membership.role)) {
    return { success: false, error: "You do not have permission to edit this matter" };
  }

  // Validate input
  const parsed = UpdateMatterSchema.safeParse({
    title: formData.get("title"),
    client_name: formData.get("client_name") || undefined,
    matter_type: formData.get("matter_type") || undefined,
    description: formData.get("description") || undefined,
    matter_number: formData.get("matter_number") || undefined,
    status: formData.get("status") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // Update matter
  const { error } = await supabase
    .from("matters")
    .update(parsed.data)
    .eq("id", matterId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/matters/${matterId}`);
  revalidatePath("/matters");
  return { success: true, data: undefined };
}

/**
 * Delete a matter
 */
export async function deleteMatter(matterId: string): Promise<ActionResponse> {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  // Check user is owner of this matter
  const { data: membership } = await supabase
    .from("matter_members")
    .select("role")
    .eq("matter_id", matterId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "owner") {
    return { success: false, error: "Only the matter owner can delete this matter" };
  }

  // Delete matter (cascade will handle related records)
  const { error } = await supabase.from("matters").delete().eq("id", matterId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/matters");
  redirect("/matters");
}

/**
 * Get a single matter by ID
 */
export async function getMatter(matterId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: matter } = await supabase
    .from("matters")
    .select(
      `
      *,
      matter_members!inner(user_id, role),
      created_by_user:users!matters_created_by_fkey(full_name, email)
    `
    )
    .eq("id", matterId)
    .eq("matter_members.user_id", user.id)
    .single();

  return matter;
}

/**
 * Get all matters for the current user
 */
export async function getMatters() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: matters } = await supabase
    .from("matters")
    .select(
      `
      id,
      title,
      client_name,
      matter_type,
      status,
      created_at,
      matter_members!inner(user_id, role)
    `
    )
    .eq("matter_members.user_id", user.id)
    .order("created_at", { ascending: false });

  return matters || [];
}

