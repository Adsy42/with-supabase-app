import { NextRequest } from "next/server";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getModel, type ModelMode } from "@/lib/ai/router";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { searchDocuments } from "@/lib/rag/search";

export const maxDuration = 60; // 60 seconds max for streaming

/**
 * Chat API route using Vercel AI SDK v5
 * @see https://ai-sdk.dev/docs/ai-sdk-core/generating-text
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    messages,
    matterId,
    conversationId,
    modelPreference,
    mode = "auto_optimize",
  }: {
    messages: UIMessage[];
    matterId?: string;
    conversationId?: string;
    modelPreference?: string;
    mode?: string;
  } = await req.json();

  // Validate mode as ModelMode
  const validMode: ModelMode = mode === "user_choice" ? "user_choice" : "auto_optimize";

  // Get the last user message for RAG (extract text from parts)
  const lastUserMessage = messages.findLast((m) => m.role === "user");
  const userQuery = lastUserMessage?.parts
    ?.filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("") || "";

  // Build context from matter documents if available
  let context = null;
  if (matterId) {
    try {
      const searchContext = await searchDocuments(
        userQuery,
        matterId,
        user.id
      );
      context = {
        documents: searchContext.documents,
        matterTitle: searchContext.matterTitle,
      };
    } catch (error) {
      console.error("RAG search error:", error);
      // Continue without context
    }
  }

  // Get the appropriate model
  const model = getModel(modelPreference || null, validMode, userQuery);

  // Build system prompt with context
  const systemPrompt = buildSystemPrompt(context);

  // Convert UIMessages to model messages (AI SDK v5)
  const modelMessages = convertToModelMessages(messages);

  // Stream the response using AI SDK v5
  const result = streamText({
    model,
    system: systemPrompt,
    messages: modelMessages,
    // Include metadata for saving
    async onFinish({ text, usage }) {
      // Save the assistant message to the database
      if (conversationId) {
        try {
          await supabase.from("messages").insert({
            conversation_id: conversationId,
            role: "assistant",
            content: text,
            model_used: modelPreference || "auto",
            // AI SDK v5 uses inputTokens/outputTokens
            prompt_tokens: usage?.inputTokens,
            completion_tokens: usage?.outputTokens,
          });

          // Update conversation timestamp
          await supabase
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId);
        } catch (error) {
          console.error("Failed to save message:", error);
        }
      }
    },
  });

  // Return UI message stream response (AI SDK v5)
  return result.toUIMessageStreamResponse();
}
