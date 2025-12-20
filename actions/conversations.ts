"use server";

/**
 * Conversation Server Actions
 * CRUD operations for conversations and messages with proper auth
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ============================================================================
// Types
// ============================================================================

export interface ActionResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  matter_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model_used: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  citations: unknown[];
  created_at: string;
}

// ============================================================================
// Validation Schemas
// ============================================================================

const CreateConversationSchema = z.object({
  matterId: z.string().uuid().optional(),
  title: z.string().min(1).max(255).default("New Conversation"),
});

const UpdateConversationSchema = z.object({
  conversationId: z.string().uuid(),
  title: z.string().min(1).max(255),
});

const SaveMessageSchema = z.object({
  conversationId: z.string().uuid(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
  modelUsed: z.string().optional(),
  promptTokens: z.number().int().positive().optional(),
  completionTokens: z.number().int().positive().optional(),
  citations: z.array(z.unknown()).optional(),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get authenticated user - always use getUser() not getSession()
 */
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
// Conversation Actions
// ============================================================================

/**
 * Create a new conversation
 */
export async function createConversation(
  matterId?: string,
  title?: string
): Promise<ActionResponse<{ id: string }>> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Validate input
  const parsed = CreateConversationSchema.safeParse({
    matterId,
    title: title ?? "New Conversation",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({
      user_id: user.id,
      matter_id: parsed.data.matterId ?? null,
      title: parsed.data.title,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Create conversation error:", error);
    return { success: false, error: "Failed to create conversation" };
  }

  revalidatePath("/counsel");

  return { success: true, data: { id: conversation.id } };
}

/**
 * Get all conversations for the current user
 */
export async function getConversations(
  matterId?: string
): Promise<ActionResponse<Conversation[]>> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  let query = supabase
    .from("conversations")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (matterId) {
    query = query.eq("matter_id", matterId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Get conversations error:", error);
    return { success: false, error: "Failed to fetch conversations" };
  }

  return { success: true, data: data as Conversation[] };
}

/**
 * Get a single conversation by ID
 */
export async function getConversation(
  conversationId: string
): Promise<ActionResponse<Conversation>> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", user.id) // Ensure user owns this conversation
    .single();

  if (error) {
    console.error("Get conversation error:", error);
    return { success: false, error: "Conversation not found" };
  }

  return { success: true, data: data as Conversation };
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<ActionResponse> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Validate input
  const parsed = UpdateConversationSchema.safeParse({ conversationId, title });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("conversations")
    .update({ title: parsed.data.title })
    .eq("id", parsed.data.conversationId)
    .eq("user_id", user.id); // Ensure user owns this conversation

  if (error) {
    console.error("Update conversation error:", error);
    return { success: false, error: "Failed to update conversation" };
  }

  revalidatePath("/counsel");
  revalidatePath(`/counsel/${conversationId}`);

  return { success: true };
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteConversation(
  conversationId: string
): Promise<ActionResponse> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  // RLS ensures user can only delete their own conversations
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Delete conversation error:", error);
    return { success: false, error: "Failed to delete conversation" };
  }

  revalidatePath("/counsel");

  return { success: true };
}

// ============================================================================
// Message Actions
// ============================================================================

/**
 * Get messages for a conversation
 */
export async function getMessages(
  conversationId: string
): Promise<ActionResponse<Message[]>> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  // First verify the user owns the conversation
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (convError || !conversation) {
    return { success: false, error: "Conversation not found" };
  }

  // Get messages
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Get messages error:", error);
    return { success: false, error: "Failed to fetch messages" };
  }

  return { success: true, data: data as Message[] };
}

/**
 * Save a message to a conversation
 */
export async function saveMessage(
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string,
  options?: {
    modelUsed?: string;
    promptTokens?: number;
    completionTokens?: number;
    citations?: unknown[];
  }
): Promise<ActionResponse<{ id: string }>> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Validate input
  const parsed = SaveMessageSchema.safeParse({
    conversationId,
    role,
    content,
    modelUsed: options?.modelUsed,
    promptTokens: options?.promptTokens,
    completionTokens: options?.completionTokens,
    citations: options?.citations,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  // Verify user owns the conversation
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (convError || !conversation) {
    return { success: false, error: "Conversation not found" };
  }

  // Save the message
  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role,
      content,
      model_used: options?.modelUsed ?? null,
      prompt_tokens: options?.promptTokens ?? null,
      completion_tokens: options?.completionTokens ?? null,
      citations: options?.citations ?? [],
    })
    .select("id")
    .single();

  if (error) {
    console.error("Save message error:", error);
    return { success: false, error: "Failed to save message" };
  }

  // Update conversation timestamp (triggers updated_at)
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return { success: true, data: { id: message.id } };
}

