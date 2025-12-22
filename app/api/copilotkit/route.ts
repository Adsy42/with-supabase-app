/**
 * CopilotKit Runtime API Route
 *
 * Connects CopilotKit frontend to the Deep Agent harness.
 * Handles streaming responses and tool calls.
 */

import { streamText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createClient } from '@/lib/supabase/server';
import { legalAgentConfig, createLegalAgentTools } from '@/lib/agents/harness';

export const maxDuration = 60;

interface UIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

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

    // Parse request body
    const body = await request.json();
    const { messages, conversationId } = body as {
      messages: UIMessage[];
      conversationId?: string;
    };

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: messages required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Convert UI messages to simple format for AI SDK
    const formattedMessages = messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    // Create tools with user context
    const tools = createLegalAgentTools(user.id, conversationId);

    // Create Anthropic client
    const anthropic = createAnthropic({ apiKey });

    // Stream the response
    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: legalAgentConfig.systemPrompt,
      messages: formattedMessages,
      tools,
      onFinish: async ({ text, toolCalls, usage }) => {
        // Save the assistant message to the database if we have a conversation
        if (conversationId && text) {
          try {
            await supabase.from('messages').insert({
              conversation_id: conversationId,
              role: 'assistant',
              content: text,
              tool_calls: toolCalls ? JSON.stringify(toolCalls) : null,
              prompt_tokens: usage?.inputTokens,
              completion_tokens: usage?.outputTokens,
              model_used: 'claude-sonnet-4-20250514',
            });

            // Update conversation timestamp
            await supabase
              .from('conversations')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', conversationId);
          } catch {
            console.error('Failed to save message');
          }
        }
      },
    });

    return result.toTextStreamResponse();
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
