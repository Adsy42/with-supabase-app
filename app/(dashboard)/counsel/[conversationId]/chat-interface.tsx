"use client";

/**
 * Chat Interface Component
 * Client component that handles chat interactions using AI SDK v5
 */

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { AnimatePresence } from "framer-motion";
import {
  Conversation,
  ConversationContent,
  ConversationInput,
  Message,
  MessageContent,
  Response,
  PromptInput,
  TypingIndicator,
} from "@/components/ai";
import { saveMessage } from "@/actions/conversations";
import type { Message as DBMessage } from "@/actions/conversations";

// Helper type for message parts
interface TextPart {
  type: "text";
  text: string;
}

interface ChatInterfaceProps {
  conversationId: string;
  matterId?: string;
  initialMessages?: DBMessage[];
}

export function ChatInterface({
  conversationId,
  matterId,
  initialMessages = [],
}: ChatInterfaceProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Create transport with API endpoint and extra body params
  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          conversationId,
          matterId,
          mode: "auto_optimize",
        },
      }),
    [conversationId, matterId]
  );

  // Use AI SDK v5 useChat hook with transport
  const { messages: aiMessages, sendMessage, status, error } = useChat({
    transport,
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Combine initial messages from DB with AI SDK messages
  const allMessages = React.useMemo(() => {
    // Convert DB messages to UI format
    const dbMessages = initialMessages.map((msg) => ({
      id: msg.id,
      role: msg.role as "user" | "assistant",
      content: msg.content,
      createdAt: new Date(msg.created_at),
    }));

    // Convert AI SDK messages
    const newMessages = aiMessages.map((msg: UIMessage) => {
      // Extract text content from message parts
      const textContent = msg.parts
        ?.filter((part): part is TextPart => part.type === "text")
        .map((part) => part.text)
        .join("") ?? "";

      return {
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: textContent,
        createdAt: new Date(), // v5 doesn't have createdAt, use current time
      };
    });

    // Combine, removing duplicates by ID
    const messageMap = new Map<string, (typeof dbMessages)[0]>();
    for (const msg of dbMessages) {
      messageMap.set(msg.id, msg);
    }
    for (const msg of newMessages) {
      messageMap.set(msg.id, msg);
    }

    // Sort by creation time
    return Array.from(messageMap.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }, [initialMessages, aiMessages]);

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [allMessages.length, isLoading]);

  // Handle message submission
  const handleSubmit = React.useCallback(
    async (content: string) => {
      // Save user message to database
      try {
        await saveMessage(conversationId, "user", content);
      } catch (err) {
        console.error("Failed to save user message:", err);
      }

      // Send to AI using v5 format
      sendMessage({ text: content });
    },
    [conversationId, sendMessage]
  );

  return (
    <Conversation className="flex-1">
      <ConversationContent ref={scrollRef}>
        <AnimatePresence initial={false} mode="popLayout">
          {allMessages.length === 0 ? (
            <EmptyChat />
          ) : (
            allMessages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  <Response>{message.content}</Response>
                </MessageContent>
              </Message>
            ))
          )}

          {isLoading && <TypingIndicator />}
        </AnimatePresence>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
            Something went wrong. Please try again.
          </div>
        )}
      </ConversationContent>

      <ConversationInput>
        <PromptInput
          onSubmit={handleSubmit}
          isLoading={isLoading}
          placeholder="Ask a legal question..."
        />
      </ConversationInput>
    </Conversation>
  );
}

function EmptyChat() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
        <span className="text-2xl">⚖️</span>
      </div>
      <h2 className="text-lg font-semibold">How can I help you today?</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">
        I&apos;m Counsel, your AI legal assistant. Ask me about Australian law,
        contract analysis, legal research, or drafting assistance.
      </p>
    </div>
  );
}

