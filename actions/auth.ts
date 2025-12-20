"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Standard response type for all actions
type ActionResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Get the current authenticated user with their profile
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Get user profile with organization
  const { data: profile } = await supabase
    .from("users")
    .select(
      `
      *,
      organization:organizations(*)
    `
    )
    .eq("id", user.id)
    .single();

  return profile;
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<ActionResponse> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/auth/login");
}

/**
 * Update the current user's profile
 * Used directly as form action, returns void for compatibility
 */
export async function updateProfile(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return;
  }

  const fullName = formData.get("full_name") as string;

  await supabase
    .from("users")
    .update({ full_name: fullName })
    .eq("id", user.id);

  revalidatePath("/settings");
}

/**
 * Update the current user's organization
 * Used directly as form action, returns void for compatibility
 */
export async function updateOrganization(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return;
  }

  // Get user's org_id and check they're an owner/admin
  const { data: profile } = await supabase
    .from("users")
    .select("org_id, org_role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) {
    return;
  }

  if (!["owner", "admin"].includes(profile.org_role)) {
    return;
  }

  const orgName = formData.get("name") as string;

  await supabase
    .from("organizations")
    .update({ name: orgName })
    .eq("id", profile.org_id);

  revalidatePath("/settings");
}



