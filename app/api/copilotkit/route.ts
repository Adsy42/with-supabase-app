/**
 * CopilotKit Runtime API Route
 *
 * Connects CopilotKit frontend to the Deep Agent using LangChain integration.
 */

import { CopilotRuntime, copilotRuntimeNextJSAppRouterEndpoint, LangChainAdapter } from '@copilotkit/runtime';
import { createClient } from '@/lib/supabase/server';
import { createLegalDeepAgent } from '@/lib/agents/deep-agent';

export const maxDuration = 60;

const runtime = new CopilotRuntime();

export async function POST(request: Request) {
  try {
    // Check for API key first
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'ANTHROPIC_API_KEY is not configured. Please add it to your environment variables.',
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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request to get conversation ID if available
    let conversationId: string | undefined;
    try {
      const body = await request.clone().json();
      conversationId = body?.conversationId as string | undefined;
    } catch {
      // Request body might not be JSON, that's okay
    }

    // Create Deep Agent - this returns a LangGraph graph
    const deepAgent = createLegalDeepAgent(user.id, conversationId);

    // Use LangChain adapter to connect Deep Agent to CopilotKit
    const endpoint = copilotRuntimeNextJSAppRouterEndpoint({
      runtime,
      serviceAdapter: new LangChainAdapter({
        chainFn: async () => deepAgent,
      }),
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
