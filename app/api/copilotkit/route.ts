/**
 * CopilotKit Runtime API Route
 *
 * Connects CopilotKit frontend to the Deep Agent harness.
 * Handles streaming responses and tool calls.
 */

import { streamText, convertToModelMessages } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createClient } from '@/lib/supabase/server';
import { legalAgentConfig, createLegalAgentTools } from '@/lib/agents/harness';

export const maxDuration = 60;

interface UIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { messages, conversationId } = body as {
      messages: UIMessage[];
      conversationId?: string;
    };

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid request: messages required', { status: 400 });
    }

    // Convert UI messages to model format
    const modelMessages = convertToModelMessages(
      messages.map((m, i) => ({
        id: `msg-${i}`,
        role: m.role,
        content: m.content,
        parts: [{ type: 'text' as const, text: m.content }],
        createdAt: new Date(),
      }))
    );

    // Create tools with user context
    const tools = createLegalAgentTools(user.id, conversationId);

    // Stream the response
    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: legalAgentConfig.systemPrompt,
      messages: modelMessages,
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
      error instanceof Error ? error.message : 'Internal server error',
      { status: 500 }
    );
  }
}
