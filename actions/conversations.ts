"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create a new conversation
 */
export async function createConversation(
  matterId?: string,
  title?: string
): Promise<ActionResponse<{ id: string }>> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  // If matter specified, verify access
  if (matterId) {
    const { data: membership } = await supabase
      .from("matter_members")
      .select("role")
      .eq("matter_id", matterId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return { success: false, error: "No access to this matter" };
    }
  }

  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({
      user_id: user.id,
      matter_id: matterId || null,
      title: title || "New Conversation",
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  if (matterId) {
    revalidatePath(`/matters/${matterId}`);
  }
  revalidatePath("/counsel");

  return { success: true, data: { id: conversation.id } };
}

/**
 * Get conversations for current user
 */
export async function getConversations(matterId?: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  let query = supabase
    .from("conversations")
    .select("id, title, matter_id, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (matterId) {
    query = query.eq("matter_id", matterId);
  }

  const { data: conversations } = await query;
  return conversations || [];
}

/**
 * Get a single conversation with messages
 */
export async function getConversation(conversationId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select(
      `
      id,
      title,
      matter_id,
      created_at,
      updated_at,
      matter:matters(id, title)
    `
    )
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  return conversation;
}

/**
 * Get messages for a conversation
 */
export async function getMessages(conversationId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Verify conversation ownership
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!conversation) {
    return [];
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("id, role, content, model_used, citations, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return messages || [];
}

/**
 * Save a message to a conversation
 */
export async function saveMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  modelUsed?: string,
  promptTokens?: number,
  completionTokens?: number,
  citations?: unknown[]
): Promise<ActionResponse<{ id: string }>> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  // Verify conversation ownership
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!conversation) {
    return { success: false, error: "Conversation not found" };
  }

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role,
      content,
      model_used: modelUsed,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      citations: citations || [],
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Update conversation timestamp
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return { success: true, data: { id: message.id } };
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<ActionResponse> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("conversations")
    .update({ title })
    .eq("id", conversationId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/counsel");
  return { success: true, data: undefined };
}

/**
 * Delete a conversation
 */
export async function deleteConversation(
  conversationId: string
): Promise<ActionResponse> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/counsel");
  return { success: true, data: undefined };
}
