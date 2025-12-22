/**
 * CopilotKit Runtime API Route
 *
 * Connects CopilotKit frontend to the Deep Agent for legal AI assistance.
 * Uses the CoAgent pattern to run the full Deep Agent architecture:
 * - Planning (write_todos)
 * - File system tools for context management
 * - Subagent spawning for specialized tasks
 * - Legal tools (search, rerank, classify, risk)
 * - Persistent memory across conversations
 *
 * @see https://docs.langchain.com/oss/javascript/deepagents/overview
 */

import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import { createClient } from '@/lib/supabase/server';
import { LegalCoAgent } from '@/lib/agents/coagent';
import { extractConversationId, extractMatterId } from '@/lib/agents/adapter';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    // Check for required API keys
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({
          error:
            'ANTHROPIC_API_KEY is not configured. Please add it to your environment variables.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const isaacusKey = process.env.ISAACUS_API_KEY;
    if (!isaacusKey) {
      return new Response(
        JSON.stringify({
          error: 'ISAACUS_API_KEY is not configured. Get your key at https://isaacus.com',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request to extract properties
    let properties: Record<string, unknown> | undefined;
    try {
      const body = await request.clone().json();
      properties = body?.properties as Record<string, unknown> | undefined;
    } catch {
      // Request body might not be JSON, that's okay
    }

    // Extract conversation and matter IDs from properties
    const conversationId = extractConversationId(properties);
    const matterId = extractMatterId(properties);

    // Create or get conversation if not provided
    let activeConversationId = conversationId;
    if (!activeConversationId) {
      // Create a new conversation for this chat session
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: 'New Conversation',
          matter_id: matterId,
        })
        .select('id')
        .single();

      if (convError) {
        console.error('Failed to create conversation:', convError);
        // Continue without conversation ID - planning tools will be disabled
      } else {
        activeConversationId = newConversation.id;
      }
    }

    // Create the Deep Agent as a CoAgent with user context
    const legalAgent = new LegalCoAgent({
      userId: user.id,
      conversationId: activeConversationId || undefined,
      matterId: matterId || undefined,
    });

    // Create the CopilotKit runtime with the agent
    const runtime = new CopilotRuntime({
      agents: {
        'orderly-legal-agent': legalAgent,
      },
    });

    // Create the endpoint handler
    const endpoint = copilotRuntimeNextJSAppRouterEndpoint({
      runtime,
      endpoint: '/api/copilotkit',
    });

    return endpoint.handleRequest(request);
  } catch (error) {
    console.error('CopilotKit API error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
