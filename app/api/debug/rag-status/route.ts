/**
 * RAG Status Debug Endpoint
 * Check the status of the document/embedding pipeline
 * 
 * GET /api/debug/rag-status
 */

import { createClient } from "@/lib/supabase/server";
import { isIsaacusConfigured } from "@/lib/isaacus/client";

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return Response.json({
        status: "error",
        message: "Not authenticated",
        checks: {
          authenticated: false,
        }
      }, { status: 401 });
    }

    // Check Isaacus configuration
    const isaacusConfigured = isIsaacusConfigured();
    const isaacusApiKey = process.env.ISAACUS_API_KEY;

    // Check for documents/chunks
    const { count: chunkCount, error: chunkError } = await supabase
      .from("document_chunks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Check for chunks with embeddings
    const { data: embeddingCheck, error: embeddingError } = await supabase
      .from("document_chunks")
      .select("id, embedding")
      .eq("user_id", user.id)
      .limit(5);

    const chunksWithEmbeddings = embeddingCheck?.filter(c => c.embedding !== null).length ?? 0;
    const chunksWithoutEmbeddings = embeddingCheck?.filter(c => c.embedding === null).length ?? 0;

    // Get unique document names
    const { data: docs } = await supabase
      .from("document_chunks")
      .select("document_name")
      .eq("user_id", user.id);
    
    const uniqueDocs = [...new Set(docs?.map(d => d.document_name) ?? [])];

    return Response.json({
      status: "ok",
      userId: user.id,
      checks: {
        authenticated: true,
        isaacusConfigured,
        isaacusApiKeyPresent: !!isaacusApiKey,
        isaacusApiKeyPreview: isaacusApiKey ? `${isaacusApiKey.slice(0, 8)}...` : null,
        
        documentsFound: uniqueDocs.length,
        documentNames: uniqueDocs,
        
        totalChunks: chunkCount ?? 0,
        chunksWithEmbeddings,
        chunksWithoutEmbeddings,
        chunkError: chunkError?.message,
        embeddingError: embeddingError?.message,
      },
      recommendations: generateRecommendations({
        isaacusConfigured,
        chunksExist: (chunkCount ?? 0) > 0,
        hasEmbeddings: chunksWithEmbeddings > 0,
      }),
    });
  } catch (error) {
    return Response.json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

function generateRecommendations(state: {
  isaacusConfigured: boolean;
  chunksExist: boolean;
  hasEmbeddings: boolean;
}): string[] {
  const recommendations: string[] = [];

  if (!state.isaacusConfigured) {
    recommendations.push(
      "❌ ISAACUS_API_KEY is not set. Add it to your .env.local file.",
      "   Get your API key from: https://platform.isaacus.com/"
    );
  }

  if (!state.chunksExist) {
    recommendations.push(
      "❌ No documents found. Upload documents via:",
      "   - POST /api/documents/upload",
      "   - Or use the Document Manager UI component"
    );
  } else if (!state.hasEmbeddings) {
    recommendations.push(
      "⚠️ Documents exist but have no embeddings.",
      "   This happens when ISAACUS_API_KEY wasn't set during upload.",
      "   Set the API key and regenerate embeddings for existing documents."
    );
  }

  if (state.isaacusConfigured && state.chunksExist && state.hasEmbeddings) {
    recommendations.push("✅ RAG pipeline is fully configured and ready!");
  }

  return recommendations;
}

