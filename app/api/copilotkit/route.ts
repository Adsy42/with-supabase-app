/**
 * CopilotKit Runtime API Route
 *
 * Connects CopilotKit frontend to the Deep Agent using Anthropic adapter.
 * For MVP, we use AnthropicAdapter with our tools, then enhance with full Deep Agent integration.
 */

import { CopilotRuntime, copilotRuntimeNextJSAppRouterEndpoint, AnthropicAdapter } from '@copilotkit/runtime';
import { createClient } from '@/lib/supabase/server';
import { legalAgentConfig, createLegalAgentTools } from '@/lib/agents/harness';

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

    // Get tools with user context
    const tools = createLegalAgentTools(user.id, conversationId);

    // Use Anthropic adapter
    // API key is read from ANTHROPIC_API_KEY env var
    // System prompt is set in the frontend CopilotKit component
    const endpoint = copilotRuntimeNextJSAppRouterEndpoint({
      runtime,
      serviceAdapter: new AnthropicAdapter({
        model: 'claude-sonnet-4-20250514',
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
