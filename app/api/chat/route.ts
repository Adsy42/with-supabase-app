/**
 * Chat API Route
 * Streaming chat with RAG context using Vercel AI SDK v5
 */

import { streamText, convertToModelMessages } from "ai";
import type { UIMessage } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getModel, type ModelMode } from "@/lib/ai/router";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { searchDocuments } from "@/lib/rag/search";
import { saveMessage } from "@/actions/conversations";

export const maxDuration = 60; // Allow longer responses for legal content

export async function POST(req: Request) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body = await req.json();
    const {
      messages,
      conversationId,
      matterId,
      modelPreference,
      mode = "auto_optimize",
    } = body as {
      messages: UIMessage[];
      conversationId?: string;
      matterId?: string;
      modelPreference?: string;
      mode?: ModelMode;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get the latest user message for RAG context
    const latestUserMessage = messages.filter((m) => m.role === "user").pop();
    const userQuery =
      latestUserMessage?.parts
        ?.filter((part): part is { type: "text"; text: string } => part.type === "text")
        .map((part) => part.text)
        .join(" ") ?? "";

    // Build RAG context if user has documents
    let ragContext: { documents: string } | undefined;

    if (userQuery) {
      const searchContext = await searchDocuments(
        userQuery,
        user.id,
        matterId,
        {
          topK: 20,
          threshold: 0.5,
          rerankTopK: 5,
        }
      );

      if (searchContext.documents) {
        ragContext = { documents: searchContext.documents };
      }
    }

    // Select model based on preference and mode
    const validMode: ModelMode = mode === "user_choice" ? "user_choice" : "auto_optimize";
    const model = getModel(modelPreference ?? null, validMode, userQuery);

    // Build system prompt with RAG context
    const systemPrompt = buildSystemPrompt(ragContext);

    // Convert UI messages to model messages
    const modelMessages = convertToModelMessages(messages);

    // Stream the response
    const result = streamText({
      model,
      system: systemPrompt,
      messages: modelMessages,
      onFinish: async ({ text, usage }) => {
        // Save assistant message to database
        if (conversationId && text) {
          try {
            // Type assertion for usage since AI SDK types may vary
            const usageData = usage as { promptTokens?: number; completionTokens?: number } | undefined;
            await saveMessage(conversationId, "assistant", text, {
              modelUsed: modelPreference ?? "auto",
              promptTokens: usageData?.promptTokens,
              completionTokens: usageData?.completionTokens,
              citations: ragContext ? [{ type: "rag", documentCount: ragContext.documents.split("---").length }] : [],
            });
          } catch (saveError) {
            console.error("Error saving assistant message:", saveError);
            // Don't throw - response already streamed to user
          }
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);

    // Return user-friendly error message
    const message = error instanceof Error ? error.message : "Something went wrong";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

