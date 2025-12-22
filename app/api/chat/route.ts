/**
 * Chat API Route
 * Streaming chat with full Isaacus integration:
 * - RAG with verified citations (Isaacus Reader)
 * - AI-powered mode detection (Isaacus Classifier)
 * - IQL clause analysis for contracts (Isaacus Universal Classifier)
 * Using Vercel AI SDK v5
 */

import { streamText, convertToModelMessages } from "ai";
import type { UIMessage } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getModel, type ModelMode } from "@/lib/ai/router";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { searchDocuments, type SearchContext } from "@/lib/rag/search";
import { saveMessage } from "@/actions/conversations";
import {
  type CounselMode,
  getModeConfig,
  detectSuggestedMode,
} from "@/lib/ai/modes";
import { classifyQueryIntent } from "@/lib/isaacus/document-classifier";
import {
  analyzeContractClauses,
  scanForHighRiskClauses,
  buildClauseAnalysisContext,
  type ContractAnalysisResult,
} from "@/lib/rag/clause-analyzer";
import { isIsaacusConfigured } from "@/lib/isaacus/client";

export const maxDuration = 60; // Allow longer responses for legal content

/**
 * Extended RAG context with citations and clause analysis
 */
interface EnhancedRAGContext {
  documents: string;
  citationsContext?: string;
  clauseAnalysisContext?: string;
  hasHighRiskClauses?: boolean;
}

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
      counselMode = "general",
      autoDetectMode = false,
      enableCitations = true,
      enableClauseAnalysis = true,
    } = body as {
      messages: UIMessage[];
      conversationId?: string;
      matterId?: string;
      modelPreference?: string;
      mode?: ModelMode;
      counselMode?: CounselMode;
      autoDetectMode?: boolean;
      enableCitations?: boolean;
      enableClauseAnalysis?: boolean;
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
        ?.filter(
          (part): part is { type: "text"; text: string } => part.type === "text"
        )
        .map((part) => part.text)
        .join(" ") ?? "";

    // Determine the counsel mode to use
    let activeCounselMode: CounselMode = counselMode;
    let modeConfidence = 1.0;
    let aiDetectedMode = false;

    // Auto-detect mode from query using AI classification
    if (autoDetectMode && counselMode === "general" && userQuery) {
      if (isIsaacusConfigured()) {
        // Use AI-powered classification
        try {
          const classification = await classifyQueryIntent(userQuery);
          if (classification.mode !== "general" && classification.confidence > 0.6) {
            activeCounselMode = classification.mode;
            modeConfidence = classification.confidence;
            aiDetectedMode = classification.aiClassified;
          }
        } catch (classifyError) {
          console.error("Mode classification error:", classifyError);
          // Fall back to keyword detection
          const suggestedMode = detectSuggestedMode(userQuery);
          if (suggestedMode !== "general") {
            activeCounselMode = suggestedMode;
          }
        }
      } else {
        // Fall back to keyword detection
        const suggestedMode = detectSuggestedMode(userQuery);
        if (suggestedMode !== "general") {
          activeCounselMode = suggestedMode;
        }
      }
    }

    // Get mode config for model tier recommendation
    const modeConfig = getModeConfig(activeCounselMode);

    // Build enhanced RAG context
    let ragContext: EnhancedRAGContext | undefined;
    let searchContext: SearchContext | undefined;
    let clauseAnalysis: ContractAnalysisResult | undefined;

    if (userQuery) {
      // Determine if we should extract citations based on mode
      const shouldExtractCitations =
        enableCitations &&
        isIsaacusConfigured() &&
        ["contract_analysis", "legal_research", "due_diligence"].includes(
          activeCounselMode
        );

      // Search documents with optional citations
      searchContext = await searchDocuments(userQuery, user.id, matterId, {
        topK: 20,
        threshold: 0.5,
        rerankTopK: 5,
        extractCitations: shouldExtractCitations,
        maxCitations: 5,
      });

      if (searchContext.documents) {
        ragContext = {
          documents: searchContext.documents,
          citationsContext: searchContext.citationsContext,
        };

        // Run clause analysis for contract-related modes
        const shouldAnalyzeClauses =
          enableClauseAnalysis &&
          isIsaacusConfigured() &&
          searchContext.results.length > 0 &&
          ["contract_analysis", "due_diligence"].includes(activeCounselMode);

        if (shouldAnalyzeClauses) {
          try {
            // Get document chunks for analysis
            const chunks = searchContext.results.map((r) => r.content);

            if (activeCounselMode === "contract_analysis") {
              // Full clause analysis for contract mode
              clauseAnalysis = await analyzeContractClauses(chunks, {
                threshold: 0.6,
                extractQuotes: true,
                classifyRisk: true,
                maxClauses: 15,
              });
            } else {
              // Quick high-risk scan for due diligence
              const highRiskClauses = await scanForHighRiskClauses(chunks, 0.7);
              clauseAnalysis = {
                clauses: highRiskClauses,
                highRiskClauses,
                summary: {
                  totalClauses: highRiskClauses.length,
                  highRiskCount: highRiskClauses.length,
                  mediumRiskCount: 0,
                  lowRiskCount: 0,
                  chunksAnalyzed: chunks.length,
                },
                fullAnalysis: false,
              };
            }

            // Add clause analysis context
            if (clauseAnalysis && clauseAnalysis.clauses.length > 0) {
              ragContext.clauseAnalysisContext =
                buildClauseAnalysisContext(clauseAnalysis);
              ragContext.hasHighRiskClauses =
                clauseAnalysis.highRiskClauses.length > 0;
            }
          } catch (analysisError) {
            console.error("Clause analysis error:", analysisError);
            // Continue without clause analysis
          }
        }
      }
    }

    // Select model based on preference and mode
    const validMode: ModelMode =
      mode === "user_choice" ? "user_choice" : "auto_optimize";
    const model = getModel(modelPreference ?? null, validMode, userQuery);

    // Build system prompt with enhanced context
    const systemPrompt = buildEnhancedSystemPrompt(
      activeCounselMode,
      ragContext
    );

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
            const usageData = usage as
              | { promptTokens?: number; completionTokens?: number }
              | undefined;

            // Build citation metadata
            const citationMeta = [];
            if (ragContext?.documents) {
              citationMeta.push({
                type: "rag",
                documentCount: ragContext.documents.split("---").length,
              });
            }
            if (searchContext?.citations?.length) {
              citationMeta.push({
                type: "verified",
                count: searchContext.citations.length,
                verified: searchContext.citationsVerified,
              });
            }
            if (clauseAnalysis?.clauses.length) {
              citationMeta.push({
                type: "clause_analysis",
                totalClauses: clauseAnalysis.summary.totalClauses,
                highRiskCount: clauseAnalysis.summary.highRiskCount,
              });
            }

            // Include mode info in citations metadata
            const enrichedCitations = [
              ...citationMeta,
              {
                type: "mode_info",
                mode: activeCounselMode,
                aiDetected: aiDetectedMode,
              },
            ];

            await saveMessage(conversationId, "assistant", text, {
              modelUsed: modelPreference ?? "auto",
              promptTokens: usageData?.promptTokens,
              completionTokens: usageData?.completionTokens,
              citations: enrichedCitations,
            });
          } catch (saveError) {
            console.error("Error saving assistant message:", saveError);
          }
        }
      },
    });

    // Return response with enhanced metadata in headers
    const response = result.toUIMessageStreamResponse();

    const headers = new Headers(response.headers);
    headers.set("X-Counsel-Mode", activeCounselMode);
    headers.set("X-Mode-Name", modeConfig.name);
    headers.set("X-Mode-Confidence", String(modeConfidence));
    headers.set("X-AI-Detected", String(aiDetectedMode));
    if (clauseAnalysis?.highRiskClauses.length) {
      headers.set(
        "X-High-Risk-Clauses",
        String(clauseAnalysis.highRiskClauses.length)
      );
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    console.error("Chat API error:", error);

    const message =
      error instanceof Error ? error.message : "Something went wrong";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Build enhanced system prompt with all context
 */
function buildEnhancedSystemPrompt(
  mode: CounselMode,
  context?: EnhancedRAGContext
): string {
  // Get base prompt for the mode
  const basePrompt = buildSystemPrompt(
    mode,
    context ? { documents: context.documents } : undefined
  );

  if (!context) {
    return basePrompt;
  }

  const additionalContext: string[] = [];

  // Add verified citations context
  if (context.citationsContext) {
    additionalContext.push(context.citationsContext);
  }

  // Add clause analysis context
  if (context.clauseAnalysisContext) {
    additionalContext.push(context.clauseAnalysisContext);

    // Add warning for high-risk clauses
    if (context.hasHighRiskClauses) {
      additionalContext.push(`
⚠️ **HIGH RISK CLAUSES DETECTED**
The clause analysis above has identified high-risk provisions. 
Pay special attention to these in your response and recommend careful review.`);
    }
  }

  if (additionalContext.length === 0) {
    return basePrompt;
  }

  return `${basePrompt}

---

## Enhanced Analysis Context

${additionalContext.join("\n\n---\n\n")}`;
}
